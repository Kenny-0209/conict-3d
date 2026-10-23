import * as T from './vendor/three.module.js';
import {contains,planBounds} from './layout.js';
import {LAB_LOCATION,MAX_WEATHER_AGE,daylightAt,seoulMinutes,createWeatherClient,weatherKind} from './weather-data.js';

export function outdoorPoint(layout,bounds,random=Math.random){
 for(let attempt=0;attempt<80;attempt++){
  const x=bounds.minX-6+random()*(bounds.maxX-bounds.minX+12),z=bounds.minZ-6+random()*(bounds.maxZ-bounds.minZ+12);
  if(!layout.rooms.some(r=>contains(r.points,{x,z})))return {x,z};
 }
 return {x:bounds.minX-2-random()*3,z:bounds.minZ-2-random()*3};
}
export function createAtmosphere({scene,renderer,sun,hemisphere,ground,layout,onInvalidate=()=>{},random=Math.random}){
 const bounds=planBounds(layout),cx=(bounds.minX+bounds.maxX)/2,cz=(bounds.minZ+bounds.maxZ)/2;
 const root=new T.Group();root.name='Outdoor weather';scene.add(root);
 const interior=new T.Group();interior.name='Room lighting';root.add(interior);
 // A uniform indoor fill stays on at night without point-light pools on the walls.
 const indoorFill=new T.AmbientLight('#fffdf4',1.85);interior.add(indoorFill);
 const moon=new T.Mesh(new T.SphereGeometry(.34,16,10),new T.MeshBasicMaterial({color:'#e5edec',fog:false}));moon.position.set(bounds.minX-4,8,bounds.minZ-4);root.add(moon);
 const sunOrb=new T.Mesh(new T.SphereGeometry(.30,16,10),new T.MeshBasicMaterial({color:'#ffdd97',fog:false}));sunOrb.position.set(bounds.maxX+4,9,bounds.minZ-4);root.add(sunOrb);
 const starPositions=[];for(let i=0;i<60;i++)starPositions.push(cx+(random()-.5)*50,10+random()*8,cz-8-random()*24);
 const starGeo=new T.BufferGeometry();starGeo.setAttribute('position',new T.Float32BufferAttribute(starPositions,3));const stars=new T.Points(starGeo,new T.PointsMaterial({color:'#edf5ff',size:.06,transparent:true,opacity:.65,depthWrite:false,fog:false}));root.add(stars);
 const cloudGroup=new T.Group();cloudGroup.name='Clouds outside rooms';root.add(cloudGroup);
 const cloudMat=new T.MeshStandardMaterial({color:'#e1e6e5',roughness:1,transparent:true,opacity:.7,depthWrite:false});
 const cloudGeo=new T.SphereGeometry(1,10,7);
 for(let i=0;i<5;i++){const cloud=new T.Group();cloud.position.set(cx+(i-2)*4,4.8+(i%2)*.5,bounds.minZ-9-(i%2)*2);for(let j=0;j<3;j++){const puff=new T.Mesh(cloudGeo,cloudMat);puff.position.set((j-1)*.72,Math.sin(j)*.16,0);puff.scale.set(.90,.34,.55);cloud.add(puff)}cloudGroup.add(cloud)}
 const snowData=new Uint8Array(16*16*4);for(let y=0;y<16;y++)for(let x=0;x<16;x++){const i=(y*16+x)*4,a=Math.max(0,1-Math.hypot((x-7.5)/7.5,(y-7.5)/7.5));snowData.set([255,255,255,Math.round(a*255)],i)}
 const snowTexture=new T.DataTexture(snowData,16,16,T.RGBAFormat);snowTexture.needsUpdate=true;
 const rainGeo=new T.BufferGeometry(),snowGeo=new T.BufferGeometry(),rainArray=new Float32Array(240*6),snowArray=new Float32Array(200*3);
 rainGeo.setAttribute('position',new T.BufferAttribute(rainArray,3));snowGeo.setAttribute('position',new T.BufferAttribute(snowArray,3));
 const rain=new T.LineSegments(rainGeo,new T.LineBasicMaterial({color:'#b9d0df',transparent:true,opacity:.45,depthWrite:false})),snow=new T.Points(snowGeo,new T.PointsMaterial({map:snowTexture,size:.065,transparent:true,opacity:.83,depthWrite:false,color:'#ffffff'}));
 rain.frustumCulled=snow.frustumCulled=false;rain.visible=snow.visible=false;root.add(rain,snow);
 const drops=Array.from({length:240},()=>{const p=outdoorPoint(layout,bounds,random);return {...p,y:.4+random()*8,speed:.7+random()*.6,phase:random()*6.28}});
 let current={status:'unavailable',data:null},lastMinute='',displayDate=new Date(),particleChanged=true;
 const reduceMotion=!!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 const nightSky=new T.Color('#172938'),daySky=new T.Color('#e5ecdf'),overcastSky=new T.Color('#8495a0'),warmSky=new T.Color('#bd937a');
 function update(state=current,date=new Date(),force=false){
  current=state;displayDate=date;
  const solar=daylightAt(date,state.data),key=String(Math.floor(+date/60000))+'|'+state.status+'|'+(state.data?.timestamp||0)+'|'+(state.data?.kind||'');
  if(!force&&key===lastMinute)return solar;lastMinute=key;
  const cloud=(state.data?.cloud||0)/100,wet=['rain','snow','storm','fog'].includes(state.data?.kind),level=solar.level;
  const sky=nightSky.clone().lerp(daySky,level);if(level>.1&&level<.9)sky.lerp(warmSky,Math.sin(level*Math.PI)*.22);sky.lerp(overcastSky,(wet?.35:cloud*.22)*level);
  scene.background.copy(sky);if(scene.fog){scene.fog.color.copy(sky);scene.fog.near=state.data?.kind==='fog'?16:45;scene.fog.far=state.data?.kind==='fog'?48:100}
  ground.material.color.copy(sky).multiplyScalar(.91);hemisphere.color.set('#fffaf1');hemisphere.groundColor.set('#e8eee7');hemisphere.intensity=1.05;
  const angle=solar.progress*Math.PI;sun.position.set(cx+Math.cos(angle)*13,8+Math.sin(angle)*6,cz+8);sun.target.position.set(cx,0,cz);sun.target.updateMatrixWorld();sun.intensity=.30+level*.35*(1-cloud*.5);sun.color.set('#fffdf5');sun.castShadow=false;
  indoorFill.intensity=1.85;
  moon.visible=level<.35&&!wet;stars.visible=level<.25&&cloud<.55&&!wet;sunOrb.visible=level>.50&&cloud<.45&&!wet;
  cloudGroup.visible=cloud>.25||wet;cloudMat.color.set(level>.5?'#afbfc9':'#728b9e');cloudMat.opacity=.28+cloud*.28;
  rain.material.color.set(level>.5?'#46647b':'#b9d0df');rain.material.opacity=level>.5?.72:.5;
  rain.visible=['rain','storm'].includes(state.data?.kind);snow.visible=state.data?.kind==='snow';
  const rainCount=Math.min(240,Math.round(90+(state.data?.precipitation||0)*65));rainGeo.setDrawRange(0,rainCount*2);snowGeo.setDrawRange(0,200);
  particleChanged=true;onInvalidate({shadows:true});
  return solar;
 }
 function tick(dt){
  if((!rain.visible&&!snow.visible)||(reduceMotion&&!particleChanged))return false;
  if(reduceMotion)dt=0;particleChanged=false;
  const wind=current.data?.wind||0,a=(current.data?.windDirection||0)*Math.PI/180,dx=-Math.sin(a)*Math.min(wind,.9),dz=-Math.cos(a)*Math.min(wind,.9);
  for(let i=0;i<drops.length;i++){
   const p=drops[i];p.y-=dt*p.speed*(rain.visible?6:.8);p.x+=dt*dx*(rain.visible?.45:.17);p.z+=dt*dz*(rain.visible?.45:.17);
   if(p.y<.1||p.x<bounds.minX-6||p.x>bounds.maxX+6||p.z<bounds.minZ-6||p.z>bounds.maxZ+6||layout.rooms.some(r=>contains(r.points,p))){const q=outdoorPoint(layout,bounds,random);p.x=q.x;p.z=q.z;p.y=6+random()*2}
   if(rain.visible){const j=i*6;rainArray.set([p.x,p.y,p.z,p.x-dx*.03,p.y+.25,p.z-dz*.03],j)}
   if(snow.visible&&i<200){const j=i*3;snowArray.set([p.x,p.y,p.z],j)}
  }
  if(rain.visible)rainGeo.attributes.position.needsUpdate=true;if(snow.visible)snowGeo.attributes.position.needsUpdate=true;
  return true;
 }
 function dispose(){scene.remove(root);const geometries=new Set(),materials=new Set();root.traverse(n=>{if(n.geometry)geometries.add(n.geometry);if(n.material)materials.add(n.material)});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());snowTexture.dispose()}
 update(current,displayDate,true);
 return {update,tick,dispose,root,drops};
}

export function mountWeather(atmosphere){
 const strip=document.querySelector('#weather-strip'),clockNode=document.querySelector('#lab-clock'),summary=document.querySelector('#weather-summary'),details=document.querySelector('#weather-details');
 const formatter=new Intl.DateTimeFormat('ko-KR',{timeZone:LAB_LOCATION.timeZone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}),dateFormatter=new Intl.DateTimeFormat('ko-KR',{timeZone:LAB_LOCATION.timeZone,month:'long',day:'numeric',weekday:'short'});
 const q=new URLSearchParams(location.search),local=['localhost','127.0.0.1'].includes(location.hostname);
 let state={status:'loading',data:null},client,timer;
 const previewCodes={clear:0,cloudy:3,rain:63,snow:73,fog:45,storm:95};
 const preview=local&&Object.hasOwn(previewCodes,q.get('weather-preview'))?q.get('weather-preview'):null;
 function effectiveDate(){const date=new Date(),hour=Number(q.get('hour-preview'));if(preview&&q.has('hour-preview')&&Number.isFinite(hour)&&hour>=0&&hour<24){const minutes=seoulMinutes(date);date.setTime(+date+(hour*60-minutes)*60000)}return date}
 function paint(){
  if(state.data&&state.status!=='preview'&&Date.now()-state.data.timestamp>MAX_WEATHER_AGE)state={status:'unavailable',data:null};
  const date=effectiveDate(),solar=atmosphere.update(state,date);clockNode.textContent=formatter.format(date);clockNode.dateTime=date.toISOString();
  const dark=solar.level<.35;document.body.classList.toggle('atmosphere-dark',dark);strip.dataset.phase=solar.phase;strip.dataset.weather=state.data?.kind||'unknown';
  const text=state.data?(state.data.kind==='clear'&&dark?'☾':state.data.icon)+' '+state.data.label+' '+Math.round(state.data.temperature)+'°C':state.status==='loading'?'날씨 연결 중':'날씨 확인 불가';
  if(summary.textContent!==text)summary.textContent=text;
  const source=state.status==='preview'?'효과 미리보기 · 가상 날씨':state.status==='live'?'현재 예보모델':state.status==='cached'?'저장된 날씨 · 연결 재시도 중':'날씨 연결 대기';
  document.querySelector('#weather-date').textContent=dateFormatter.format(date)+' · 한국 시간 (UTC+9)';
  document.querySelector('#weather-source').textContent=source+(state.data?' · '+formatter.format(new Date(state.data.timestamp))+' 기준':'');
  document.querySelector('#weather-wind').textContent=state.data?'구름 '+Math.round(state.data.cloud)+'% · 바람 '+state.data.wind.toFixed(1)+'m/s · 강수 '+state.data.precipitation+'mm':'시간에 맞춘 조명만 적용 중입니다.';
  strip.classList.toggle('weather-stale',state.status!=='live');
 }
 document.querySelector('#weather-toggle').onclick=()=>{details.hidden=!details.hidden;document.querySelector('#weather-toggle').setAttribute('aria-expanded',String(!details.hidden))};
 document.querySelector('#weather-refresh').onclick=()=>{if(client)client.refresh()};
 const visibility=()=>{if(!document.hidden){paint();client?.refresh()}};document.addEventListener('visibilitychange',visibility);
 if(preview in previewCodes){const code=previewCodes[preview];state={status:'preview',data:{timestamp:Date.now(),temperature:preview==='snow'?-1:16,cloud:preview==='clear'?8:90,wind:2,windDirection:65,precipitation:preview==='rain'||preview==='storm'?2:0,rain:preview==='rain'?2:0,snowfall:preview==='snow'?1:0,days:[],code,...weatherKind(code)}};paint()}
 else{paint();client=createWeatherClient({onChange:next=>{state=next;paint()}})}
 timer=setInterval(paint,1000);
 return {close(){clearInterval(timer);client?.close();document.removeEventListener('visibilitychange',visibility)}};
}
