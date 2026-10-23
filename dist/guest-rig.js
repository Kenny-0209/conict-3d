import * as T from './vendor/three.module.js';

export const GUEST_REVISION='quaternius-casual2-20261016';
function cloneModel(source){
 const copy=source.clone(true),nodes=new Map();
 const pair=(a,b)=>{nodes.set(a,b);a.children.forEach((n,i)=>pair(n,b.children[i]))};pair(source,copy);
 source.traverse(n=>{
  const c=nodes.get(n);
  if(n.geometry)c.geometry=n.geometry.clone();
  if(n.material)c.material=Array.isArray(n.material)?n.material.map(m=>m.clone()):n.material.clone();
  if(n.isSkinnedMesh){c.skeleton=n.skeleton.clone();c.skeleton.bones=n.skeleton.bones.map(b=>nodes.get(b));c.bindMatrix.copy(n.bindMatrix);c.bindMatrixInverse.copy(n.bindMatrixInverse);c.frustumCulled=false}
 });return copy;
}
export function createGuestRig(gltf){
 const root=new T.Group(),body=new T.Group(),model=cloneModel(gltf.scene);root.name='Visitor';body.name='Guest · Quaternius Casual 2';root.add(body);body.add(model);
 const bones=new Map();model.traverse(n=>{if(n.isBone)bones.set(n.name,n);if(n.isMesh){n.castShadow=false;n.receiveShadow=false}});
 const bone=name=>{const n=bones.get(name);if(!n)throw new Error('손님 관절 누락: '+name);return n};
 const mixer=new T.AnimationMixer(model),actions={};
 for(const name of ['Idle_Neutral','Walk','Wave']){const clip=gltf.animations.find(c=>c.name===name);if(!clip)throw new Error('손님 동작 누락: '+name);const action=mixer.clipAction(clip).play();action.paused=true;action.setEffectiveWeight(name==='Idle_Neutral'?1:0);actions[name]=action}mixer.update(0);
 root.updateMatrixWorld(true);
 const box=new T.Box3().setFromObject(model,true),scale=1.80/(box.max.y-box.min.y);model.scale.multiplyScalar(scale);model.position.set(-(box.min.x+box.max.x)*.5*scale,-box.min.y*scale,0);
 const nodes=[];model.traverse(n=>nodes.push(n));
 const capture=()=>nodes.map(n=>({p:n.position.clone(),q:n.quaternion.clone(),s:n.scale.clone()}));
 const restore=values=>nodes.forEach((n,i)=>{n.position.copy(values[i].p);n.quaternion.copy(values[i].q);n.scale.copy(values[i].s)});
 let sampled=capture(),amount=0;
 const head=new T.Group();head.name='Guest head focus';body.add(head);
 function sync(){root.updateMatrixWorld(true);model.traverse(n=>{if(n.isSkinnedMesh){n.skeleton.update();n.boundingBox=null;n.boundingSphere=null}});head.position.copy(body.worldToLocal(bone('Head').getWorldPosition(new T.Vector3())))}
 function sample(name,time){restore(sampled);for(const [key,a] of Object.entries(actions)){a.setEffectiveWeight(key===name?1:0);if(key===name)a.time=time}mixer.update(0);sampled=capture();sync()}
 sample('Idle_Neutral',0);const standing=capture();
 const point=n=>n.getWorldPosition(new T.Vector3());
 function aimAxis(n,localAxis,target){n.updateWorldMatrix(true,false);const q=n.getWorldQuaternion(new T.Quaternion()),from=localAxis.clone().applyQuaternion(q).normalize(),turn=new T.Quaternion().setFromUnitVectors(from,target.clone().normalize());q.premultiply(turn);const parent=n.parent.getWorldQuaternion(new T.Quaternion());n.quaternion.copy(parent.invert().multiply(q));n.updateWorldMatrix(false,true)}
 const axisBetween=(n,child)=>point(child).sub(point(n)).normalize().applyQuaternion(n.getWorldQuaternion(new T.Quaternion()).invert());
 const sides=['R','L'],arms=sides.map(s=>bone('UpperArm'+s)),elbows=sides.map(s=>bone('LowerArm'+s)),hands=sides.map(s=>bone('Wrist'+s)),legs=sides.map(s=>bone('UpperLeg'+s)),knees=sides.map(s=>bone('LowerLeg'+s)),feet=sides.map(s=>bone('Foot'+s));
 const lowerAxes=knees.map((n,i)=>axisBetween(n,feet[i])),lowerLengths=knees.map((n,i)=>point(n).distanceTo(point(feet[i]))),footQ=feet.map(n=>n.getWorldQuaternion(new T.Quaternion()));
 const thighLength=point(legs[0]).distanceTo(point(knees[0])),seatDrop=point(legs[0]).y-new T.Vector3(0,.055,1).normalize().y*thighLength-new T.Vector3(0,1,.015).normalize().y*lowerLengths[0]-point(feet[0]).y;
 const pelvis=bone('Body'),shift=new T.Vector3(0,-seatDrop,.055).applyQuaternion(pelvis.parent.getWorldQuaternion(new T.Quaternion()).invert());shift.divide(pelvis.parent.getWorldScale(new T.Vector3()));pelvis.position.add(shift);sync();
 // This rig uses independent foot controls, so move both those controls and
 // the skinned leg chain when fitting the visitor to a 50 cm chair.
 for(let i=0;i<2;i++){
  aimAxis(legs[i],axisBetween(legs[i],knees[i]),new T.Vector3(0,-.055,1));
  aimAxis(knees[i],lowerAxes[i],new T.Vector3(0,-1,.015));
  const ankle=point(knees[i]).add(new T.Vector3(0,-1,.015).normalize().multiplyScalar(lowerLengths[i]));feet[i].position.copy(feet[i].parent.worldToLocal(ankle));
  const parent=feet[i].parent.getWorldQuaternion(new T.Quaternion());feet[i].quaternion.copy(parent.invert().multiply(footQ[i]));
  const a=point(arms[i]),b=point(elbows[i]),c=point(hands[i]),upper=a.distanceTo(b),lower=b.distanceTo(c),target=new T.Vector3(i===0?-.055:.20,.87,.46),dir=target.sub(a),reach=T.MathUtils.clamp(dir.length(),Math.abs(upper-lower)+.001,upper+lower-.002);dir.normalize();
  const bend=new T.Vector3(i===0?-.8:.8,-.5,-.1);bend.addScaledVector(dir,-bend.dot(dir)).normalize();const along=(upper*upper-lower*lower+reach*reach)/(2*reach),height=Math.sqrt(Math.max(0,upper*upper-along*along)),joint=a.clone().addScaledVector(dir,along).addScaledVector(bend,height),wrist=a.clone().addScaledVector(dir,reach);
  aimAxis(arms[i],axisBetween(arms[i],elbows[i]),joint.clone().sub(a));aimAxis(elbows[i],axisBetween(elbows[i],hands[i]),wrist.sub(joint));aimAxis(hands[i],axisBetween(hands[i],bone('Index1'+sides[i])),new T.Vector3(0,-.10,1));
 }
 sync();const sitting=capture();restore(standing);sync();
 function pose(t){amount=T.MathUtils.clamp(t,0,1);body.userData.seated=amount>.5;nodes.forEach((n,i)=>{n.position.lerpVectors(standing[i].p,sitting[i].p,amount);n.quaternion.slerpQuaternions(standing[i].q,sitting[i].q,amount);n.scale.lerpVectors(standing[i].s,sitting[i].s,amount)});sync()}
 function gait(phase,moving){if(amount>.05){pose(amount);return}sample(moving?'Walk':'Idle_Neutral',moving?(phase/(2*Math.PI)*actions.Walk.getClip().duration)%actions.Walk.getClip().duration:0)}
 const upperBones=[];bone('Abdomen').traverse(n=>{if(n.isBone)upperBones.push(n)});
 function wave(t){const u=Math.sin(Math.PI*T.MathUtils.clamp(t,0,1));pose(amount);if(u<.001)return;const base=upperBones.map(n=>n.quaternion.clone());sample('Wave',T.MathUtils.clamp(t,0,1)*actions.Wave.getClip().duration);const target=upperBones.map(n=>n.quaternion.clone());pose(amount);upperBones.forEach((n,i)=>n.quaternion.slerpQuaternions(base[i],target[i],u));sync()}
 const rig={head,arms,elbows,hands,legs,knees,feet,pose,gait,wave,bones,modelRevision:GUEST_REVISION,source:'Quaternius · Ultimate Modular Men · Casual_2',license:'CC0-1.0'};
 for(const [key,value] of Object.entries(rig))Object.defineProperty(body.userData,key,{value,enumerable:typeof value==='string'});
 pose(0);return {root,body,pose,gait,wave};
}
