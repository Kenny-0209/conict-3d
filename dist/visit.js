import {createAtmosphere,mountWeather} from './weather-scene.js';
import {createProfiler} from './perf.js';
import {batchStaticRoom} from './static-batch.js';
import * as T from './vendor/three.module.js';
import {OrbitControls} from './vendor/OrbitControls.js';
import {room,kit} from './models.js';
import {members,seats,furniture} from './data.js';
import {loadLayout,contains,planBounds,openingPosition,footprints} from './layout.js';
import {seatView} from './camera.js';
import {createNavigation,localPoint} from './navigation.js';
import {createGuest} from './guest.js';
import {createDoors} from './doors.js';
import {createCeiling} from './ceiling.js';
import {createPCMotion,isWorking} from './pc-motion.js';
import {mountPCPanel} from './pc-panel.js';
import {walkingAction,movementDirection,turnYaw} from './movement.js';
import {analogMovementDirection} from './mobile-core.js';
import {compactUI,uiIcon,panelBlocks,showResponsivePanel,syncPanelHeading,mountVisitorMobileUI} from './mobile-ui.js';
import {official,albums,photos,records,galleryFallback,tourStops,pageLinks} from './content.js?v=orbit20261018';

const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const canvas=$('#world'),house=$('#house'),panel=$('#panel'),layout=loadLayout(),nav=createNavigation(layout);
let mobileUI=null,stickInput={forward:0,side:0},mobileWalkHintShown=false;
const people=members.map(m=>({...m})),positions=layout.objects.filter(o=>o.kind==='seat');
// Reuse editor seat assignments when available, without mistaking virtual avatars for LAN presence.
let savedAssignments;try{savedAssignments=JSON.parse(localStorage.getItem('conict-seat-members')||'null')}catch{}
const visitorSeats=seats.map(s=>({...s,...(people.some(m=>m.id===savedAssignments?.[s.id])?{member:savedAssignments[s.id]}:{})}));
const personFor=o=>people.find(p=>p.id===visitorSeats.find(s=>s.id===o.seatId)?.member)||people[0];
const object=id=>layout.objects.find(o=>o.id===id), stopObject=s=>object(s.object);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const V=(x,y,z)=>new T.Vector3(x,y,z), ease=t=>t*t*(3-2*t), reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let renderer,dirty=true,shadowDirty=true,lastWalkView=null,guestMoving=false,lastPCVisual='';
try{renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'low-power'});}catch{showFailure();throw new Error('WebGL unavailable')}
renderer.setPixelRatio(Math.min(devicePixelRatio,compactUI()?1:1.25));renderer.shadowMap.enabled=false;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.localClippingEnabled=true;renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
const scene=new T.Scene();scene.background=new T.Color('#e9eddf');scene.fog=new T.Fog('#e9eddf',45,100);
const camera=new T.PerspectiveCamera(42,1,.035,150),controls=new OrbitControls(camera,canvas);controls.enableDamping=true;controls.dampingFactor=.09;controls.maxPolarAngle=Math.PI*.49;controls.minDistance=3;controls.maxDistance=80;controls.enablePan=true;controls.addEventListener('change',()=>dirty=true);
const hemisphere=new T.HemisphereLight('#fff4db','#9caf98',2.3);scene.add(hemisphere);const sun=new T.DirectionalLight('#fff4dd',3);sun.position.set(-3,12,8);sun.castShadow=false;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-18;sun.shadow.camera.right=18;sun.shadow.camera.top=16;sun.shadow.camera.bottom=-16;sun.shadow.camera.far=45;sun.shadow.normalBias=.045;scene.add(sun);
const bounds=planBounds(layout),centre=V((bounds.minX+bounds.maxX)/2,0,(bounds.minZ+bounds.maxZ)/2),ground=new T.Mesh(new T.PlaneGeometry(170,170),new T.MeshStandardMaterial({color:'#e9eddf',roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=-.19;ground.receiveShadow=true;scene.add(ground);
const lab=room(kit('polygon'),visitorSeats,people,Object.fromEntries(visitorSeats.map(s=>[s.id,'online'])),{...layout,cutaway:false});batchStaticRoom(lab);scene.add(lab);lab.updateMatrixWorld(true);
const ceiling=createCeiling(layout);scene.add(ceiling.root);
const wallMeshes=[],collideWalls=[],interactives=new Map();
lab.traverse(n=>{if(n.userData.layoutKind==='wall')n.traverse(m=>{if(m.isMesh){wallMeshes.push(m);collideWalls.push(m);m.material=m.material.clone()}})});
for(const n of lab.children){const o=object(n.userData.layoutId);if(!o)continue;const item={node:n,o,person:o.kind==='seat'?personFor(o):null};interactives.set(o.id,item);if(n.userData.avatar)n.userData.avatar.traverse(child=>child.userData.personSeat=o.id)}
const pcMotion=createPCMotion({items:[...interactives.values()],nav});
const doors=createDoors({layout,root:lab,reduced,
 occupied:()=>[...(mode==='overview'?[]:[{...player,radius:nav.radius}]),...pcMotion.records.filter(r=>r.body.visible).map(r=>({...r.pos,radius:.18}))],
 onChange:r=>{dirty=shadowDirty=true;lastWalkView=null;syncDoorLabel(r);if(hovered?.door)$('#hover-label').textContent=doors.actionLabel(hovered.o.id);updateNearby()},
 onBlocked:r=>toast(r.object.name+' 주변에서 조금 물러난 뒤 닫아 주세요.')});
nav.setDynamicObstacle(doors.blocks);
for(const r of doors.records){interactives.set(r.id,{node:r.node,o:r.object,door:r});r.node.traverse(n=>{if(n.isMesh)collideWalls.push(n)})}
const guest=createGuest();scene.add(guest.root);guest.root.visible=false;
const spawn=nav.spawn();let player=spawn||{x:centre.x,z:centre.z},yaw=-Math.PI*.35,pitch=0,mode='overview',path=[],pendingInteraction=null,tourIndex=-1,fly=null,entry=null,returnState=null,near=null,wave=null,phase=0,disposed=false;
guest.root.position.set(player.x,0,player.z);let lastTime=performance.now(),toastTimer,hovered=null;
const faded=new Set();
function restoreOcclusion(){for(const node of faded)node.traverse(m=>{if(m.userData.cameraMaterial){const b=m.userData.cameraMaterial;Object.assign(m.material,{opacity:b.opacity,transparent:b.transparent,depthWrite:b.depthWrite})}});faded.clear()}
function softenOcclusion(target,desired){restoreOcclusion();const delta=desired.clone().sub(target),d=delta.length();raycaster.set(target,delta.normalize());for(const h of raycaster.intersectObject(lab,true)){if(h.distance>d||h.object.userData.personSeat)continue;let n=h.object;while(n&&n!==lab&&!n.userData.layoutKind)n=n.parent;if(!n||!(["object","opening"].includes(n.userData.layoutKind)))continue;faded.add(n)}for(const node of faded)node.traverse(m=>{if(!m.isMesh||m.userData.personSeat)return;if(!m.userData.cameraMaterial){m.material=m.material.clone();m.userData.cameraMaterial={opacity:m.material.opacity,transparent:m.material.transparent,depthWrite:m.material.depthWrite}}m.material.opacity=m.userData.cameraMaterial.opacity*.16;m.material.transparent=true;m.material.depthWrite=false})}
const raycaster=new T.Raycaster(),mouse=new T.Vector2(),floorPlane=new T.Plane(V(0,1,0),0),walkInputs=new Map(),canvasPointers=new Set();let drag=null;

function showFailure(){const loader=$('#loader');loader.innerHTML='<b>3D 공간을 열 수 없어요</b><small>브라우저의 그래픽 가속을 확인해 주세요.</small><a href="'+official+'/index.do">공식 연구실 홈페이지 ↗</a>'}
function toast(text){$('#toast').textContent=text;$('#toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').hidden=true,3600)}
// Visitor walls keep their full 3 m height in every camera mode and tour.
function setTourMenu(open){$('#tour-menu').hidden=!open;$('#tour-toggle').setAttribute('aria-expanded',String(open))}
function resize(){dirty=true;lastWalkView=null;const w=house.clientWidth,h=house.clientHeight;renderer.setPixelRatio(Math.min(devicePixelRatio,compactUI()?1:1.25));renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();if(mode==='overview'&&tourIndex<0)overview(false)}
function cameraTo(position,target,fov=50,duration=1100){controls.enabled=false;camera.clearViewOffset();if(compactUI()&&house.clientHeight>house.clientWidth&&mode==='overview'&&tourIndex>=0)camera.setViewOffset(house.clientWidth,house.clientHeight,0,house.clientHeight*.12,house.clientWidth,house.clientHeight);fly={from:camera.position.clone(),to:V(...position),look:controls.target.clone(),target:V(...target),fov:camera.fov,nextFov:fov,start:performance.now(),duration:reduced?150:duration};}
function overview(animate=true){
 const w=house.clientWidth,h=house.clientHeight,aspect=w/h,eff=aspect*(compactUI()?.96:.70),width=bounds.maxX-bounds.minX,depth=bounds.maxZ-bounds.minZ,dist=Math.max(17,width/(2*Math.tan(42*Math.PI/360)*eff)*1.12,depth*1.65)*1.15;
 const pos=centre.clone().add(V(.47,.78,.72).normalize().multiplyScalar(dist)),target=centre.clone();target.y=.35;
 if(animate){cameraTo(pos.toArray(),target.toArray(),42,950);fly.after=()=>{controls.enabled=true;overviewOffset()}}else{fly=null;controls.target.copy(target);camera.position.copy(pos);camera.fov=42;camera.lookAt(target);controls.enabled=true;overviewOffset()}
}
function overviewOffset(){const w=house.clientWidth,h=house.clientHeight,portrait=h>w;camera.setViewOffset(w,h,compactUI()?(portrait?0:-w*.12):-w*.14,compactUI()&&portrait?h*.08:0,w,h);camera.updateProjectionMatrix()}
function setMode(next){
 dirty=shadowDirty=true;lastWalkView=null;guestMoving=false;
 $('#hover-label').hidden=true;hovered=null;canvas.style.cursor=next==='overview'?'grab':'default';
 if(entry)return;if(!spawn&&next!=='overview'){toast('현재 배치에 걸을 공간이 없어요. 공간 편집에서 통로를 확인해 주세요.');return}
 panel.close();restoreOcclusion();path=[];pendingInteraction=null;fly=null;walkInputs.clear();stickInput={forward:0,side:0};mobileUI?.resetStick();tourIndex=-1;$('#tour-card').hidden=true;setTourMenu(false);mode=next;ceiling.setFirstPerson(mode==='first');house.classList.toggle('inside',mode==='first');house.classList.toggle('walking',mode!=='overview');house.classList.remove('touring');$('#walk-hud').hidden=mode==='overview';guest.root.visible=mode==='third';controls.enabled=mode==='overview';camera.clearViewOffset();camera.fov=mode==='overview'?42:64;camera.updateProjectionMatrix();
 $$('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===mode)));if(mode==='overview')overview();else{guest.pose(0);guest.gait(0,false);updateWalkCamera(true);canvas.focus();updateNearby()}
 if(compactUI()&&mode!=='overview'&&!mobileWalkHintShown){mobileWalkHintShown=true;toast('왼쪽 원을 밀어 이동 · 화면을 끌어 시점 조절')}
}
function updateWalkCamera(immediate=false){
 const view=[mode,player.x,player.z,yaw,pitch];
 if(!immediate&&lastWalkView&&view.every((v,i)=>v===lastWalkView[i]))return false;
 lastWalkView=view;dirty=true;
 const eye=V(player.x,1.62,player.z),dir=V(Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch));
 if(mode==='first'){restoreOcclusion();camera.position.copy(eye);camera.lookAt(eye.clone().add(dir));controls.target.copy(eye.clone().add(dir));return true}
 const target=V(player.x,1.1,player.z),desired=V(player.x-Math.sin(yaw)*2.4,2.15+pitch*.8,player.z-Math.cos(yaw)*2.4),delta=desired.clone().sub(target),d=delta.length();raycaster.set(target,delta.normalize());const hit=raycaster.intersectObjects(collideWalls,false).find(h=>h.distance<d);if(hit)desired.copy(target).addScaledVector(delta,Math.max(.28,hit.distance-.12));const available=house.clientWidth<600?.72:.9,fitFov=Math.min(92,Math.max(64,2*Math.atan(1.9/(2*desired.distanceTo(target)*available))*180/Math.PI));if(Math.abs(camera.fov-fitFov)>.05){camera.fov=fitFov;camera.updateProjectionMatrix()}softenOcclusion(target,desired);shadowDirty=true;camera.position.copy(desired);controls.target.copy(target.clone().add(V(Math.sin(yaw)*.25,0,Math.cos(yaw)*.25)));camera.lookAt(controls.target);return true;
}
function nearestInteractive(){let result=null,best=3;for(const item of interactives.values()){const p=item.o.kind==='seat'?localPoint(item.o,0,.82):item.o,d=Math.hypot(player.x-p.x,player.z-p.z);if(d>2.0)continue;const a=Math.atan2(p.x-player.x,p.z-player.z),angle=Math.abs(Math.atan2(Math.sin(a-yaw),Math.cos(a-yaw)));if(angle>1.05)continue;const primary=item.person||item.door||['media-tv','cat','tv','coffee-cabinet','coffee-tools'].includes(item.o.kind),score=d+angle*.6-(primary?.45:0);if(score<best){best=score;result=item}}return result}
function isSpecial(o){return Boolean(o)}
function interactionLabel(item){if(item.door)return doors.actionLabel(item.o.id);return item.person?item.person.name+'의 자리 · 인사 / 컴퓨터':['media-tv','cat','tv'].includes(item.o.kind)?'연구실 앨범 열기':['coffee-cabinet','coffee-tools'].includes(item.o.kind)?'워크숍·세미나 펼치기':item.o.name+' 둘러보기'}
let lastMap='';
function updateNearby(){
 if(mode==='overview'||entry||panelBlocks(panel)){$('#nearby').hidden=true;return}
 near=nearestInteractive();$('#nearby').hidden=!near;
 if(near){const label=interactionLabel(near),short=near.door?(near.door.target===1?'닫기':'열기'):near.person?'대화':['media-tv','cat','tv','coffee-cabinet','coffee-tools'].includes(near.o.kind)?'앨범':'살펴보기',html=compactUI()?uiIcon(near.door?'door':'hand')+'<span class="action-label">'+short+'</span>':'<small>E / 클릭</small>'+esc(label);$('#nearby').setAttribute('aria-label',label);if($('#nearby').innerHTML!==html)$('#nearby').innerHTML=html}
 const r=layout.rooms.find(r=>contains(r.points,player)),label=r?.name||'두 방을 잇는 문';
 if($('#location-label').textContent!==label)$('#location-label').textContent=label;
 const signature=[player.x,player.z,yaw].join(',');if(signature===lastMap)return;lastMap=signature;
 $('#map-guest').setAttribute('cx',player.x);$('#map-guest').setAttribute('cy',player.z);
 $('#map-heading').setAttribute('x2',player.x+Math.sin(yaw)*.55);$('#map-heading').setAttribute('y2',player.z+Math.cos(yaw)*.55);
 $('#map-heading').setAttribute('x1',player.x);$('#map-heading').setAttribute('y1',player.z);
}
function walkTo(item,kind='object'){
 const target=nav.approach(item.o,player);if(!target){toast('이 자리까지 이어지는 통로가 좁아요. 다른 쪽에서 접근해 보세요.');return}path=target.path;pendingInteraction={item,kind};$('#tour-card').hidden=true;canvas.focus();if(!path.length)arrived();else toast(item.person?item.person.name+'의 자리로 걸어갑니다':item.o.name+' 앞으로 걸어갑니다');
}
function arrived(){const todo=pendingInteraction;pendingInteraction=null;if(!todo)return;const p=todo.item.o.kind==='seat'?localPoint(todo.item.o,0,.82):todo.item.o;yaw=Math.atan2(p.x-player.x,p.z-player.z);showObject(todo.item,todo.kind)}
function showObject(item,kind='object'){
 if(item.door){path=[];pendingInteraction=null;const changed=doors.toggle(item.o.id);if(changed)toast(item.o.name+(item.door.target===1?'을 열었어요.':'을 닫았어요.'));updateNearby();return}
 if(item.person){if(kind==='person')greet(item);else seatChoice(item);return}
 if(['media-tv','cat','tv'].includes(item.o.kind)){openAlbum('space');return}
 if(['coffee-cabinet','coffee-tools'].includes(item.o.kind)){openAlbum('workshop');return}
 const catalog=furniture.find(f=>f.id===item.o.kind);
 const info=item.o.kind==='bookshelf'?['쌓인 생각, 함께 쓰는 책장','연구실의 책과 자료가 모인 공간입니다. 실제 사진 속 목재 책장의 형태와 수납 칸을 3D로 옮겼어요.']:item.o.kind==='side-table'?['교수실 한쪽의 작은 테이블','냉장고와 책장 사이, 화분과 간식 바구니가 놓인 보조 테이블입니다. 사진에서 보이는 둥근 상판과 수납 받침을 살렸어요.']:['meeting','prof-table'].includes(item.o.kind)?['함께 둘러앉는 자리','잠깐의 대화와 미팅을 위한 공간입니다. 연구실 구성원을 만나거나, 사진 속 실제 공간을 더 둘러보세요.']:[item.o.name,catalog?.detail||'사진 속 연구실의 소품을 이 공간에 담았습니다.'];
 openPanel('IN OUR LAB','<h2 id="panel-title">'+esc(info[0])+'</h2><p>'+esc(info[1])+'</p><div class="dialog-actions"><button class="primary" id="object-album">공간 사진 보기 ↗</button><button class="secondary" id="object-people">구성원 만나기</button></div>');$('#object-album').onclick=()=>openAlbum('space');$('#object-people').onclick=openPeople;
}
function flyObject(o){
 if(o.kind==='seat'){const v=seatView(o,layout,camera.aspect);cameraTo(v.position,v.target,50);return}
 if(['coffee-cabinet','coffee-tools','sofa-3'].includes(o.kind)){
  const couch=layout.objects.find(p=>p.kind==='sofa-3'&&p.roomId===o.roomId),counter=layout.objects.find(p=>p.kind==='coffee-cabinet'&&p.roomId===o.roomId);
  if(couch&&counter){
   const x=(couch.x+counter.x)/2,z=(couch.z+counter.z)/2,a=couch.rotation*Math.PI/180,d=Math.max(2.9,3.7/(2*Math.tan(50*Math.PI/360)*Math.max(.45,camera.aspect)));
   cameraTo([x+Math.sin(a)*d+.25,.75+d,z+Math.cos(a)*d],[x,.75,z],50);
   if(!compactUI())camera.setViewOffset(house.clientWidth,house.clientHeight,house.clientWidth*.11,0,house.clientWidth,house.clientHeight);
   return;
  }
 }
 const width=(footprints[o.kind]?.[0]||1.6)*o.scaleX,d=Math.max(2.4,width/(2*Math.tan(50*Math.PI/360)*Math.max(.35,camera.aspect))*1.12),a=o.rotation*Math.PI/180,height=o.y+(['media-tv','cat','tv'].includes(o.kind)?1.45:.9)*o.scaleY;cameraTo([o.x+Math.sin(a)*d,height+d*.42,o.z+Math.cos(a)*d],[o.x,height,o.z],50);
}
function selectTour(i){
 if(entry)return;if(mode!=='overview')setMode('overview');tourIndex=i;house.classList.add('touring');setTourMenu(false);panel.close();const s=tourStops[i],o=stopObject(s);if(o)flyObject(o);else{const p=openingPosition(layout,layout.openings.find(o=>o.id===s.object));if(p)cameraTo([p.x-2,4,p.z+3],[p.x,1,p.z],50);else overview()}
 $('#tour-card').hidden=false;$('#tour-card').innerHTML='<button class="card-close" id="tour-exit" aria-label="투어 닫기">×</button><button class="mobile-only panel-fold" id="tour-fold" aria-label="투어 설명 접기" aria-expanded="true">'+uiIcon('chevron')+'</button><span class="eyebrow">'+s.eyebrow+'</span><h2>'+s.title+'</h2><p>'+s.description+'</p><button class="primary" id="tour-action">'+s.action+' <span>↗</span></button><div class="tour-progress"><button id="tour-prev" aria-label="이전 장소" '+(i===0?'disabled':'')+'>←</button><span>'+String(i+1).padStart(2,'0')+' / '+String(tourStops.length).padStart(2,'0')+'</span><span class="tour-dots">'+tourStops.map((_,j)=>'<i class="'+(j===i?'active':'')+'"></i>').join('')+'</span><button id="tour-next" aria-label="다음 장소" '+(i===tourStops.length-1?'disabled':'')+'>→</button></div>';
 mobileUI?.syncTour();
 $('#tour-exit').onclick=()=>setMode('overview');$('#tour-prev').onclick=()=>selectTour(i-1);$('#tour-next').onclick=()=>selectTour(i+1);$('#tour-action').onclick=()=>{if(s.type==='album')openAlbum(s.album);else if(['people','desks'].includes(s.type))openPeople();else if(s.type==='person'&&o)greet(interactives.get(o.id));else{setMode('third');if(o)walkTo(interactives.get(o.id))}};
}
function openPanel(kicker,html){const folded=panel.open&&panel.classList.contains('is-collapsed')&&$('#panel-kicker').textContent===kicker;walkInputs.clear();stickInput={forward:0,side:0};mobileUI?.resetStick();path=[];pendingInteraction=null;$('#hover-label').hidden=true;$('#panel-kicker').textContent=kicker;$('#panel-body').innerHTML=html;panel.classList.toggle('is-collapsed',folded);syncPanelHeading(panel);showResponsivePanel(panel);$('#nearby').hidden=true}
function closePanel(){panel.close();if(entry)leavePersonal();else if(mode!=='overview')canvas.focus()}
function openAbout(){openPanel('CONSTRUCTION INNOVATION · DIGITAL TECHNOLOGY','<h2 id="panel-title">사람과 기술이 만나는 연구실</h2><p class="panel-sub">CONICT · 건설 ICT 연구실</p><div class="intro-grid"><img src="./assets/room-19.jpg" alt="연구원 공간과 미팅 테이블"><div><p>서울과학기술대학교의 CONICT 연구실입니다. 건설 현장에 디지털 기술을 연결하는 일을 연구하며, 이 공간에서 함께 배우고 생각을 나눕니다.</p><p>로보틱스, 컴퓨터 비전, 건설 공정과 시공 관리가 공식 홈페이지에 소개된 연구 방향입니다. 각자의 연구 이야기는 구성원이 직접 만드는 개인 페이지로 이어질 예정입니다.</p><div class="info-row"><span>지도교수</span><b>김태훈</b></div><div class="info-row"><span>둘러볼 공간</span><b>연구원 공간 · 교수실과 미팅 공간</b></div><a class="text-link" href="'+official+'/index.do" target="_blank" rel="noopener">공식 연구실 홈페이지 ↗</a></div></div>')}
function openPeople(){openPanel('MEET THE PEOPLE','<h2 id="panel-title">우리 연구실의 사람들</h2><p class="panel-sub">자리를 고르면 3D 공간이 그쪽으로 안내합니다.</p><div class="people-grid">'+positions.map(o=>{const m=personFor(o);return '<button class="person-card" data-person="'+o.id+'"><img src="./assets/'+(m.professor?'profile-08.webp':'profile-'+String(Number(m.id.slice(1))).padStart(2,'0')+'.webp')+'" alt="'+m.name+'"><b>'+m.name+'</b><span>'+m.role+'</span><small>'+visitorSeats.find(s=>s.id===o.seatId).label+' →</small></button>'}).join('')+'</div><p class="disclosure">외부 구성원 이준영·강민균의 자리는 이번 공간에 배치하지 않았습니다. 아바타는 구성원 소개용이며 실제 재실 상태와 별개입니다.</p>');$$('[data-person]').forEach(b=>b.onclick=()=>{panel.close();const item=interactives.get(b.dataset.person);if(mode==='overview'){flyObject(item.o);greet(item)}else walkTo(item,'person')})}
function profileImage(m){return './assets/'+(m.professor?'profile-08.webp':'profile-'+String(Number(m.id.slice(1))).padStart(2,'0')+'.webp')}
function greet(item){
 const m=item.person;wave={start:performance.now(),duration:1800,speaker:item.node.userData.avatar};const head=item.node.userData.avatar?.userData.head;if(head){const a=item.node.rotation.y+Math.PI;head.rotation.y=T.MathUtils.clamp(Math.atan2(player.x-item.o.x,player.z-item.o.z)-a,-.45,.45)}
 openPanel('SAY HELLO · 가상 소개','<div class="dialog-person"><img src="'+profileImage(m)+'" alt="'+m.name+'"><div><span class="role-badge">'+m.role+'</span><h2 id="panel-title">'+m.name+'</h2><p>'+m.en+'</p></div></div><div class="speech" id="speech">안녕하세요. CONICT의 '+m.name+'입니다. 연구실에 오신 것을 환영해요.</div><div class="dialog-actions"><button class="secondary" data-reply="hello">안녕하세요 👋</button><button class="secondary" data-reply="role">어떤 일을 하시나요?</button><button class="primary" id="person-seat">컴퓨터로 개인 페이지 보기 ↗</button></div><p class="disclosure">공개된 이름·역할을 바탕으로 만든 가상 소개입니다. 실제 구성원과 실시간으로 대화하는 기능은 아닙니다.</p>');
 $$('[data-reply]').forEach(b=>b.onclick=()=>{$('#speech').textContent=b.dataset.reply==='hello'?'반가워요. TV에서는 연구실 사진을, 커피 데스크에서는 함께한 워크숍 기록을 볼 수 있어요. 편하게 둘러보세요.':m.professor?'CONICT의 지도교수로 소개되어 있습니다. 연구실은 로보틱스, 컴퓨터 비전, 건설 공정과 시공 관리 분야를 탐구합니다.':'CONICT의 '+m.role+' 구성원입니다. 제 연구 목록과 결과물은 직접 작성한 개인 페이지가 준비되면 이 컴퓨터에 연결됩니다.';wave={start:performance.now(),duration:1800,speaker:item.node.userData.avatar}});$('#person-seat').onclick=()=>{panel.close();enterComputer(item)};
}
function seatChoice(item){const m=item.person;openPanel('AT THE DESK','<h2 id="panel-title">'+m.name+'의 자리</h2><p>'+visitorSeats.find(s=>s.id===item.o.seatId).label+' · '+m.role+'</p><p>인사를 건네거나, 잠시 의자에 앉아 컴퓨터 화면으로 들어가 보세요.</p><div class="dialog-actions"><button class="secondary" id="seat-greet">인사 건네기 👋</button><button class="primary" id="seat-enter">앉아서 컴퓨터 보기 ↗</button></div>');$('#seat-greet').onclick=()=>greet(item);$('#seat-enter').onclick=()=>{panel.close();enterComputer(item)}}
function enterComputer(item){
 if(entry)return;restoreOcclusion();returnState={mode,player:{...player},yaw,pitch,position:camera.position.clone(),target:controls.target.clone(),fov:camera.fov};
 house.classList.add('entering');setTourMenu(false);$('#tour-card').hidden=true;path=[];controls.enabled=false;camera.clearViewOffset();walkInputs.clear();
 const chair=localPoint(item.o,0,.82),eye=localPoint(item.o,0,.73),screen=localPoint(item.o,0,.075),target=localPoint(item.o,0,-.06),start=guest.root.position.clone();
 if(mode==='overview'){const approach=nav.approach(item.o,player);if(approach){player={...approach.point};guest.root.position.set(player.x,0,player.z)}}
 guest.root.visible=true;guest.pose(0);guest.gait(0,false);item.node.userData.avatar&&(item.node.userData.avatar.visible=false);
 entry={item,start:performance.now(),duration:reduced?1100:3200,chair,eye,screen,target,fromGuest:guest.root.position.clone(),fromCamera:camera.position.clone(),fromLook:controls.target.clone(),done:false};guest.root.rotation.y=item.o.rotation*Math.PI/180+Math.PI;
 toast('잠시 앉아, '+item.person.name+'의 컴퓨터를 열어 볼게요.');
}
function updateEntry(now){
 const e=entry;if(!e||e.done)return;const t=T.MathUtils.clamp((now-e.start)/e.duration,0,1),sit=ease(T.MathUtils.clamp((t-.05)/.40,0,1));guest.pose(sit);guest.root.position.lerpVectors(e.fromGuest,V(e.chair.x,e.item.o.y,e.chair.z),ease(Math.min(t/.40,1)));
 const chairEye=V(e.eye.x,e.item.o.y+1.40*e.item.o.scaleY,e.eye.z),target=V(e.target.x,e.item.o.y+1.15*e.item.o.scaleY,e.target.z);
 if(t<.57){camera.position.lerpVectors(e.fromCamera,chairEye,ease(t/.57));const look=e.fromLook.clone().lerp(target,ease(t/.57));camera.lookAt(look);controls.target.copy(look);camera.fov=T.MathUtils.lerp(returnState.fov,58,ease(t/.57))}else{const u=ease((t-.57)/.43);camera.position.lerpVectors(chairEye,V(e.screen.x,e.item.o.y+1.15*e.item.o.scaleY,e.screen.z),u);camera.lookAt(target);controls.target.copy(target);camera.fov=T.MathUtils.lerp(58,20,u);guest.root.visible=false}
 camera.updateProjectionMatrix();$('#portal-flash').style.opacity=String(ease(Math.max(0,(t-.86)/.14)));
 if(t===1){e.done=true;const url=pageLinks[e.item.person.id];if(url){location.href=url;return}personalPreview(e.item);$('#portal-flash').style.opacity='0';house.classList.remove('entering')}
}
function personalPreview(item){const m=item.person;openPanel('PERSONAL SPACE · '+m.en.toUpperCase(),'<div class="personal-head"><div><span class="page-badge">개인 페이지 연결 예정</span><h2 id="panel-title">'+m.name+'의 연구 공간</h2><p>'+m.role+' · CONICT</p></div><img src="'+profileImage(m)+'" alt="'+m.name+'"></div><p>컴퓨터 화면까지 들어왔어요. 이곳에는 '+m.name+'님이 직접 만든 개인 페이지가 연결됩니다.</p><div class="personal-sections"><article><h3>연구 목록</h3><p>구성원이 작성한 연구 소개를 기다리고 있습니다.</p></article><article><h3>결과물</h3><p>구성원이 등록한 논문·프로젝트·결과물이 연결될 자리입니다.</p></article></div><button class="primary" id="back-lab">← 연구실로 돌아가기</button>');$('#back-lab').onclick=closePanel}
function leavePersonal(){const e=entry,r=returnState;if(!e||!r)return;e.item.node.userData.avatar&&(e.item.node.userData.avatar.visible=true);entry=null;returnState=null;guest.pose(0);guest.gait(0,false);player={...r.player};yaw=r.yaw;pitch=r.pitch;guest.root.position.set(player.x,0,player.z);guest.root.visible=r.mode==='third';house.classList.remove('entering');$('#portal-flash').style.opacity='0';setMode(r.mode);if(r.mode==='overview')cameraTo(r.position.toArray(),r.target.toArray(),r.fov,850);toast('연구실로 돌아왔어요.')}

function openAlbum(id='space'){
 const a=albums.find(a=>a.id===id)||albums[0];openPanel('THE LAB ALBUM','<h2 id="panel-title">'+a.subtitle+'</h2><p class="panel-sub">'+(id==='space'?'제공된 실제 연구실 사진을 한 장씩 펼쳐 보세요.':'공식 연구실 홈페이지에 공개된 활동 기록입니다. 행사 사진은 나중에 이 앨범에 추가할 수 있어요.')+'</p><div class="album-tabs" role="tablist" aria-label="앨범 분류">'+albums.map(x=>'<button role="tab" aria-selected="'+(x.id===id)+'" class="'+(x.id===id?'active':'')+'" data-album="'+x.id+'">'+x.name+'</button>').join('')+'</div><div class="album-grid">'+(id==='space'?photos.map((p,i)=>'<button class="photo-card" data-photo="'+i+'"><img src="'+p.src+'" alt="'+p.title+'" loading="lazy"><span>'+p.title+'</span></button>').join(''):records.filter(r=>r.album===id).map(r=>'<article class="record-card">'+(r.photoUrl?'<button class="event-photo" data-event="'+records.indexOf(r)+'"><img src="'+r.photoUrl+'" alt="'+r.title+'" loading="lazy"></button>':'<span class="record-icon">'+(id==='workshop'?'☕':id==='conference'?'↗':'◇')+'</span>')+'<time>'+r.date+'</time><h3>'+r.title+'</h3><a href="'+r.url+'" target="_blank" rel="noopener">공식 활동 기록 보기 ↗</a></article>').join(''))+'</div>'+(id!=='space'?'<div class="record-source"><span>출처: CONICT 공식 홈페이지의 활동 목록 · 행사 사진 미등록</span><a href="'+galleryFallback[id]+'" target="_blank" rel="noopener">공식 갤러리 목록 ↗</a></div>':''));
 $$('[data-album]').forEach(b=>b.onclick=()=>openAlbum(b.dataset.album));$$('[data-photo]').forEach(b=>b.onclick=()=>showPhoto(Number(b.dataset.photo),photos));$$('[data-event]').forEach(b=>b.onclick=()=>{const r=records[Number(b.dataset.event)];showPhoto(0,[{src:r.photoUrl,title:r.title+' · '+r.date}])});
}
let photoIndex=0,activePhotos=photos;function showPhoto(i,collection=activePhotos){activePhotos=collection;photoIndex=(i+activePhotos.length)%activePhotos.length;const p=activePhotos[photoIndex];$('#photo-large').src=p.src;$('#photo-large').alt=p.title;$('#photo-caption').textContent=p.title+' · '+(photoIndex+1)+' / '+activePhotos.length;if(!$('#lightbox').open)$('#lightbox').showModal()}
function openHelp(){openPanel('HOW TO EXPLORE','<h2 id="panel-title">천천히, 마음 가는 대로</h2><div class="help-list"><article><h3>연구실 투어</h3><p>왼쪽 아래 버튼 위에 펼쳐지는 목록에서 장소를 고르세요. 다음 화살표로 순서대로 안내받을 수도 있어요.</p></article><article><h3>1인칭 · 3인칭 걷기</h3><p>WASD나 방향키, 화면의 이동 버튼을 사용하세요. 화면을 드래그하면 시선이 바뀌고, 바닥을 누르면 걸어갑니다.</p></article><article><h3>다가가서 눌러 보세요</h3><p>문을 누르면 열고 닫을 수 있어요. 컴퓨터, 사람, TV와 커피 데스크도 클릭해 보세요. 걷는 중에는 가까이 가서 E나 상호작용 버튼을 누르세요. 닫힌 문은 열고 지나갈 수 있습니다.</p></article><article><h3>인사하고, 앉아 보고</h3><p>구성원의 소개를 듣고 의자에 앉아 컴퓨터 화면으로 들어가 보세요. 개인 페이지는 준비되면 연결됩니다.</p></article></div>')}

// UI events and actual floor picking share the same navigation path.
function openMobileHelp(){openPanel('둘러보기','<h2 id="panel-title">손끝으로 둘러보기</h2><div class="help-list"><article><h3>이동</h3><p>입장 후 왼쪽 원을 밀어 걸어요. 손을 떼면 멈춥니다. 바닥을 눌러 이동할 수도 있어요.</p></article><article><h3>시점</h3><p>화면을 끌어 둘러보세요. 전체보기에서는 두 손가락으로 확대·축소할 수 있어요. 아래 눈·사람 아이콘으로 시점을 바꿉니다.</p></article><article><h3>상호작용</h3><p>사람이나 문에 다가가 오른쪽 손 모양 버튼을 누르세요. 길 모양 아이콘에서는 장소별 투어를 고를 수 있어요.</p></article><article><h3>패널</h3><p>접기 화살표로 안내를 줄이거나 다시 펼쳐요. 상세 패널은 위쪽을 아래로 밀어 접을 수도 있어요. 메뉴와 지도는 필요할 때만 꺼내세요.</p></article></div>')}
$('#home').onclick=()=>setMode('overview');$('#enter-button').onclick=()=>setMode('third');$('#about-button').onclick=openAbout;$('#people-button').onclick=openPeople;$('#album-button').onclick=()=>openAlbum('space');$('#help-button').onclick=()=>compactUI()?openMobileHelp():openHelp();$('#panel-close').onclick=closePanel;$('#photo-close').onclick=()=>$('#lightbox').close();$('#photo-prev').onclick=()=>showPhoto(photoIndex-1);$('#photo-next').onclick=()=>showPhoto(photoIndex+1);
panel.addEventListener('cancel',e=>{e.preventDefault();closePanel()});panel.addEventListener('click',e=>{if(e.target===panel){const r=panel.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closePanel()}});
$('#lightbox').addEventListener('keydown',e=>{if(e.key==='ArrowLeft')showPhoto(photoIndex-1);if(e.key==='ArrowRight')showPhoto(photoIndex+1)});
$('#tour-list').innerHTML=tourStops.map((s,i)=>'<button data-stop="'+i+'"><span>'+String(i+1).padStart(2,'0')+'</span>'+s.title+'<b>↗</b></button>').join('');$$('[data-stop]').forEach(b=>b.onclick=()=>selectTour(Number(b.dataset.stop)));$('#tour-toggle').onclick=()=>setTourMenu($('#tour-menu').hidden);$$('[data-view]').forEach(b=>b.onclick=()=>setMode(b.dataset.view));$('#nearby').onclick=()=>{if(near)showObject(near)};
document.addEventListener('click',e=>{if(!e.target.closest('.tour-anchor'))setTourMenu(false)});
const canWalk=()=>mode!=='overview'&&!panelBlocks(panel)&&!entry&&!$('#lightbox').open;
const typing=e=>e.target instanceof Element&&Boolean(e.target.closest('input,textarea,select,[contenteditable]:not([contenteditable="false"])'));
function manualControl(){path=[];pendingInteraction=null}
window.addEventListener('keydown',e=>{
 if(!canWalk()||typing(e)||e.altKey||e.ctrlKey||e.metaKey)return;
 const action=walkingAction(e);
 if(action){e.preventDefault();walkInputs.set('key:'+(e.code||e.key),action);manualControl()}
 if((e.code==='KeyE'||e.key.toLowerCase()==='e')&&!e.repeat&&near)showObject(near);
 if(e.key==='Escape')setMode('overview');
});
window.addEventListener('keyup',e=>walkInputs.delete('key:'+(e.code||e.key)));
window.addEventListener('blur',()=>{walkInputs.clear();stickInput={forward:0,side:0};drag=null;canvasPointers.clear()});
document.addEventListener('visibilitychange',()=>{if(document.hidden){walkInputs.clear();stickInput={forward:0,side:0};drag=null;canvasPointers.clear()}});
$$('[data-walk]').forEach(b=>{
 const presses=new Map();
 b.onpointerdown=e=>{if(!canWalk()||e.button!==0)return;e.preventDefault();b.setPointerCapture(e.pointerId);manualControl();presses.set(e.pointerId,{time:performance.now(),x:player.x,z:player.z});walkInputs.set('pointer:'+e.pointerId,b.dataset.walk)};
 const release=e=>{const source='pointer:'+e.pointerId,held=walkInputs.has(source),press=presses.get(e.pointerId);walkInputs.delete(source);presses.delete(e.pointerId);
  // A quick tap gets a minimum step; a held button stops without an extra click jump.
  if(held&&press&&e.type==='pointerup'&&canWalk()&&performance.now()-press.time<150){const step=Math.max(0,.18-Math.hypot(player.x-press.x,player.z-press.z)),d=movementDirection(yaw,[b.dataset.walk]);player=nav.move(player,d.x*step,d.z*step)}
 };
 b.onpointerup=release;b.onpointercancel=release;b.onlostpointercapture=release;
 // Keyboard and assistive clicks have no held pointer; give those one small step.
 b.onclick=e=>{if(e.detail!==0||!canWalk())return;manualControl();const d=movementDirection(yaw,[b.dataset.walk]);player=nav.move(player,d.x*.18,d.z*.18);canvas.focus()};
});
$$('[data-look]').forEach(b=>b.onclick=()=>{if(!canWalk())return;manualControl();yaw=turnYaw(yaw,b.dataset.look);canvas.focus()});
function pick(event){const r=canvas.getBoundingClientRect();mouse.set((event.clientX-r.left)/r.width*2-1,-(event.clientY-r.top)/r.height*2+1);raycaster.setFromCamera(mouse,camera);const hits=raycaster.intersectObjects(ceiling.root.visible?[lab,ceiling.root]:[lab],true);for(const hit of hits){if(hit.object.material.clippingPlanes?.some(p=>p.distanceToPoint(hit.point)<0))continue;let n=hit.object,person=null,item=null;while(n&&n!==lab){if(n.userData.layoutKind==='ceiling')return {hit:null,point:null};if(n.userData.personSeat)person=n.userData.personSeat;if(n.userData.layoutKind==='object')item=interactives.get(n.userData.layoutId);if(n.userData.layoutKind==='opening'){const door=interactives.get(n.userData.layoutId);return {hit:door?.door?door:null,kind:'door',point:null}}if(n.userData.layoutKind==='wall')return {hit:null,point:null};n=n.parent}if(item)return {hit:item,kind:person?'person':'object',point:hit.point};if(hit.object.parent?.userData.layoutKind==='room')return {hit:null,point:hit.point}}
 const p=new T.Vector3();raycaster.ray.intersectPlane(floorPlane,p);return {hit:null,point:p};
}
canvas.addEventListener('pointerdown',e=>{if(entry||panelBlocks(panel)||e.button!==0)return;canvasPointers.add(e.pointerId);if(drag){if(mode==='overview')drag.multi=true;return}drag={id:e.pointerId,x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,distance:0,multi:canvasPointers.size>1};if(mode!=='overview')canvas.setPointerCapture(e.pointerId)});
canvas.addEventListener('pointermove',e=>{if(entry||panelBlocks(panel))return;if(drag){if(drag.id!==e.pointerId)return;drag.distance+=Math.hypot(e.clientX-drag.lastX,e.clientY-drag.lastY);if(mode!=='overview'){yaw-=(e.clientX-drag.lastX)*.006;pitch=T.MathUtils.clamp(pitch-(e.clientY-drag.lastY)*.005,-.6,.55);path=[];pendingInteraction=null}drag.lastX=e.clientX;drag.lastY=e.clientY;$('#hover-label').hidden=true;return}if(mode==='overview'&&e.pointerType!=='touch'){const p=pick(e);hovered=p.hit;$('#hover-label').hidden=!hovered;canvas.style.cursor=hovered?'pointer':'grab';if(hovered){$('#hover-label').textContent=hovered.person?hovered.person.name+(p.kind==='person'?' · 인사하기':' · 컴퓨터 보기'):(hovered.door?doors.actionLabel(hovered.o.id):hovered.o.name);$('#hover-label').style.left=Math.min(e.clientX+12,house.clientWidth-190)+'px';$('#hover-label').style.top=e.clientY+15+'px'}}});
canvas.addEventListener('pointerup',e=>{canvasPointers.delete(e.pointerId);if(drag?.id!==e.pointerId)return;const d=drag;drag=null;if(entry||panelBlocks(panel)||d.multi||canvasPointers.size||d.distance>8)return;const p=pick(e);if(p.hit){if(p.hit.door){if(mode==='overview'||Math.hypot(player.x-p.hit.o.x,player.z-p.hit.o.z)<=2.2)showObject(p.hit);else walkTo(p.hit,'door')}else if(mode==='overview'){if(isSpecial(p.hit.o)){flyObject(p.hit.o);showObject(p.hit,p.kind)}else showObject(p.hit)}else if(isSpecial(p.hit.o))walkTo(p.hit,p.kind)}else if(mode!=='overview'&&p.point){const route=nav.path(player,{x:p.point.x,z:p.point.z});if(route){path=route;pendingInteraction=null}else toast('벽이나 가구가 있는 곳에는 걸어갈 수 없어요。')}canvas.focus()});
for(const event of ['pointercancel','lostpointercapture'])canvas.addEventListener(event,e=>{canvasPointers.delete(e.pointerId);if(drag?.id===e.pointerId)drag=null});

const doorTagNodes=doors.records.map(record=>{
 const el=document.createElement('button');el.className='door-tag';el.dataset.door=record.id;el.type='button';
 el.onclick=()=>{showObject(interactives.get(record.id));canvas.focus()};$('#door-tags').append(el);
 return {el,record,point:V(record.object.x,1.15,record.object.z)};
});
function syncDoorLabel(record){
 const tag=doorTagNodes.find(t=>t.record===record);if(!tag)return;
 tag.el.setAttribute('aria-label',doors.actionLabel(record.id));tag.el.setAttribute('aria-pressed',String(record.target===1));
 tag.el.dataset.state=doors.status(record.id);tag.el.innerHTML=uiIcon('door')+'<span class="desktop-label">'+esc(record.object.name+' · '+doors.status(record.id)+' / '+(record.target===1?'닫기':'열기'))+'</span>';
}
doors.records.forEach(syncDoorLabel);

// Room names and minimap are derived from the same editable geometry, never a second plan.
const roomTagNodes=layout.rooms.map(r=>{const b=planBounds({rooms:[r],walls:[],objects:[]}),el=document.createElement('button');el.className='room-tag';el.innerHTML=esc(r.name)+'<b>↗</b>';el.onclick=()=>selectTour(r.id==='r2'?5:1);$('#room-tags').append(el);return {el,point:V((b.minX+b.maxX)/2,.2,(b.minZ+b.maxZ)/2)}});
$('#minimap').setAttribute('viewBox',[bounds.minX-.2,bounds.minZ-.2,bounds.maxX-bounds.minX+.4,bounds.maxZ-bounds.minZ+.4].join(' '));$('#minimap').innerHTML=layout.rooms.map(r=>'<polygon points="'+r.points.map(p=>p.x+','+p.z).join(' ')+'" fill="#e0e6d5" stroke="#8da581" stroke-width=".10"/>').join('')+'<line id="map-heading" stroke="#315b47" stroke-width=".09"/><circle id="map-guest" r=".17" fill="#315b47" stroke="#fcf7e6" stroke-width=".06"/>';
const atmosphere=createAtmosphere({scene,renderer,sun,hemisphere,ground,layout,onInvalidate:({shadows})=>{dirty=true;if(shadows)shadowDirty=true}});
const weatherClient=mountWeather(atmosphere);
const profiler=createProfiler(renderer,'visitor',()=>mode);
let lastStep=0;
function tick(now){if(disposed)return;requestAnimationFrame(tick);if(document.hidden){lastTime=now;return}if(now-lastStep<33)return;lastStep=now;const frameElapsed=Math.max(0,(now-lastTime)/1000),dt=Math.min(frameElapsed,.06);lastTime=now;const perfStart=profiler.begin();let rendered=false;
 if(doors.tick(dt)){dirty=shadowDirty=true;lastWalkView=null}
 if(entry){if(!entry.done)dirty=shadowDirty=true;updateEntry(now)}else if(fly){dirty=true;const t=Math.min((now-fly.start)/fly.duration,1),u=ease(t);camera.position.lerpVectors(fly.from,fly.to,u);controls.target.lerpVectors(fly.look,fly.target,u);camera.fov=T.MathUtils.lerp(fly.fov,fly.nextFov,u);camera.updateProjectionMatrix();camera.lookAt(controls.target);if(t===1){const after=fly.after;fly=null;controls.enabled=mode==='overview';after?.()}}
 else if(mode==='overview'){controls.dampingFactor=1-Math.pow(1-.09,dt*60);controls.update();}
 else if(!panelBlocks(panel)&&!$('#lightbox').open){let moving=false;if(walkInputs.size||Math.hypot(stickInput.forward,stickInput.side)>.001){const d=walkInputs.size?movementDirection(yaw,walkInputs.values()):analogMovementDirection(yaw,stickInput.forward,stickInput.side),speed=1.35*dt,next=nav.move(player,d.x*speed,d.z*speed);moving=Math.hypot(next.x-player.x,next.z-player.z)>.0001;player=next}else if(path.length){const goal=path[0],dx=goal.x-player.x,dz=goal.z-player.z,d=Math.hypot(dx,dz);if(d<.035){path.shift();if(!path.length)arrived()}else{yaw=Math.atan2(dx,dz);const step=Math.min(d,1.35*dt),next=nav.move(player,dx/d*step,dz/d*step);moving=Math.hypot(next.x-player.x,next.z-player.z)>.0001;if(!moving){path=[];pendingInteraction=null;toast('이 통로는 지나갈 수 없어요. 다른 길을 골라 주세요.')}player=next}}
  guest.root.position.set(player.x,0,player.z);guest.root.rotation.y=yaw;phase+=dt*7;if(moving||guestMoving){guest.gait(phase,moving);dirty=true;if(guest.root.visible)shadowDirty=true}guestMoving=moving;updateWalkCamera();updateNearby();
 }
 const pcActive=pcMotion.records.some(r=>(r.mode!=='seated'||isWorking(r))&&r.body.visible&&r.item.o.id!==entry?.item.o.id);
 pcMotion.tick(dt,entry?.item.o.id,frameElapsed);
 const pcVisual=pcMotion.records.map(r=>r.state+'/'+r.mode+'/'+r.body.visible).join('|');
 if(pcActive||pcVisual!==lastPCVisual)dirty=shadowDirty=true;lastPCVisual=pcVisual;
 if(wave){dirty=shadowDirty=true;const t=(now-wave.start)/wave.duration;if(t>1){guest.wave(1);if(wave.speaker)wave.speaker.userData.wave?.(1);wave=null}else if(!entry){guest.wave(t);if(wave.speaker)wave.speaker.userData.wave?.(t)}}
 if(atmosphere.tick(dt))dirty=true;
 if(dirty)for(const tag of doorTagNodes){const p=tag.point.clone().project(camera);tag.el.style.left=(p.x*.5+.5)*house.clientWidth+'px';tag.el.style.top=(-p.y*.5+.5)*house.clientHeight+'px';tag.el.hidden=mode!=='overview'||tourIndex>=0||p.z>1||p.z< -1}
 if(dirty)for(const tag of roomTagNodes){const p=tag.point.clone().project(camera);tag.el.style.left=(p.x*.5+.5)*house.clientWidth+'px';tag.el.style.top=(-p.y*.5+.5)*house.clientHeight+'px';tag.el.hidden=mode!=='overview'||tourIndex>=0||p.z>1}
 if(dirty){renderer.shadowMap.needsUpdate=shadowDirty;renderer.render(scene,camera);rendered=true;dirty=shadowDirty=false}
 profiler.end(perfStart,rendered);
}
window.addEventListener('lab-visual-change',()=>dirty=shadowDirty=true);canvas.addEventListener('webglcontextrestored',()=>dirty=shadowDirty=true);
document.addEventListener('visibilitychange',()=>{lastTime=performance.now()});window.addEventListener('resize',resize);window.addEventListener('storage',e=>{if(['conict-layout-v1','conict-seat-members'].includes(e.key))toast('편집한 배치가 저장되었어요. 새로고침하면 홈페이지에도 반영됩니다.')});resize();$('#loader').hidden=true;requestAnimationFrame(tick);
window.addEventListener('pagehide',()=>{disposed=true;weatherClient.close();atmosphere.dispose();ceiling.dispose();renderer.dispose()});

mountPCPanel({items:[...interactives.values()],motion:pcMotion,openPanel,panel});
mobileUI=mountVisitorMobileUI({canWalk,onJoystick:v=>{stickInput=v;if(v.forward||v.side)manualControl()},onStop:()=>{walkInputs.clear();stickInput={forward:0,side:0};drag=null;canvasPointers.clear()},closePanel});
window.visualViewport?.addEventListener('resize',resize);
