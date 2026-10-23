import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import * as T from './dist/vendor/three.module.js';
import {GLTFLoader} from './dist/vendor/GLTFLoader.js';
import {createYoon} from './dist/yoon.js';
import {createPCMotion,isWorking} from './dist/pc-motion.js';
import {defaultLayout} from './dist/layout.js';
import {createNavigation} from './dist/navigation.js';
import {smoothFacing,headingDifference,NPC_TURN_RATE} from './dist/movement.js';

const loader=new GLTFLoader();loader.register(()=>({name:'NoTexture',loadTexture:()=>Promise.resolve(new T.Texture())}));
const layout=defaultLayout(),nav=createNavigation(layout),seat=layout.objects.find(o=>o.seatId==='s3'),typing=[];
for(let member=1;member<=8;member++){
 const id='m'+member,file=member===1?'yoon':member===2?'lee':id,bytes=await readFile('./dist/assets/'+file+'.glb'),asset=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 const body=createYoon(asset,true,{memberId:id,rootName:member===1?'YoonSebeen':member===2?'LeeSangmin':'Member_'+id,heightMeters:id==='m5'?1.6:undefined}),node=new T.Group();node.position.set(seat.x,seat.y,seat.z);node.rotation.y=seat.rotation*Math.PI/180;node.add(body);body.position.z=.85;body.rotation.y=Math.PI;node.userData.avatar=body;node.updateMatrixWorld(true);
 const motion=createPCMotion({items:[{o:seat,node,person:{name:id}}],nav,random:()=>.5}),r=motion.records[0];r.breakRemaining=1000;
 const joints=['RightHandIndex2','LeftHandIndex2'].map(n=>body.userData.bones.get(n)),tips=['RightHandIndex4','LeftHandIndex4'].map(n=>body.userData.bones.get(n));
 const localTip=i=>body.userData.hands[i].worldToLocal(tips[i].getWorldPosition(new T.Vector3()));
 motion.tick(1/30);assert(isWorking(r));const samples=joints.map(b=>[b.quaternion.clone().normalize()]),tipStart=tips.map((_,i)=>localTip(i)),angles=[0,0],spans=[0,0];
 for(let frame=0;frame<90;frame++){motion.tick(1/30);for(let i=0;i<2;i++){const q=joints[i].quaternion.clone().normalize();for(const previous of samples[i])angles[i]=Math.max(angles[i],q.angleTo(previous));samples[i].push(q);spans[i]=Math.max(spans[i],localTip(i).distanceTo(tipStart[i]))}}
 assert(angles.every(a=>a>.10),id+' both index finger joints must articulate while PC status is unknown');assert(spans.every(s=>s>.003&&s<.04),id+' fingers must tap relative to the palm instead of only moving the arm: '+JSON.stringify({spans,angles}));
 motion.setStates({s3:'no-response'});assert(!isWorking(r));const still=joints.map(b=>b.quaternion.clone());for(let frame=0;frame<20;frame++)motion.tick(1/30);joints.forEach((b,i)=>assert(b.quaternion.toArray().every((v,k)=>Math.abs(v-still[i].toArray()[k])<1e-8),id+' explicit offline state must rest fingers'));
 motion.setStates({s3:'online'});motion.tick(1/30);assert(isWorking(r)&&joints.some((b,i)=>b.quaternion.angleTo(still[i])>.001),id+' typing must resume');
 typing.push({id,maxIndexArticulationDegrees:angles.map(a=>a*180/Math.PI),maxTipTravelM:spans,unknownTypes:true,offlineRests:true,onlineResumes:true});
 const geometries=new Set(),materials=new Set();for(const root of [body,asset.scene])root.traverse(n=>{if(n.geometry)geometries.add(n.geometry);for(const m of Array.isArray(n.material)?n.material:n.material?[n.material]:[])materials.add(m)});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());
}

let wrapped=179*Math.PI/180,totalTurn=0;for(let frame=0;frame<60;frame++){const next=smoothFacing(wrapped,-179*Math.PI/180,1/60);totalTurn+=Math.abs(headingDifference(wrapped,next));wrapped=next}assert(totalTurn<3*Math.PI/180,'crossing +/-pi must use the short arc');
const rateResults=[30,60,120].map(fps=>{let yaw=0;for(let i=0;i<fps*1.2;i++){const next=smoothFacing(yaw,Math.PI/2,1/fps);assert(Math.abs(headingDifference(yaw,next))<=NPC_TURN_RATE/fps+1e-9);yaw=next}return yaw});assert(Math.max(...rateResults)-Math.min(...rateResults)<.015,'turning must remain consistent across frame rates');
const items=layout.objects.map(o=>{const node=new T.Group();node.position.set(o.x,o.y,o.z);node.rotation.y=o.rotation*Math.PI/180;if(o.kind!=='seat')return {o,node};const body=new T.Group();body.rotation.y=Math.PI;body.userData.pose=()=>{};body.userData.gait=()=>{};body.userData.updateWork=()=>{};node.add(body);node.userData.avatar=body;node.updateMatrixWorld(true);return {o,node,person:{name:o.id}}});
let seed=13;const random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296),motion=createPCMotion({items,nav,random});let maxRate=0,inPlaceTurnFrames=0,turnFrames=0;
for(let frame=0;frame<7200;frame++){
 const previous=motion.records.map(r=>({yaw:r.body.rotation.y,pos:{...r.pos}}));motion.tick(1/30);
 motion.records.forEach((r,i)=>{const delta=Math.abs(headingDifference(previous[i].yaw,r.body.rotation.y));maxRate=Math.max(maxRate,delta*30);assert(delta<=NPC_TURN_RATE/30+1e-8,r.item.o.id+' must not snap during walking, arrival, sitting or returning');if(delta>.003){turnFrames++;if(Math.hypot(r.pos.x-previous[i].pos.x,r.pos.z-previous[i].pos.z)<1e-5)inPlaceTurnFrames++}if(r.mode==='lounge-sit'&&r.amount>0)assert(Math.abs(headingDifference(r.item.node.rotation.y+r.body.rotation.y,r.activity.slot.yaw))<.10,'face the sofa before sitting');if(r.mode==='sit'&&r.amount>0)assert(Math.abs(headingDifference(r.body.rotation.y,Math.PI))<.10,'face the desk before sitting')});
}
assert(turnFrames>100&&inPlaceTurnFrames>0,'exercise corners and large turns');
const result={status:'PASS',typing,maxTurnRateRadPerSecond:maxRate,turnFrames,inPlaceTurnFrames,shortArcDegrees:totalTurn*180/Math.PI,frameRateYaw:rateResults};if(process.argv[2])await writeFile(process.argv[2],JSON.stringify(result,null,2));console.log(JSON.stringify(result));
