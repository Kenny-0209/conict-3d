import * as T from './vendor/three.module.js';

const V=(x,y,z)=>new T.Vector3(x,y,z), H=.24;
const clamp=T.MathUtils.clamp, mix=T.MathUtils.lerp;
const portraits={
 m1:{file:'profile-01.webp',cx:178,eyes:165,chin:299,eyeHalf:38},
 m2:{file:'profile-02.webp',cx:648,eyes:804,chin:1420,eyeHalf:165},
 m3:{file:'profile-03.webp',cx:306,eyes:309,chin:563,eyeHalf:70},
 m4:{file:'profile-04.webp',cx:71,eyes:68,chin:139,eyeHalf:16},
 m5:{file:'profile-05.webp',cx:513,eyes:532,chin:968,eyeHalf:111},
 m6:{file:'profile-06.webp',cx:178,eyes:162,chin:298,eyeHalf:35},
 m7:{file:'profile-07.webp',cx:207,eyes:250,chin:423,eyeHalf:45},
 m8:{file:'profile-08.webp',cx:54,eyes:54,chin:95,eyeHalf:12}
};
const faceCache=new Map();
const headRings=[
 [0,.030,.034,.017],[.018,.044,.060,.011],[.045,.061,.076,.004],
 [.080,.078,.084,0],[.120,.084,.091,-.005],[.160,.081,.094,-.008],
 [.195,.075,.086,-.012],[.222,.053,.061,-.014],[H,.001,.001,-.014]
];
function section(y){
 let j=0;while(j<headRings.length-2&&y>headRings[j+1][0])j++;
 const a=headRings[j],b=headRings[j+1],t=clamp((y-a[0])/(b[0]-a[0]),0,1),before=headRings[Math.max(0,j-1)],after=headRings[Math.min(headRings.length-1,j+2)];
 return [1,2,3].map(c=>{const p=before[c],q=a[c],r=b[c],u=after[c];return .5*((2*q)+(-p+r)*t+(2*p-5*q+4*r-u)*t*t+(-p+3*q-3*r+u)*t*t*t)});
}
function smoothLoft(k,parent,rings,color,n=28){
 const curve=new T.CatmullRomCurve3(rings.map(r=>V(r.x,r.y,r.z)),false,'catmullrom',.3),samples=[];
 for(let i=0;i<=48;i++){const at=curve.getPoint(i/48);let j=0;while(j<rings.length-2&&at.y>rings[j+1].y)j++;const a=rings[j],b=rings[j+1],t=clamp((at.y-a.y)/(b.y-a.y||1),0,1);samples.push({y:at.y,x:Math.max(.001,at.x),z:Math.max(.001,at.z),cx:mix(a.cx||0,b.cx||0,t),cz:mix(a.cz||0,b.cz||0,t),fold:mix(a.fold||0,b.fold||0,t)})}
 return k.loft(parent,samples,color,n);
}
const bump=(x,y,cx,cy,sx,sy)=>Math.exp(-(((x-cx)/sx)**2+((y-cy)/sy)**2));
function headPoint(y,a,width=1){
 const [rx,rz,cz]=section(y),x=rx*Math.sin(a)*width,front=Math.max(0,Math.cos(a));
 // The nose, brow, eye sockets, lips and cheeks belong to the same head surface.
 const sculpt=.020*bump(x,y,0,.117,.019,.046)+.017*bump(x,y,0,.091,.025,.018)
 +.004*bump(x,y,0,.044,.043,.015)+.005*bump(x,y,0,.016,.033,.014)
 +.005*(bump(x,y,-.052,.085,.026,.03)+bump(x,y,.052,.085,.026,.03))
 -.005*(bump(x,y,-.037,.126,.025,.014)+bump(x,y,.037,.126,.025,.014));
 return [x,y,cz+rz*Math.cos(a)+sculpt*front**6];
}
function geometry(rows,columns,point,keep=()=>true){
 const positions=[],uv=[],indices=[];
 for(let j=0;j<=rows;j++)for(let i=0;i<=columns;i++){
  positions.push(...point(j/rows,i/columns));uv.push(i/columns,j/rows);
 }
 for(let j=0;j<rows;j++)for(let i=0;i<columns;i++){
  if(!keep((j+.5)/rows,(i+.5)/columns))continue;
  const a=j*(columns+1)+i,b=a+columns+1;indices.push(a,a+1,b,b,a+1,b+1);
 }
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();return geo;
}
function addSurface(k,parent,geo,color,name,material){
 let mesh;
 if(k.voxel){const a=geo.attributes.position,points=[],seen=new Set();for(let i=0;i<a.count;i++){const p=[a.getX(i),a.getY(i),a.getZ(i)].map(x=>Math.round(x/.018)*.018),id=p.join(',');if(!seen.has(id)){seen.add(id);points.push(p)}}mesh=k.instances(parent,points,.019,color);geo.dispose();}
 else{mesh=k.mesh(parent,geo,color,[0,0,0],{side:T.DoubleSide,roughness:.84});if(material)mesh.material=material;}
 mesh.name=name;return mesh;
}
function portraitMaterial(person){
 if(!portraits[person.id]||typeof document==='undefined')return null;
 if(faceCache.has(person.id))return faceCache.get(person.id);
 const cfg=portraits[person.id],atlas=document.createElement('canvas');atlas.width=1024;atlas.height=768;
 const ctx=atlas.getContext('2d');ctx.fillStyle=person.skin;ctx.fillRect(0,0,1024,768);
 const texture=new T.CanvasTexture(atlas);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=4;
 const material=new T.MeshStandardMaterial({map:texture,color:'#ffffff',roughness:.92,metalness:0,side:T.DoubleSide});
 material.name=person.name+' portrait on sculpted head';faceCache.set(person.id,material);
 const img=new Image();img.onload=()=>{
  const layer=document.createElement('canvas');layer.width=512;layer.height=768;const c=layer.getContext('2d');
  const height=(cfg.chin-cfg.eyes)*2,width=cfg.eyeHalf/.037*.176;
  c.drawImage(img,cfg.cx-width/2,cfg.chin-height,width,height,0,0,512,768);
  // Fade the portrait into the surrounding head; never leave a rectangular photo plane.
  const pixels=c.getImageData(0,0,512,768);
  for(let y=0;y<768;y++)for(let x=0;x<512;x++){
   const q=((x-256)/258)**2+((y-376)/414)**2;
   pixels.data[(y*512+x)*4+3]*=clamp((1.12-q)/.24,0,1);
  }
  c.putImageData(pixels,0,0);ctx.fillStyle=person.skin;ctx.fillRect(0,0,1024,768);ctx.drawImage(layer,256,0);texture.needsUpdate=true;window.dispatchEvent(new Event('lab-visual-change'));
 };
 img.src=new URL('./assets/'+cfg.file,import.meta.url).href;
 return material;
}
function makeHead(k,person){
 const head=new T.Group();head.name='Head · '+person.name;
 const width=person.id==='m2'?1.05:person.id==='m3'?1.03:person.id==='m4'?.94:1;
 const geo=geometry(44,64,(v,u)=>headPoint(v*H,(u-.5)*Math.PI*2,width));
 // Front UVs use a planar projection onto the curved anatomy, aligned to the eyes and chin.
 const pos=geo.attributes.position,uv=geo.attributes.uv;
 for(let i=0;i<pos.count;i++){const col=i%65,a=(col/64-.5)*Math.PI*2;uv.setXY(i,Math.cos(a)>0?.5+pos.getX(i)/(.176*width)*.5:.04,pos.getY(i)/H)}
 addSurface(k,head,geo,person.skin,'Continuous face, jaw and cranium',portraitMaterial(person));
 for(const side of [-1,1]){
  if(person.hair!=='scarf'){
   k.ell(head,[.012,.029,.018],[side*.086*width,.122,-.007],person.skin,20).name='Ear';
   k.curve(head,[[side*.089*width,.140,.007],[side*.092*width,.123,.012],[side*.088*width,.106,.006]],.0025,'#aa7b65');
  }
 }
 if(!portraits[person.id]||k.voxel){
  for(const side of [-1,1]){
   const x=side*.037,z=headPoint(.127,Math.asin(x/.084),width)[2];
   k.ell(head,[.013,.0048,.0028],[x,.127,z+.0015],'#ede6dc',20);
   k.ell(head,[.004,.0042,.002],[x,.127,z+.004],'#302c29',16);
   k.curve(head,[[x-.015,.151,z-.004],[x,.155,z+.001],[x+.015,.153,z-.004]],.0024,'#292522');
  }
  k.curve(head,[[-.024,.050,.099],[0,.047,.110],[.024,.050,.099]],.002,'#98695e');
 }
 if(person.hair==='scarf')makeScarf(k,head,person);else makeHair(k,head,person,width);
 if(person.glasses)makeGlasses(k,head,person);
 return head;
}
function makeHair(k,head,person,width){
 const shape=[[.09,.091,.103],[.14,.094,.105],[.19,.089,.097],[.220,.073,.081],[.242,.040,.047],[.252,.001,.001]];
 function radius(y){let j=0;while(j<shape.length-2&&y>shape[j+1][0])j++;const a=shape[j],b=shape[j+1],t=clamp((y-a[0])/(b[0]-a[0]),0,1);return [mix(a[1],b[1],t),mix(a[2],b[2],t)]}
 const part=person.hair==='part',swept=person.hair==='swept';
 const geo=geometry(36,72,(v,u)=>{
  const a=(u-.5)*Math.PI*2,front=Math.max(0,Math.cos(a));
  let hairline=person.hair==='fringe'?.162:person.hair==='short'?.192-.014*Math.sin(a+.3):swept?.202:.192-.022*Math.sin(a*2)**2;
  hairline+=.0025*Math.sin(a*23)+.0015*Math.sin(a*47);
  const low=mix(.095,hairline,clamp((Math.cos(a)+.05)/.45,0,1)),y=mix(.252,low,v),r=radius(y),ridge=.0012*Math.sin(a*17+v*5)*Math.sin(Math.PI*v);
  return [(r[0]+ridge)*Math.sin(a)*width,y+((part||swept)?.0015*Math.sin(a*2)**2:0),-.014+(r[1]+ridge)*Math.cos(a)];
 });
 const mesh=addSurface(k,head,geo,'#211c1b','Sculpted hair cap');
 if(!k.voxel&&typeof document!=='undefined'){
  const c=document.createElement('canvas');c.width=512;c.height=256;const ctx=c.getContext('2d');ctx.fillStyle='#1d1918';ctx.fillRect(0,0,512,256);
  for(let i=0;i<180;i++){const x=i/180*512;ctx.strokeStyle=i%4?'#27211e':'#342a24';ctx.lineWidth=i%3?.7:1.1;ctx.beginPath();ctx.moveTo(x,0);ctx.bezierCurveTo(x-9,70,x+12,130,x+7*Math.sin(i),256);ctx.stroke()}
  const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;mesh.material=new T.MeshStandardMaterial({map,roughness:.72,side:T.DoubleSide});
 }
}
function makeScarf(k,head,person){
 const geo=geometry(36,64,(v,u)=>{
  const y=mix(-.15,.261,v),a=(u-.5)*Math.PI*2,low=clamp((.05-y)/.2,0,1),r=.103+low*.072;
  const crown=Math.sqrt(Math.max(.025,1-((Math.max(.13,y)-.13)/.137)**2));
  const fold=.003*Math.sin(a*7+y*17);
  return [(r*crown+fold)*Math.sin(a),y,-.024+(.122*crown+low*.052+fold)*Math.cos(a)];
 },(v,u)=>{const y=mix(-.15,.261,v),a=(u-.5)*Math.PI*2;return y>.213||y<-.027||Math.abs(a)>1.01});
 addSurface(k,head,geo,'#d6b9c5','Draped scarf with an open face');
 for(const side of [-1,1])k.curve(head,[[side*.050,.217,.079],[side*.083,.164,.076],[side*.094,.057,.058],[side*.124,-.123,.074]],.003,'#e5cbd4');
}
function makeGlasses(k,head,person){
 const square=person.glasses==='square',color=square?'#202629':'#776e60',r=square?.0028:.0013;
 for(const side of [-1,1]){
  const x=side*.039,points=[];
  if(square){for(let i=0;i<=40;i++){const a=i/40*Math.PI*2;points.push([x+.027*Math.sign(Math.cos(a))*Math.abs(Math.cos(a))**.55,.125+.021*Math.sign(Math.sin(a))*Math.abs(Math.sin(a))**.6,.102+(.004*Math.cos(a))])}}
  else for(let i=0;i<=40;i++){const a=i/40*Math.PI*2;points.push([x+.028*Math.cos(a),.125+.025*Math.sin(a),.105+.003*Math.cos(a)])}
  if(!portraits[person.id]||k.voxel)k.curve(head,points,r,color);k.curve(head,[[side*.066,.127,.085],[side*.084,.129,.038],[side*.085,.124,-.010]],r,color);
 }
 if(!portraits[person.id]||k.voxel)k.curve(head,[[-.012,.133,.108],[0,.138,.119],[.012,.133,.108]],r,color);
}
function shirtMaterial(person){
 if(!person.striped||typeof document==='undefined')return null;
 const c=document.createElement('canvas');c.width=256;c.height=64;const ctx=c.getContext('2d');ctx.fillStyle='#c7d7ec';ctx.fillRect(0,0,256,64);
 for(let x=0;x<256;x+=8){ctx.fillStyle='#879fbd';ctx.fillRect(x,0,1,64);ctx.fillStyle='#e3e8f0';ctx.fillRect(x+3,0,1,64)}
 const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;return new T.MeshStandardMaterial({map,roughness:.88,side:T.DoubleSide});
}
function continuousLimb(k,parent,bones,rings,color,origin,joint,skins,material){
 const temporary=new T.Group(),source=smoothLoft(k,temporary,rings,color,28),geo=source.geometry;geo.translate(...origin);
 const indices=[],weights=[],position=geo.attributes.position;
 for(let i=0;i<position.count;i++){const distance=-(position.getY(i)-origin[1]),weight=T.MathUtils.smoothstep(distance,joint-.072,joint+.072);indices.push(0,1,0,0);weights.push(1-weight,weight,0,0)}
 geo.setAttribute('skinIndex',new T.Uint16BufferAttribute(indices,4));geo.setAttribute('skinWeight',new T.Float32BufferAttribute(weights,4));
 const mesh=new T.SkinnedMesh(geo,material||source.material);mesh.castShadow=true;mesh.receiveShadow=true;mesh.frustumCulled=false;mesh.boundingSphere=new T.Sphere(V(0,0,0),1.8);parent.add(mesh);skins.push({mesh,bones});return mesh;
}
function makeHand(k,parent,person,side){
 const hand=new T.Group();hand.name='Hand and five fingers';parent.add(hand);
 smoothLoft(k,hand,[{y:-.076,x:.025,z:.011,cz:.006},{y:-.055,x:.032,z:.014},{y:-.019,x:.028,z:.015},{y:0,x:.019,z:.015}],person.skin,20);
 for(let i=0;i<4;i++){
  const x=(i-1.5)*.016,len=[.033,.042,.039,.030][i];
  const finger=k.sweep(hand,[[x,-.066,.003],[x,-.082,.004],[x,-.066-len,-.003]],[.0062,.0037],person.skin);finger.name='Finger '+(i+1);
 }
 k.sweep(hand,[[side*-.026,-.020,.006],[side*-.044,-.043,.014],[side*-.042,-.061,.009]],[.008,.005],person.skin).name='Thumb';
 return hand;
}
function addClothing(k,torso,person){
 const {patch,curve}=k;
 if(person.suit){
  patch(torso,[[-.069,.552,.067],[.069,.552,.067],[.083,.274,.122],[-.083,.274,.122]],'#e8e7df');
  for(const side of [-1,1]){
   patch(torso,[[side*.062,.548,.069],[side*.131,.490,.103],[side*.052,.286,.135],[side*.018,.403,.135]],'#454b54');
   curve(torso,[[side*.064,.538,.075],[side*.123,.486,.108],[side*.052,.292,.138]],.0016,'#626570');
   patch(torso,[[side*.005,.545,.077],[side*.061,.545,.072],[side*.047,.475,.122],[side*.018,.497,.128]],'#f3f0e8');
  }
  if(person.tie)patch(torso,[[-.013,.514,.135],[-.016,.31,.140],[0,.282,.138],[.016,.31,.140]],'#202734');
  for(const y of [.20,.11])k.ell(torso,[.004,.004,.0015],[.011,y,.125],'#777b82',10);
 }else if(person.striped||person.jacket){
  for(const side of [-1,1])patch(torso,[[side*.007,.546,.071],[side*.062,.546,.069],[side*.073,.477,.119],[side*.028,.492,.126]],person.jacket?'#716c54':'#cedbeb');
  curve(torso,[[0,.04,.122],[0,.36,.129],[0,.531,.077]],.0015,person.jacket?'#a1a08c':'#e8e9ec');
  if(person.striped)for(const y of [.11,.22,.33,.43])k.ell(torso,[.0028,.0028,.0015],[.009,y,.133],'#ebe9e3',10);
 }else if(person.hair!=='scarf'){
  const seam=[];for(let i=0;i<=24;i++){const a=i/24*Math.PI*2;seam.push([.062*Math.sin(a),.550,.071*Math.cos(a)])}curve(torso,seam,.003,person.shirt);
 }
}
export function createHuman(k,person,seated=false){
 const root=new T.Group();root.name=person.name;root.userData.modelRevision='human-v2-2026-10-15';
 const pelvis=new T.Group();pelvis.name='Pelvis';root.add(pelvis);
 const torso=new T.Group();torso.name='Torso';pelvis.add(torso);
 const tunic=Boolean(person.tunic),shirt=shirtMaterial(person),hipWidth=tunic?.174:.157;
 const body=smoothLoft(k,torso,[{y:tunic?-.18:-.035,x:hipWidth,z:.114},{y:.018,x:.162,z:.121},{y:.15,x:.140,z:.105,fold:.0018},{y:.28,x:.165,z:.118},{y:.41,x:.193,z:.108},{y:.485,x:.198,z:.097},{y:.532,x:.124,z:.077},{y:.553,x:.062,z:.062}],person.shirt,36);
 body.name='Continuous tailored torso';if(shirt&&!k.voxel)body.material=shirt;
 smoothLoft(k,torso,[{y:.53,x:.044,z:.039},{y:.581,x:.044,z:.039},{y:.615,x:.049,z:.045}],person.skin,24).name='Neck';
 addClothing(k,torso,person);
 const head=makeHead(k,person);root.add(head);
 const arms=[],elbows=[],hands=[],legs=[],knees=[],feet=[],skins=[];
 for(const side of [-1,1]){
  const shoulder=new T.Bone();shoulder.name=side<0?'Right shoulder':'Left shoulder';shoulder.position.set(side*.192,.477,0);torso.add(shoulder);arms.push(shoulder);
  const elbow=new T.Bone();elbow.name='Elbow';elbow.position.y=-.275;shoulder.add(elbow);elbows.push(elbow);
  if(k.voxel){
   smoothLoft(k,shoulder,[{y:-.285,x:.043,z:.045},{y:-.12,x:.066,z:.058},{y:.021,x:.055,z:.049}],person.shirt,24);
   smoothLoft(k,elbow,[{y:-.265,x:.023,z:.026},{y:-.17,x:.040,z:.037},{y:.022,x:.043,z:.044}],person.shirt,24);
  }else continuousLimb(k,torso,[shoulder,elbow],[{y:-.543,x:.023,z:.026},{y:-.47,x:.030,z:.032},{y:-.39,x:.040,z:.037},{y:-.28,x:.044,z:.044},{y:-.20,x:.056,z:.052},{y:-.07,x:.067,z:.058},{y:.021,x:.062,z:.052}],person.shirt,[side*.192,.477,0],.275,skins,shirt).name='Continuous sleeve with elbow skinning';
  const wrist=new T.Group();wrist.name='Wrist';wrist.position.y=-.265;elbow.add(wrist);hands.push(makeHand(k,wrist,person,side));
  if(person.suit)smoothLoft(k,wrist,[{y:-.01,x:.023,z:.025},{y:.019,x:.023,z:.025}], '#e6e4dc',16);
  const thigh=new T.Bone();thigh.name='Hip joint';thigh.position.set(side*.086,-.015,0);pelvis.add(thigh);legs.push(thigh);
  const knee=new T.Bone();knee.name='Knee';knee.position.y=-.415;thigh.add(knee);knees.push(knee);
  if(k.voxel){
   smoothLoft(k,thigh,[{y:-.425,x:.064,z:.065},{y:-.23,x:.080,z:.082},{y:.025,x:.095,z:.100}],person.pants,28);
   smoothLoft(k,knee,[{y:-.385,x:.041,z:.045},{y:-.20,x:.059,z:.060},{y:.026,x:.064,z:.065}],person.pants,24);
  }else continuousLimb(k,pelvis,[thigh,knee],[{y:-.805,x:.041,z:.045},{y:-.72,x:.047,z:.051},{y:-.60,x:.058,z:.060},{y:-.43,x:.067,z:.069},{y:-.34,x:.073,z:.077},{y:-.17,x:.086,z:.090},{y:.025,x:.095,z:.100}],person.pants,[side*.086,-.015,0],.415,skins).name='Continuous trousers with knee skinning';
  const foot=new T.Group();foot.name='Ankle and shoe';foot.position.set(0,-.385,0);knee.add(foot);feet.push(foot);
  const color=person.suit?'#25282c':'#d7d7ce';
  smoothLoft(k,foot,[{y:-.108,x:.048,z:.122,cz:.05},{y:-.089,x:.055,z:.128,cz:.05},{y:-.053,x:.052,z:.116,cz:.048},{y:-.013,x:.036,z:.066,cz:.007},{y:.008,x:.030,z:.044}],color,28).name='Shaped leather shoe';
  smoothLoft(k,foot,[{y:-.111,x:.049,z:.123,cz:.05},{y:-.099,x:.052,z:.126,cz:.05}],person.suit?'#171c22':'#babdb8',28).name='Shoe sole';
  for(let i=0;i<3;i++)k.curve(foot,[[-.025,-.022-i*.009,.040+i*.013],[0,-.014-i*.009,.05+i*.013],[.025,-.022-i*.009,.040+i*.013]],.0016,person.suit?'#515158':'#f1eee6');
 }
 root.updateMatrixWorld(true);for(const item of skins)item.mesh.bind(new T.Skeleton(item.bones));
 function synchronize(){root.updateMatrixWorld(true);for(const {mesh} of skins){mesh.skeleton.update();mesh.boundingBox=null}}
 let amount=0;
 function pose(t){
  amount=clamp(t,0,1);pelvis.position.y=mix(.92,.535,amount);torso.rotation.x=.09*amount;
  head.position.set(0,pelvis.position.y+.588,.048*amount);head.rotation.x=.06*amount;
  for(let i=0;i<2;i++){
   const side=i===0?-1:1;arms[i].rotation.set(-.40*amount,0,side*mix(.085,.045,amount));elbows[i].rotation.x=mix(-.045,-1.32,amount);
   legs[i].rotation.x=-1.49*amount;knees[i].rotation.x=1.43*amount;feet[i].rotation.x=.06*amount;
  }
  synchronize();
 }
 function gait(phase,moving){
  pose(amount);if(!moving||amount>.05){root.position.y=0;return}
  for(let i=0;i<2;i++){const s=Math.sin(phase+i*Math.PI);legs[i].rotation.x=s*.28;knees[i].rotation.x=Math.max(0,-s)*.27;arms[i].rotation.x=-s*.19;elbows[i].rotation.x=-.10-Math.max(0,s)*.10}
  root.position.y=Math.abs(Math.sin(phase))*.010;synchronize();
 }
 function wave(t){
  const u=Math.sin(Math.PI*clamp(t,0,1));arms[1].rotation.z=-1.20*u;arms[1].rotation.x=-.22*u;elbows[1].rotation.x=-1.12*u;hands[1].rotation.z=.15*Math.sin(t*Math.PI*6)*u;
  if(u<.001)pose(amount);else synchronize();
 }
 root.userData.seated=seated;
 // Keep live rig references out of GLB metadata; geometry, bones and textures export normally.
 for(const [key,value] of Object.entries({head,arms,elbows,hands,legs,knees,feet,pose,gait,wave}))Object.defineProperty(root.userData,key,{value,writable:true,configurable:true,enumerable:false});
 pose(seated?1:0);return root;
}
