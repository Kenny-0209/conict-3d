import * as T from 'three';
import {loadRigAsset} from './rig-loader.js';

export const YOON_REVISION='yoon-shoulder-20261016';
// This asset belongs to m1 only. Keep a cached CPU template, but give each
// instance its own bones, geometry, materials and GPU textures for disposal.
const asset=typeof document==='undefined'?null:await loadRigAsset(new URL('./assets/yoon.glb',import.meta.url).href).catch(error=>{console.error('윤세빈 모델을 불러오지 못했습니다.',error);return null});
export function yoonAvatar(fallback,seated){return asset?createYoon(asset,seated):fallback()}

function cloneSkin(source){
 const copy=source.clone(true),lookup=new Map();
 function pair(a,b){lookup.set(a,b);a.children.forEach((n,i)=>pair(n,b.children[i]))}pair(source,copy);
 copy.traverse(n=>{
  if(n.geometry)n.geometry=n.geometry.clone();
  if(n.material){const clone=m=>{const c=m.clone();for(const k of Object.keys(c))if(c[k]?.isTexture)c[k]=c[k].clone();return c};n.material=Array.isArray(n.material)?n.material.map(clone):clone(n.material)}
 });
 source.traverse(n=>{if(n.isSkinnedMesh){const c=lookup.get(n);c.skeleton=n.skeleton.clone();c.skeleton.bones=n.skeleton.bones.map(b=>lookup.get(b));c.bindMatrix.copy(n.bindMatrix);c.bindMatrixInverse.copy(n.bindMatrixInverse);c.frustumCulled=false}});
 return copy;
}
export function createYoon(gltf,seated=false,{memberId='m1',name='윤세빈',revision=YOON_REVISION,rootName='YoonSebeen',idleAnimated=false,heightMeters}={}){
 const root=new T.Group();root.name=name;root.userData.modelRevision=revision;root.userData.memberId=memberId;root.userData.seated=seated;
 const body=cloneSkin(gltf.scene);root.add(body);body.traverse(n=>{if(n.isMesh){n.castShadow=true;n.receiveShadow=true}});
 const bones=new Map();body.traverse(n=>{if(n.isBone)bones.set(n.name.replace(/^mixamorig:?/,''),n)});
 const bone=n=>{const b=bones.get(n);if(!b)throw new Error('윤세빈 관절 누락: '+n);return b};
 const mixer=new T.AnimationMixer(body),actions={};
 for(const name of ['Idle','Seated','Walk']){const clip=gltf.animations.find(a=>a.name===name);if(!clip)throw new Error('윤세빈 동작 누락: '+name);const a=mixer.clipAction(clip);a.play();a.paused=true;actions[name]=a}
 const meta=body.getObjectByName(rootName)?.userData||{},duration=actions.Walk.getClip().duration;let stride=meta.walkStrideMeters,heightFit=null;
 if(!(stride>0))throw new Error('윤세빈 보폭 누락');
 const head=new T.Group();head.name='Head focus';root.add(head);
 const arms=['RightArm','LeftArm'].map(bone),elbows=['RightForeArm','LeftForeArm'].map(bone),hands=['RightHand','LeftHand'].map(bone),legs=['RightUpLeg','LeftUpLeg'].map(bone),knees=['RightLeg','LeftLeg'].map(bone),feet=['RightFoot','LeftFoot'].map(bone);
 let amount=seated?1:0,walkTime=0,walkWeight=0,lastPhase;
 // Paused actions skip writes for unchanged samples. Restore the last sampled
 // pose so procedural greetings/look/typing never accumulate into the rig.
 const sampled=[...bones.values()].map(b=>({b,p:b.position.clone(),q:b.quaternion.clone(),s:b.scale.clone()}));
 const Y=new T.Vector3(0,1,0),q=new T.Quaternion(),parentQ=new T.Quaternion();
 function sync(){root.updateMatrixWorld(true);body.traverse(n=>{if(n.isSkinnedMesh){n.skeleton.update();n.boundingBox=null;n.boundingSphere=null}});head.position.copy(root.worldToLocal(bone('Head').getWorldPosition(new T.Vector3())))}
 function base(sit=amount,walk=0){
  for(const v of sampled){v.b.position.copy(v.p);v.b.quaternion.copy(v.q);v.b.scale.copy(v.s)}
  actions.Idle.setEffectiveWeight((1-sit)*(1-walk));actions.Seated.setEffectiveWeight(sit);actions.Walk.setEffectiveWeight((1-sit)*walk);actions.Walk.time=walkTime%duration;
  mixer.update(0);for(const v of sampled){v.p.copy(v.b.position);v.q.copy(v.b.quaternion);v.s.copy(v.b.scale)}bone('Head').quaternion.multiply(q.setFromAxisAngle(Y,head.rotation.y));if(heightFit&&sit>.001)fitSeat(sit);sync();
 }
 function pose(t){amount=T.MathUtils.clamp(t,0,1);walkWeight=0;root.userData.seated=amount>.5;base();}
 function gait(phase,moving,distance){
  const dt=lastPhase===undefined?1/30:T.MathUtils.clamp((phase-lastPhase)/7,0,.1);lastPhase=phase;
  if(idleAnimated)actions.Idle.time=(phase/7)%actions.Idle.getClip().duration;
  if(amount>.05){base();return}
  if(moving){if(Number.isFinite(distance))walkTime+=Math.max(0,distance)/stride*duration;else walkTime=phase/(Math.PI*2)*duration}
  walkWeight=T.MathUtils.clamp(walkWeight+(moving?1:-1)*dt*6,0,1);base(0,walkWeight);
 }
 function rotateWorld(b,axis,angle){b.updateWorldMatrix(true,false);b.getWorldQuaternion(q);q.premultiply(new T.Quaternion().setFromAxisAngle(axis,angle));b.parent.getWorldQuaternion(parentQ);b.quaternion.copy(parentQ.invert().multiply(q));b.updateWorldMatrix(false,true)}
 function idle(t){actions.Idle.time=t%actions.Idle.getClip().duration;base();}
 function aimWorld(b,child,direction,weight){
  b.updateWorldMatrix(true,true);const from=child.getWorldPosition(new T.Vector3()).sub(b.getWorldPosition(new T.Vector3())).normalize();
  const turn=new T.Quaternion().slerp(new T.Quaternion().setFromUnitVectors(from,direction.normalize()),weight);
  b.getWorldQuaternion(q);q.premultiply(turn);b.parent.getWorldQuaternion(parentQ);b.quaternion.copy(parentQ.invert().multiply(q));b.updateWorldMatrix(false,true);
 }
 function fitSeat(sit){
  root.updateMatrixWorld(true);
  const targets=feet.map(b=>({p:b.getWorldPosition(new T.Vector3()),q:b.getWorldQuaternion(new T.Quaternion())})),hips=bone('Hips'),position=root.worldToLocal(hips.getWorldPosition(new T.Vector3()));position.y+=heightFit.seatLift*sit;hips.position.copy(hips.parent.worldToLocal(root.localToWorld(position)));root.updateMatrixWorld(true);
  const forward=new T.Vector3(0,0,1).applyQuaternion(root.getWorldQuaternion(new T.Quaternion()));
  for(let i=0;i<2;i++){
   const a=legs[i].getWorldPosition(new T.Vector3()),b=knees[i].getWorldPosition(new T.Vector3()),c=feet[i].getWorldPosition(new T.Vector3()),upper=a.distanceTo(b),lower=b.distanceTo(c),dir=targets[i].p.clone().sub(a),reach=T.MathUtils.clamp(dir.length(),Math.abs(upper-lower)+.001,upper+lower-.001);dir.normalize();
   const bend=forward.clone().addScaledVector(dir,-forward.dot(dir)).normalize(),along=(upper*upper-lower*lower+reach*reach)/(2*reach),height=Math.sqrt(Math.max(0,upper*upper-along*along)),joint=a.clone().addScaledVector(dir,along).addScaledVector(bend,height),ankle=a.clone().addScaledVector(dir,reach);
   aimWorld(legs[i],knees[i],joint.clone().sub(a),1);aimWorld(knees[i],feet[i],ankle.sub(joint),1);const parent=feet[i].parent.getWorldQuaternion(new T.Quaternion());feet[i].quaternion.copy(parent.invert().multiply(targets[i].q));
  }
 }
 function wave(t){base();const u=Math.sin(Math.PI*T.MathUtils.clamp(t,0,1));if(u>.001){const facing=root.getWorldQuaternion(new T.Quaternion()),up=Y.clone().applyQuaternion(facing);aimWorld(arms[0],elbows[0],new T.Vector3(-1,-.12,.08).applyQuaternion(facing),u);aimWorld(elbows[0],hands[0],new T.Vector3(.06,1,.04).applyQuaternion(facing),u);rotateWorld(hands[0],up,.15*Math.sin(t*Math.PI*6)*u);sync()}}
 // Retarget the authored seated pose to the actual keyboard (desk-local
 // [-.10,.81,.205], avatar at z=.85 facing -Z). Store bone rotations only;
 // each frame restores this pose before adding key presses, so nothing drifts.
 let workPose=null,workHands=[];
 const workX=new T.Vector3(1,0,0),workQ=new T.Quaternion();
 function buildWorkPose(){
  const previous=amount;amount=1;base();
  const facing=root.getWorldQuaternion(new T.Quaternion()),axis=workX.clone().applyQuaternion(facing);
  rotateWorld(bone('Spine'),axis,.10);
  for(let i=0;i<2;i++){
   const side=i===0?-1:1,shoulder=arms[i],elbow=elbows[i],hand=hands[i];
   const a=shoulder.getWorldPosition(new T.Vector3()),b=elbow.getWorldPosition(new T.Vector3()),c=hand.getWorldPosition(new T.Vector3());
   const upper=a.distanceTo(b),lower=b.distanceTo(c),target=root.localToWorld(new T.Vector3(.10+side*.12,.895,.47));
   const direction=target.clone().sub(a),reach=T.MathUtils.clamp(direction.length(),Math.abs(upper-lower)+.001,upper+lower-.002);direction.normalize();
   const bend=new T.Vector3(side*.8,-.55,-.12).applyQuaternion(facing);bend.addScaledVector(direction,-bend.dot(direction)).normalize();
   const along=(upper*upper-lower*lower+reach*reach)/(2*reach),height=Math.sqrt(Math.max(0,upper*upper-along*along));
   const joint=a.clone().addScaledVector(direction,along).addScaledVector(bend,height),wrist=a.clone().addScaledVector(direction,reach);
   aimWorld(shoulder,elbow,joint.clone().sub(a),1);aimWorld(elbow,hand,wrist.sub(joint),1);
   const prefix=i===0?'Right':'Left',index=bone(prefix+'HandIndex1');
   aimWorld(hand,index,new T.Vector3(-side*.08,-.07,1).applyQuaternion(facing),1);
   for(const [f,spread] of [['Index',-.06],['Middle',0],['Ring',.04],['Pinky',.10],['Thumb',-.30]]){
    for(let j=1;j<=3;j++){const n=bones.get(prefix+'Hand'+f+j),child=bones.get(prefix+'Hand'+f+(j+1));if(n&&child)aimWorld(n,child,new T.Vector3(side*spread,-[.10,.32,.60][j-1],1).applyQuaternion(facing),1)}
   }
  }
  sync();workPose=new Map([...bones.values()].map(b=>[b,b.quaternion.clone()]));
  const down=new T.Vector3(0,-1,0).applyQuaternion(facing);
  const bendAxis=(n,child)=>{const direction=child.getWorldPosition(new T.Vector3()).sub(n.getWorldPosition(new T.Vector3())).normalize();return direction.cross(down).normalize().applyQuaternion(n.getWorldQuaternion(new T.Quaternion()).invert())};
  workHands=hands.map((hand,i)=>{
   const prefix=i===0?'Right':'Left',fingers=[];
   for(const [f,delay] of [['Index',0],['Middle',1.7],['Ring',3.2],['Pinky',4.4],['Thumb',2.5]])for(let j=1;j<=3;j++){
    const n=bones.get(prefix+'Hand'+f+j),child=bones.get(prefix+'Hand'+f+(j+1));if(n&&child)fingers.push({n,axis:bendAxis(n,child),delay,amplitude:f==='Thumb'?.07:j===1?.13:.19});
   }
   return {elbow:elbows[i],elbowAxis:bendAxis(elbows[i],hand),hand,handAxis:bendAxis(hand,bone(prefix+'HandIndex1')),fingers};
  });
  amount=previous;base();
 }
 function updateWork(t){
  if(amount<.99)return;
  if(!workPose)buildWorkPose();base();for(const [b,rotation] of workPose)b.quaternion.copy(rotation);
  const seconds=t/1000,offset=Number(memberId.slice(1))*.73;
  for(let i=0;i<2;i++){
   const phase=seconds*7.8+offset+i*2.1,work=workHands[i];
   // Small forearm lifts and wrist rocking make the work readable at room scale.
   work.elbow.quaternion.multiply(workQ.setFromAxisAngle(work.elbowAxis,Math.sin(phase)*.035));
   work.hand.quaternion.multiply(workQ.setFromAxisAngle(work.handAxis,Math.sin(phase+.6)*.065));
   for(const finger of work.fingers){
    const tap=Math.max(0,Math.sin(seconds*13+offset+i*2.4+finger.delay))**3;
    finger.n.quaternion.multiply(workQ.setFromAxisAngle(finger.axis,tap*finger.amplitude));
   }
  }
  sync();
 }
 if(Number.isFinite(heightMeters)&&heightMeters>0){
  const previous=amount;pose(0);const bounds=new T.Box3().setFromObject(root,true),ratio=heightMeters/(bounds.max.y-bounds.min.y);base(1);const seatedHipY=root.worldToLocal(bone('Hips').getWorldPosition(new T.Vector3())).y;base(0);body.scale.multiplyScalar(ratio);body.position.y-=bounds.min.y*ratio;stride*=ratio;heightFit={seatLift:seatedHipY*(1-ratio)};pose(previous);
 }
 for(const [key,value] of Object.entries({head,arms,elbows,hands,legs,knees,feet,pose,gait,wave,updateWork,mixer,walkDuration:duration,walkStride:stride,bones,...(idleAnimated?{idle,idleDuration:actions.Idle.getClip().duration}:{})}))Object.defineProperty(root.userData,key,{value,enumerable:false});
 pose(amount);return root;
}
