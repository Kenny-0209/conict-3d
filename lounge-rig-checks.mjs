import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import * as T from './dist/vendor/three.module.js';
import {GLTFLoader} from './dist/vendor/GLTFLoader.js';
import {createYoon} from './dist/yoon.js';
import {createLoungeRig,coffeeSip,COFFEE_CYCLE_SECONDS} from './dist/lounge-rig.js';

const loader=new GLTFLoader();loader.register(parser=>({name:'HeadlessTexture',loadTexture:i=>{const t=new T.Texture();parser.associations.set(t,{textures:i});return Promise.resolve(t)}}));
const results=[];
// Independent timing requirements: touch upright, sip, straighten, leave upright.
for(let t=0;t<24;t+=.02){const m=coffeeSip(t);assert(m.tilt>=0&&m.tilt<=.4);if(m.tilt>.001)assert(m.contact>.999,'never tilt before contact or while leaving');if(m.lift<.999)assert.equal(m.tilt,0,'lift and lower upright')}
assert.equal(coffeeSip(3.8).tilt,0);assert(coffeeSip(4.9).tilt>.3);assert.equal(coffeeSip(6).tilt,0);assert.equal(coffeeSip(8.5).lift,0);
for(const [id,file,rootName] of [['m1','yoon','YoonSebeen'],['m2','lee','LeeSangmin'],...Array.from({length:6},(_,i)=>['m'+(i+3),'m'+(i+3),'Member_m'+(i+3)])]){
 const bytes=await readFile(new URL('./dist/assets/'+file+'.glb',import.meta.url)),asset=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 const body=createYoon(asset,false,{memberId:id,rootName,heightMeters:id==='m5'?1.6:undefined}),rig=createLoungeRig(body),d=body.userData;
 body.rotation.y=.73;body.position.set(.18,0,-3.37);d.pose(1);body.updateMatrixWorld(true);
 const feet=d.feet.map(f=>f.getWorldPosition(new T.Vector3())),neutralWrist=d.hands[0].quaternion.clone();
 for(const t of [0,.5,1,2,3,5,8]){
  rig.animate('rest',t,{hasCoffee:true});body.updateMatrixWorld(true);
  body.traverse(n=>assert(n.matrixWorld.elements.every(Number.isFinite),id+' finite rest pose'));
  d.feet.forEach((f,i)=>assert(f.getWorldPosition(new T.Vector3()).distanceTo(feet[i])<1e-5,id+' seated feet stay planted'));
 }
 rig.animate('rest',2,{hasCoffee:true});const at=d.hands[0].getWorldPosition(new T.Vector3());
 for(let i=0;i<15;i++)rig.animate('rest',2,{hasCoffee:true});assert(d.hands[0].getWorldPosition(new T.Vector3()).distanceTo(at)<1e-5,id+' sips do not drift');
 rig.animate('rest',0);const lap=d.hands.map(h=>body.worldToLocal(h.getWorldPosition(new T.Vector3())).y);assert(lap.every(y=>y>.55&&y<.80),id+' hands rest on the lap');
 rig.animate('rest',0,{relax:0});const upright=body.worldToLocal(d.bones.get('Neck').getWorldPosition(new T.Vector3()));
 rig.animate('rest',0);const reclined=body.worldToLocal(d.bones.get('Neck').getWorldPosition(new T.Vector3())),backShift=upright.z-reclined.z;assert(backShift>.045,id+' rest must lean back toward the sofa cushion');
 const hip=body.worldToLocal(d.bones.get('Hips').getWorldPosition(new T.Vector3())).y;
 for(const hand of d.hands){const p=body.worldToLocal(hand.getWorldPosition(new T.Vector3()));assert(p.z>.20&&p.z<.27&&p.y<hip+.16,id+' relaxed hands must lower toward the thighs without locking the elbows')}
 rig.animate('rest',0,{hasCoffee:true});const lapCup=body.worldToLocal(rig.cup.getWorldPosition(new T.Vector3()));assert(lapCup.y<hip+.22,id+' while resting, the cup must lower near the lap');
 let previousNeck=null;for(let i=0;i<=20;i++){rig.animate('rest',0,{hasCoffee:true,relax:1-i/20});const p=d.bones.get('Neck').getWorldPosition(new T.Vector3());if(previousNeck)assert(p.distanceTo(previousNeck)<.02,id+' unwind before standing must stay smooth');previousNeck=p}
 const tools=new T.Group(),kettle=new T.Group();tools.position.set(.18,.78,-3.87);tools.add(kettle);kettle.position.set(-.2,.314,.015);kettle.rotation.z=-.4;
 body.rotation.y=Math.PI;rig.animate('brew',3,{slot:{kettle}});body.traverse(n=>assert(n.matrixWorld.elements.every(Number.isFinite),id+' finite brew pose'));
 const handle=kettle.localToWorld(new T.Vector3(-.115,.1,0)),reachError=d.hands[1].getWorldPosition(new T.Vector3()).distanceTo(handle);assert(reachError<.12,id+' must reach the kettle handle');
 d.pose(0);d.gait(1,true,.03);rig.carry();assert(rig.cup.visible);rig.clear();assert(!rig.cup.visible);d.pose(1);d.updateWork(1000);
 let maxGripGap=0,maxMouthGap=0,maxCupSpeed=0,maxWristStep=0,minFingerWallGap=Infinity,maxWristJoint=0,maxHandBend=0;
 for(const mode of ['rest','drink']){
  let previous=null;rig.animate(mode,0,{hasCoffee:true});
  const planted=d.feet.map(f=>f.getWorldPosition(new T.Vector3()));
  for(let frame=0;frame<=COFFEE_CYCLE_SECONDS/.05;frame++){
   const t=frame*.05;rig.animate(mode,t,{hasCoffee:true});
   const gripGap=rig.gripPoint().distanceTo(rig.cup.localToWorld(rig.gripAnchor.clone()));maxGripGap=Math.max(maxGripGap,gripGap);assert(gripGap<1e-5,id+' cup must stay in the palm');
   const p=rig.cup.getWorldPosition(new T.Vector3()),q=d.hands[0].getWorldQuaternion(new T.Quaternion());
   if(previous){const speed=p.distanceTo(previous.p)/.05;maxCupSpeed=Math.max(maxCupSpeed,speed);assert(speed<1.2,id+' cup must rise and lower smoothly');const angle=q.angleTo(previous.q);maxWristStep=Math.max(maxWristStep,angle);assert(angle<.25,id+' wrist must not flip between samples')}
   maxWristJoint=Math.max(maxWristJoint,d.hands[0].quaternion.angleTo(neutralWrist));
   const shoulder=d.arms[0].getWorldPosition(new T.Vector3()),elbow=d.elbows[0].getWorldPosition(new T.Vector3());assert(elbow.y<shoulder.y+.025,id+' elbow must stay below the shoulder');
   const wrist=d.hands[0].getWorldPosition(new T.Vector3()),long=d.bones.get('RightHandMiddle1').getWorldPosition(new T.Vector3()).sub(wrist),forearm=wrist.clone().sub(elbow),bend=long.angleTo(forearm);maxHandBend=Math.max(maxHandBend,bend);assert(bend<10*Math.PI/180,id+' '+mode+' '+t+' wrist bends '+(bend*180/Math.PI)+' degrees; require a straight wrist through lifting and mouth contact');
   const palmLong=long.clone().normalize(),across=d.bones.get('RightHandPinky1').getWorldPosition(new T.Vector3()).sub(d.bones.get('RightHandIndex1').getWorldPosition(new T.Vector3())).normalize(),palmNormal=palmLong.clone().cross(across).normalize();
   for(const finger of ['Index','Middle','Ring','Pinky']){let previousAngle=0;for(let j=1;j<=3;j++){const direction=d.bones.get('RightHand'+finger+(j+1)).getWorldPosition(new T.Vector3()).sub(d.bones.get('RightHand'+finger+j).getWorldPosition(new T.Vector3())).normalize();let angle=Math.atan2(direction.dot(palmNormal),direction.dot(palmLong));if(angle<0)angle+=Math.PI*2;const flexion=angle-previousAngle;assert(flexion>0&&flexion<1.8,id+' fingers must curl toward the palm without backward bending');previousAngle=angle}}
   for(const finger of ['Index','Middle','Ring','Pinky','Thumb'])for(const j of [1,2,3]){
    const a=rig.cup.worldToLocal(d.bones.get('RightHand'+finger+j).getWorldPosition(new T.Vector3())),b=rig.cup.worldToLocal(d.bones.get('RightHand'+finger+(j+1)).getWorldPosition(new T.Vector3()));
    for(const fraction of [0,.25,.5,.75,1]){
     const p=a.clone().lerp(b,fraction);
     if(p.y>-.0475&&p.y<.0475){const radius=.034+.009*(p.y+.0475)/.095,gap=Math.hypot(p.x,p.z)-radius;minFingerWallGap=Math.min(minFingerWallGap,gap);assert(gap>.006,id+' '+finger+j+' segment must leave room for the finger pad outside the cup: '+gap)}
    }
   }
   if(coffeeSip(t).contact>.999){
    const gap=rig.mouthPoint().distanceTo(rig.cup.localToWorld(rig.lipAnchor.clone()));maxMouthGap=Math.max(maxMouthGap,gap);assert(gap<.012,id+' cup rim must reach the mouth');
    const top=d.bones.get('HeadTop_End').getWorldPosition(new T.Vector3()).y;
    for(const finger of ['Index','Middle','Ring','Pinky'])assert(d.bones.get('RightHand'+finger+'4').getWorldPosition(new T.Vector3()).y<top-.04,id+' fingers must grip below the face, not point over the head');
   }
   d.feet.forEach((f,i)=>assert(f.getWorldPosition(new T.Vector3()).distanceTo(planted[i])<1e-5));previous={p,q};
  }
 }
 for(const yaw of [0,.73,Math.PI]){body.rotation.y=yaw;rig.animate('rest',4.9,{hasCoffee:true});assert(rig.mouthPoint().distanceTo(rig.cup.localToWorld(rig.lipAnchor.clone()))<.012,id+' sipping must work in every facing direction')}
 let previousHeight;
 for(let i=0;i<=40;i++){d.pose(i/40);rig.carry(i/40);const y=body.worldToLocal(rig.cup.getWorldPosition(new T.Vector3())).y;if(previousHeight!==undefined)assert(Math.abs(y-previousHeight)<.04,id+' sitting with a cup must not pop to a fixed standing hand height');previousHeight=y}
 results.push({id,lapHandY:lap.map(y=>Number(y.toFixed(3))),restBackShiftM:backShift,restCupHeightM:lapCup.y,kettleReachErrorM:Number(reachError.toFixed(4)),maxGripGapM:maxGripGap,maxMouthGapM:maxMouthGap,maxCupSpeedMps:maxCupSpeed,maxWristStepRad:maxWristStep,minFingerWallGapM:minFingerWallGap,maxWristJointRad:maxWristJoint,maxHandBendDegrees:maxHandBend*180/Math.PI,restSipBrewCarryAndWork:true});
 const geometries=new Set(),materials=new Set();for(const source of [asset.scene,body])source.traverse(n=>{if(n.geometry)geometries.add(n.geometry);for(const m of Array.isArray(n.material)?n.material:n.material?[n.material]:[])materials.add(m)});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());
}
const result={status:'PASS',actualModels:results};if(process.argv[2])await writeFile(process.argv[2],JSON.stringify(result,null,2));console.log(JSON.stringify(result));
