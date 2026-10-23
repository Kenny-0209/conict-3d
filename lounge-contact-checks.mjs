import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import * as T from './dist/vendor/three.module.js';
import {GLTFLoader} from './dist/vendor/GLTFLoader.js';
import {createYoon} from './dist/yoon.js';
import {createLoungeRig} from './dist/lounge-rig.js';

const V=()=>new T.Vector3(),loader=new GLTFLoader();loader.register(p=>({name:'NoTexture',loadTexture:()=>Promise.resolve(new T.Texture())}));
const results=[];
for(let member=1;member<=8;member++){
 const id='m'+member,file=member===1?'yoon':member===2?'lee':id,bytes=await readFile('./dist/assets/'+file+'.glb'),asset=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 for(const initiallySeated of [false,true]){
  const body=createYoon(asset,initiallySeated,{memberId:id,rootName:member===1?'YoonSebeen':member===2?'LeeSangmin':'Member_'+id,heightMeters:id==='m5'?1.6:undefined}),rig=createLoungeRig(body),d=body.userData,samples=[];
  body.traverse(m=>{if(!m.isSkinnedMesh)return;const a=m.geometry.attributes,names=m.skeleton.bones.map(b=>b.name.replace(/^mixamorig:?/,''));for(let i=0;i<a.position.count;i++){const weight=[0,0,0,0],limbs=['RightArm','RightForeArm','LeftArm','LeftForeArm'];for(let j=0;j<4;j++){const k=limbs.indexOf(names[a.skinIndex.getComponent(i,j)]);if(k>=0)weight[k]+=a.skinWeight.getComponent(i,j)}const k=weight.indexOf(Math.max(...weight));if(weight[k]>.6)samples.push({m,i,upper:k%2===0,side:k<2?0:1})}});
  let minUpperSkinGap=1,minForearmSkinGap=1,minLeftSkinGap=1,minCapsuleGap=1,maxHandleNorm=0,maxThumbHandleDistance=0;
  for(const mode of ['rest','drink'])for(let frame=0;frame<=240;frame++){const t=frame*.05;
   rig.animate(mode,t,{hasCoffee:true});
   const s=d.arms[0].getWorldPosition(V()),e=d.elbows[0].getWorldPosition(V()),w=d.hands[0].getWorldPosition(V()),upper=new T.Line3(s,e),forearm=new T.Line3(e,w),gaps=rig.clearance();
   minCapsuleGap=Math.min(minCapsuleGap,gaps.upper,gaps.forearm);
   const sx=body.worldToLocal(s.clone()).x,ex=body.worldToLocal(e.clone()).x;assert(ex<sx-.02,id+' elbow must stay outside the shoulder, not inside the chest');
   const otherUpper=new T.Line3(d.arms[1].getWorldPosition(V()),d.elbows[1].getWorldPosition(V())),otherFore=new T.Line3(d.elbows[1].getWorldPosition(V()),d.hands[1].getWorldPosition(V()));
   for(const sample of samples){if(sample.side&&mode!=='rest')continue;const p=sample.m.localToWorld(sample.m.getVertexPosition(sample.i,V())),line=sample.side?(sample.upper?otherUpper:otherFore):(sample.upper?upper:forearm),along=line.closestPointToPointParameter(p,false);if(along<(sample.upper?.50:.08)||along>1)continue;const gap=rig.torso.clearance(p);if(sample.side){minLeftSkinGap=Math.min(minLeftSkinGap,gap);continue}if(sample.upper)minUpperSkinGap=Math.min(minUpperSkinGap,gap);else minForearmSkinGap=Math.min(minForearmSkinGap,gap);assert(gap>.001,id+' '+mode+' '+t+' '+(sample.upper?'upper arm':'forearm')+' must clear torso clothing: '+gap+'m')}
   for(const finger of ['Index']){
    let crossing=Infinity;
    for(let j=1;j<=3;j++){const a=rig.cup.worldToLocal(d.bones.get('RightHand'+finger+j).getWorldPosition(V())),b=rig.cup.worldToLocal(d.bones.get('RightHand'+finger+(j+1)).getWorldPosition(V()));if(a.z*b.z>0||Math.abs(a.z-b.z)<1e-7)continue;const p=a.clone().lerp(b,a.z/(a.z-b.z)),norm=Math.hypot((p.x+.066)/.0193,p.y/.022);crossing=Math.min(crossing,norm)}
    maxHandleNorm=Math.max(maxHandleNorm,crossing);assert(crossing<1,id+' '+mode+' '+t+' '+finger+' finger must pass through the actual handle opening: '+crossing);
   }
   const thumb=rig.cup.worldToLocal(d.bones.get('RightHandThumb4').getWorldPosition(V()));let handleDistance=Infinity;for(let i=0;i<64;i++){const angle=i*Math.PI/32,p=new T.Vector3(-.066+.0243*Math.cos(angle),.027*Math.sin(angle),0);handleDistance=Math.min(handleDistance,p.distanceTo(thumb))}maxThumbHandleDistance=Math.max(maxThumbHandleDistance,handleDistance);assert(thumb.y>.01&&handleDistance<.018,id+' thumb must support the upper handle');
  }
  rig.animate('rest',0);const restLines=[0,1].map(i=>[new T.Line3(d.arms[i].getWorldPosition(V()),d.elbows[i].getWorldPosition(V())),new T.Line3(d.elbows[i].getWorldPosition(V()),d.hands[i].getWorldPosition(V()))]);const restSkinGap=[1,1];
  for(const sample of samples){const p=sample.m.localToWorld(sample.m.getVertexPosition(sample.i,V())),line=restLines[sample.side][sample.upper?0:1],along=line.closestPointToPointParameter(p,false);if(along<(sample.upper?.50:.08)||along>1)continue;restSkinGap[sample.side]=Math.min(restSkinGap[sample.side],rig.torso.clearance(p))}
  results.push({id,initiallySeated,minUpperSkinGapM:minUpperSkinGap,minForearmSkinGapM:minForearmSkinGap,minLeftRestSkinGapM:minLeftSkinGap,minEmptyRestSkinGapM:restSkinGap,minCapsuleGapM:minCapsuleGap,maxHandleApertureNorm:maxHandleNorm,maxThumbHandleDistanceM:maxThumbHandleDistance,posedClothingVertices:samples.length});
 }
}
assert(results.every(r=>r.minLeftRestSkinGapM>.001&&r.minEmptyRestSkinGapM.every(g=>g>.001)),'resting sleeves must clear the padded torso: '+JSON.stringify(results.map(r=>({id:r.id,seated:r.initiallySeated,left:r.minLeftRestSkinGapM,empty:r.minEmptyRestSkinGapM}))));
const result={status:'PASS',checks:results};if(process.argv[2])await writeFile(process.argv[2],JSON.stringify(result,null,2));console.log(JSON.stringify(result));
