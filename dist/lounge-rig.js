import * as T from './vendor/three.module.js';
import {createTorsoEnvelope} from './lounge-body.js';

const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),smooth=t=>{t=T.MathUtils.clamp(t,0,1);return t*t*t*(t*(t*6-15)+10)};
export const COFFEE_CYCLE_SECONDS=12;
export function coffeeSip(t){
 const p=((t%COFFEE_CYCLE_SECONDS)+COFFEE_CYCLE_SECONDS)%COFFEE_CYCLE_SECONDS;
 // Reach the lips upright, sip around the rim, then straighten before leaving.
 const lift=p<1.5?0:p<3.1?smooth((p-1.5)/1.6):p<6.5?1:p<8.4?1-smooth((p-6.5)/1.9):0;
 const contact=p<3.1?0:p<3.65?smooth((p-3.1)/.55):p<6.05?1:p<6.5?1-smooth((p-6.05)/.45):0;
 const tilt=p<3.9?0:p<4.7?.38*smooth((p-3.9)/.8):p<5.2?.38:p<5.95?.38*(1-smooth((p-5.2)/.75)):0;
 const phase=p<1.5||p>=8.4?'hold':p<3.1?'lift':p<3.9?'touch':p<5.2?'sip':p<6.05?'straighten':p<6.5?'leave':'lower';
 return {lift,contact,tilt,phase};
}
function frameQuaternion(long,across){
 long=long.clone().normalize();across=across.clone().addScaledVector(long,-across.dot(long)).normalize();
 return new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(long,across,long.clone().cross(across).normalize()));
}

// Solve the cup and anatomical palm together. Imported wrist axes vary per rig.
export function createLoungeRig(root){
 const data=root.userData,cup=new T.Group();cup.name='Lounge coffee cup';cup.visible=false;
 const ceramic=new T.MeshStandardMaterial({color:'#f0e9db',roughness:.65,side:T.DoubleSide}),coffee=new T.MeshStandardMaterial({color:'#634332',roughness:.4});
 cup.add(new T.Mesh(new T.CylinderGeometry(.043,.034,.095,32,1,true),ceramic));
 const bottom=new T.Mesh(new T.CircleGeometry(.034,32),ceramic);bottom.rotation.x=Math.PI/2;bottom.position.y=-.0475;cup.add(bottom);
 const rim=new T.Mesh(new T.RingGeometry(.038,.043,32),ceramic);rim.rotation.x=-Math.PI/2;rim.position.y=.0475;cup.add(rim);
 const top=new T.Mesh(new T.CylinderGeometry(.037,.037,.002,32),coffee);top.position.y=.033;cup.add(top);
 // The wider draped sleeve needs the handle turned slightly forward.
 const cupYaw=new T.Quaternion().setFromAxisAngle(V(0,1,0),data.memberId==='m5'?.30:0),gripAnchor=V(-.066,.008,0),palmAnchor=V(-.102,0,.060),lipAnchor=V(0,.0475,-.039).applyQuaternion(cupYaw.clone().invert()),handleCentre=V(-.066,0,0);
 const handle=new T.Mesh(new T.TorusGeometry(.027,.005,12,32),ceramic);handle.name='Coffee mug handle';handle.position.copy(handleCentre);handle.scale.x=.90;cup.add(handle);root.add(cup);
 const arms=data.arms||[],elbows=data.elbows||[],hands=data.hands||[],bones=data.bones;
 root.updateMatrixWorld(true);
 const torso=createTorsoEnvelope(root);let armClearance=null;
 const frames=hands.map((hand,i)=>{
  const prefix=i===0?'Right':'Left',local=n=>hand.worldToLocal(bones.get(prefix+'Hand'+n).getWorldPosition(V()));
  if(bones?.has(prefix+'HandMiddle1')){
   const index=local('Index1'),middle=local('Middle1'),pinky=local('Pinky1');
   return {inverse:frameQuaternion(middle,pinky.clone().sub(index)).invert(),grip:middle.clone().multiplyScalar(.88),rest:hand.quaternion.clone(),prefix};
  }
  return {inverse:frameQuaternion(V(0,-1,0),V(i===0?-1:1,0,0)).invert(),grip:V(0,-.065,.006),prefix:null};
 });
 const head=bones?.get('Head'),headTop=bones?.get('HeadTop_End');let mouthLocal=null;
 if(head&&headTop){
  const h=head.getWorldPosition(V()),up=headTop.getWorldPosition(V()).sub(h),length=up.length();up.normalize();
  const forward=V(0,0,1).applyQuaternion(root.getWorldQuaternion(new T.Quaternion()));forward.addScaledVector(up,-forward.dot(up)).normalize();
  const lipHeight={m2:.008,m3:.014,m4:.012,m5:.010}[data.memberId]||0,vertical=V(0,1,0).applyQuaternion(root.getWorldQuaternion(new T.Quaternion()));
  mouthLocal=head.worldToLocal(h.clone().addScaledVector(up,length*.12).addScaledVector(forward,length*.43).addScaledVector(vertical,lipHeight));
 }
 function mouthPoint(){root.updateMatrixWorld(true);return mouthLocal?head.localToWorld(mouthLocal.clone()):data.head?data.head.localToWorld(V(0,.10,.10)):root.localToWorld(V(0,1.65,.12))}
 function hipY(){const hip=bones?.get('Hips'),joint=hip||data.legs?.[0];return joint?root.worldToLocal(joint.getWorldPosition(V())).y+(hip?0:.015):data.seated?.535:.92}
 function sync(){root.updateMatrixWorld(true);root.traverse(n=>{if(n.isSkinnedMesh){n.skeleton.update();n.boundingBox=null;n.boundingSphere=null}})}
 function aim(b,child,direction){
  if(!b||!child||direction.lengthSq()<1e-9)return;
  b.updateWorldMatrix(true,true);
  const from=child.getWorldPosition(V()).sub(b.getWorldPosition(V())).normalize(),q=b.getWorldQuaternion(new T.Quaternion());
  q.premultiply(new T.Quaternion().setFromUnitVectors(from,direction.normalize()));
  b.quaternion.copy(b.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(q));b.updateWorldMatrix(false,true);
 }
 function reach(i,target,bendHint=null){
  if(!arms[i]||!elbows[i]||!hands[i])return;
  root.updateMatrixWorld(true);
  const a=arms[i].getWorldPosition(V()),b=elbows[i].getWorldPosition(V()),c=hands[i].getWorldPosition(V());
  const upper=a.distanceTo(b),lower=b.distanceTo(c);if(upper<.001||lower<.001)return;
  const direction=target.clone().sub(a),length=direction.length();if(length<.001)return;direction.normalize();
  const distance=T.MathUtils.clamp(length,Math.abs(upper-lower)+.001,upper+lower-.002);
  const bend=(bendHint||V(i===0?-.22:.22,-1,.35)).clone().applyQuaternion(root.getWorldQuaternion(new T.Quaternion()));bend.addScaledVector(direction,-bend.dot(direction)).normalize();
  const along=(upper*upper-lower*lower+distance*distance)/(2*distance),height=Math.sqrt(Math.max(0,upper*upper-along*along));
  let joint=a.clone().addScaledVector(direction,along).addScaledVector(bend,height);const wrist=a.clone().addScaledVector(direction,distance);
  if(bendHint&&torso){
   const natural=joint.clone(),around=direction.clone().cross(bend).normalize(),currentAxis=b.clone().sub(a).normalize(),currentQ=arms[i].getWorldQuaternion(new T.Quaternion()),scale=arms[i].getWorldScale(V());let best={score:Infinity};
   function evaluate(angle){
    const e=a.clone().addScaledVector(direction,along).addScaledVector(bend,Math.cos(angle)*height).addScaledVector(around,Math.sin(angle)*height);let upperGap;
    const cloud=torso.upperClouds[i];if(cloud.length){const q=currentQ.clone().premultiply(new T.Quaternion().setFromUnitVectors(currentAxis,e.clone().sub(a).normalize())),matrix=new T.Matrix4().compose(a,q,scale);upperGap=Infinity;for(const p of cloud)upperGap=Math.min(upperGap,torso.clearance(p.clone().applyMatrix4(matrix)))}else upperGap=torso.segment(a,e,torso.radius[0],.55);
    const gap=torso.segment(e,wrist,torso.radius[1]),score=10000*(Math.max(0,(i===0?.014:.020)-upperGap)+Math.max(0,.012-gap))+e.distanceTo(natural);
    if(score<best.score)best={score,angle,e};
   }
   for(let j=0;j<32;j++)evaluate(j*Math.PI/16);let step=Math.PI/16;for(let j=0;j<6;j++){const angle=best.angle;step/=2;evaluate(angle-step);evaluate(angle+step)}joint=best.e;
  }
  aim(arms[i],elbows[i],joint.sub(a));aim(elbows[i],hands[i],wrist.sub(elbows[i].getWorldPosition(V())));
 }
 function orientHand(i,worldQ){const h=hands[i];if(!h)return;h.quaternion.copy(h.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(worldQ));h.updateWorldMatrix(false,true)}
 function forearmRoll(i,handQ){
  if(!frames[i]?.rest||!elbows[i]||!hands[i])return;
  const elbow=elbows[i],current=elbow.getWorldQuaternion(new T.Quaternion()),axis=hands[i].getWorldPosition(V()).sub(elbow.getWorldPosition(V())).normalize();
  const delta=handQ.clone().multiply(frames[i].rest.clone().invert()).multiply(current.clone().invert()),projection=V(delta.x,delta.y,delta.z).dot(axis);
  const twist=new T.Quaternion(axis.x*projection,axis.y*projection,axis.z*projection,delta.w).normalize();
  const q=current.premultiply(new T.Quaternion().slerp(twist,.8));
  elbow.quaternion.copy(elbow.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(q));elbow.updateWorldMatrix(false,true);
 }
 function reachCup(target,cupQ,seed){
  // Treat forearm + palm as one straight segment. Solving to the wrist and
  // forcing a fixed palm rotation afterwards produced the visible wrist kink.
  const shoulder=arms[0].getWorldPosition(V()),elbow=elbows[0].getWorldPosition(V()),wrist=hands[0].getWorldPosition(V());
  const upper=shoulder.distanceTo(elbow),forearm=elbow.distanceTo(wrist),palm=hands[0].localToWorld(frames[0].grip.clone()).distanceTo(wrist),lower=forearm+palm;
  const direction=target.clone().sub(shoulder),distance=T.MathUtils.clamp(direction.length(),Math.abs(upper-lower)+.001,upper+lower-.002);direction.normalize();
  const grip=shoulder.clone().addScaledVector(direction,distance),along=(upper*upper-lower*lower+distance*distance)/(2*distance),height=Math.sqrt(Math.max(0,upper*upper-along*along));
  const centre=shoulder.clone().addScaledVector(direction,along),facing=root.getWorldQuaternion(new T.Quaternion()),preferred=V(0,.94,.342).normalize().applyQuaternion(cupQ);
  const outside=V(-1,0,0).applyQuaternion(facing);outside.addScaledVector(direction,-outside.dot(direction)).normalize();
  const around=direction.clone().cross(outside).normalize(),natural=shoulder.clone().add(V(-.10,-.23,.12).applyQuaternion(facing)),rootInverse=root.matrixWorld.clone().invert(),shoulderX=shoulder.clone().applyMatrix4(rootInverse).x;
  const currentAxis=elbow.clone().sub(shoulder).normalize(),currentArmQ=arms[0].getWorldQuaternion(new T.Quaternion()),armScale=arms[0].getWorldScale(V());
  let best={score:Infinity};
  function evaluate(angle){
   const joint=centre.clone().addScaledVector(outside,Math.cos(angle)*height).addScaledVector(around,Math.sin(angle)*height),long=grip.clone().sub(joint).normalize(),wristTarget=grip.clone().addScaledVector(long,-palm);
   let upperGap=1;if(torso?.upperCloud?.length){const q=currentArmQ.clone().premultiply(new T.Quaternion().setFromUnitVectors(currentAxis,joint.clone().sub(shoulder).normalize())),matrix=new T.Matrix4().compose(shoulder,q,armScale);upperGap=Infinity;for(const p of torso.upperCloud)upperGap=Math.min(upperGap,torso.clearance(p.clone().applyMatrix4(matrix)))}else if(torso)upperGap=torso.segment(shoulder,joint,torso.radius[0],.55);
   const lowerGap=torso?.segment(joint,wristTarget,torso.radius[1])??1,local=joint.clone().applyMatrix4(rootInverse);
   const violation=Math.max(0,.014-upperGap)+2*Math.max(0,.008-lowerGap)+Math.max(0,local.x-shoulderX+.025)+Math.max(0,joint.y-shoulder.y+.025);
   const score=10000*violation+joint.distanceTo(natural)+.03*(1-long.dot(preferred));
   if(score<best.score)best={angle,score,joint,long,wristTarget,upperGap,lowerGap};
  }
  if(seed===undefined)for(let i=0;i<48;i++)evaluate(i*Math.PI*2/48);else for(const delta of [-.35,-.175,0,.175,.35])evaluate(seed+delta);
  let step=seed===undefined?Math.PI*2/48:.175;for(let i=0;i<6;i++){const angle=best.angle;step/=2;evaluate(angle-step);evaluate(angle+step)}
  const {joint,long,wristTarget}=best;armClearance={upper:best.upperGap,forearm:best.lowerGap};
  aim(arms[0],elbows[0],joint.clone().sub(shoulder));aim(elbows[0],hands[0],wristTarget.sub(joint));
  const normal=V(1,0,-.7).applyQuaternion(cupQ);normal.addScaledVector(long,-normal.dot(long)).normalize();
  return {q:frameQuaternion(long,normal.cross(long)).multiply(frames[0].inverse),angle:best.angle};
 }
 function curlGrip(){
  if(!frames[0]?.prefix)return;
  const wrist=hands[0].getWorldPosition(V()),long=bones.get('RightHandMiddle1').getWorldPosition(V()).sub(wrist).normalize(),across=bones.get('RightHandPinky1').getWorldPosition(V()).sub(bones.get('RightHandIndex1').getWorldPosition(V())).normalize(),normal=long.clone().cross(across).normalize();
  function curve(finger,points){for(let j=1;j<=3;j++){
   const joint=bones.get('RightHand'+finger+j),end=bones.get('RightHand'+finger+(j+1));if(joint&&end)aim(joint,end,cup.localToWorld(V(...points[j-1])).sub(joint.getWorldPosition(V())));
  }}
  // Positive anatomical flexion, following the original rig's relaxed curl.
  // Index hooks the handle; other fingers close below it without hyperextension.
  for(const [finger,angles] of [['Index',[.95,1.9,2.8]],['Middle',[1.45,2.8,3.4]],['Ring',[1.45,2.8,3.4]],['Pinky',[1.45,2.8,3.4]]])for(let j=1;j<=3;j++){
   const direction=long.clone().multiplyScalar(Math.cos(angles[j-1])).addScaledVector(normal,Math.sin(angles[j-1]));aim(bones.get('RightHand'+finger+j),bones.get('RightHand'+finger+(j+1)),direction);
  }
  curve('Thumb',[[-.090,.034,.010],[-.081,.035,.012],[-.076,.028,.004]]);
 }
 function gripPoint(){root.updateMatrixWorld(true);return frames[0]?.prefix?bones.get('RightHandIndex2').getWorldPosition(V()).add(bones.get('RightHandIndex3').getWorldPosition(V())).multiplyScalar(.5):hands[0]?hands[0].localToWorld(frames[0].grip.clone()):cup.localToWorld(gripAnchor.clone())}
 function holdCup(lift=0,tilt=0,contact=0,seated=0){
  cup.visible=true;if(!hands[0])return;
  root.updateMatrixWorld(true);const localTilt=new T.Quaternion().setFromAxisAngle(V(1),-tilt).multiply(cupYaw);
  torso?.update();
  const lip=root.worldToLocal(mouthPoint()).add(V(-.009,0,.003));
  const tipCentre=lip.add(V(0,-.012*(1-contact),.040*(1-contact))).sub(lipAnchor.clone().applyQuaternion(localTilt));
  const shoulder=root.worldToLocal(arms[0].getWorldPosition(V())),held=shoulder.add(V(.02,.015,.27));
  held.lerp(V(-.18,hipY()+.16,.38),T.MathUtils.clamp(seated,0,1));
  cup.position.copy(held.lerp(tipCentre,lift));cup.position.z+=.018*Math.sin(Math.PI*lift);cup.quaternion.copy(localTilt);root.updateMatrixWorld(true);
  const cupQ=cup.getWorldQuaternion(new T.Quaternion()),contactTarget=cup.localToWorld(gripAnchor.clone());let target=cup.localToWorld(palmAnchor.clone()),handQ,seed;
  // Fit the actual curled index contact, rather than gluing the cup to a wrist
  // or palm point. Short hands and long hands therefore hold the same handle.
  for(let iteration=0;iteration<6;iteration++){
   const solution=reachCup(target,cupQ,seed);handQ=solution.q;seed=solution.angle;orientHand(0,handQ);curlGrip();
   target=hands[0].localToWorld(frames[0].grip.clone()).add(contactTarget.clone().sub(gripPoint()));
  }
  forearmRoll(0,handQ);orientHand(0,handQ);curlGrip();sync();
  const centre=cup.getWorldPosition(V());cup.position.copy(root.worldToLocal(centre.add(gripPoint().sub(contactTarget))));sync();
 }
 function lapHand(i,y){
  torso?.update();
  reach(i,root.localToWorld(V(i===0?-.235:.235,y+.15,.235)),V(i===0?-.55:.55,-1,.15));
  if(!hands[i]||!frames[i])return;
  const facing=root.getWorldQuaternion(new T.Quaternion()),long=hands[i].getWorldPosition(V()).sub(elbows[i].getWorldPosition(V())).normalize().lerp(V(0,-.16,1).normalize().applyQuaternion(facing),.6).normalize();
  orientHand(i,frameQuaternion(long,V(i===0?-1:1,0,0).applyQuaternion(facing)).multiply(frames[i].inverse));
  if(!frames[i].prefix)return;
  const prefix=frames[i].prefix,wrist=hands[i].getWorldPosition(V()),forward=bones.get(prefix+'HandMiddle1').getWorldPosition(V()).sub(wrist).normalize(),across=bones.get(prefix+'HandPinky1').getWorldPosition(V()).sub(bones.get(prefix+'HandIndex1').getWorldPosition(V())).normalize(),palm=forward.clone().cross(across).normalize().multiplyScalar(i===0?1:-1);
  for(const finger of ['Index','Middle','Ring','Pinky'])for(let j=1;j<=3;j++)aim(bones.get(prefix+'Hand'+finger+j),bones.get(prefix+'Hand'+finger+(j+1)),forward.clone().multiplyScalar(Math.cos([.12,.36,.62][j-1])).addScaledVector(palm,Math.sin([.12,.36,.62][j-1])));
 }
 function leanBack(amount){
  const axis=V(1).applyQuaternion(root.getWorldQuaternion(new T.Quaternion()));
  for(const [name,angle] of [['Spine',-.10],['Spine1',-.08],['Spine2',-.035],['Head',.11]]){
   const b=bones?.get(name);if(!b)continue;b.updateWorldMatrix(true,false);
   const q=b.getWorldQuaternion(new T.Quaternion()).premultiply(new T.Quaternion().setFromAxisAngle(axis,angle*amount));
   b.quaternion.copy(b.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(q));b.updateWorldMatrix(false,true);
  }
 }
 function upperBody(lift,tilt){
  // A small forward inclination follows the cup, with a slight head release to sip.
  const facing=root.getWorldQuaternion(new T.Quaternion()),axis=V(1).applyQuaternion(facing);
  for(const [name,angle] of [['Spine',.025*lift],['Head',.065*lift-.11*tilt]]){
   const b=bones?.get(name);if(!b)continue;b.updateWorldMatrix(true,false);
   const q=b.getWorldQuaternion(new T.Quaternion()).premultiply(new T.Quaternion().setFromAxisAngle(axis,angle));
   b.quaternion.copy(b.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(q));b.updateWorldMatrix(false,true);
  }
 }
 function animate(mode,t,{hasCoffee=false,slot=null,relax=1}={}){
  const seated=mode==='rest';data.pose?.(seated?1:0);cup.visible=hasCoffee&&mode!=='brew';
  if(!arms.length)return;
  if(mode==='brew'&&slot?.kettle){
   slot.kettle.updateWorldMatrix(true,true);reach(1,slot.kettle.localToWorld(V(-.115,.10,0)));reach(0,root.localToWorld(V(-.20,.93,.30)));
  }else{
   const motion=coffeeSip(t);if(seated)leanBack(T.MathUtils.clamp(relax,0,1)*(hasCoffee?1-.75*motion.lift:1));if(hasCoffee)upperBody(motion.lift,motion.tilt);
   const y=hipY();if(seated)lapHand(1,y);
   if(hasCoffee)holdCup(motion.lift,motion.tilt,motion.contact,seated?1:0);else if(seated)lapHand(0,y);
  }
  sync();torso?.update();
 }
 function carry(seated=0){holdCup(0,0,0,seated)}
 function clear(){cup.visible=false}
 return {animate,carry,clear,cup,mouthPoint,gripPoint,lipAnchor:lipAnchor.clone(),gripAnchor:gripAnchor.clone(),handleCentre:handleCentre.clone(),torso,clearance:()=>armClearance};
}
