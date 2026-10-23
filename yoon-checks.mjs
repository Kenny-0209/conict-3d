import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as T from './dist/vendor/three.module.js';
import {GLTFLoader} from './dist/vendor/GLTFLoader.js';
import {createYoon,YOON_REVISION} from './dist/yoon.js';
import {createPCMotion} from './dist/pc-motion.js';
import {defaultLayout} from './dist/layout.js';
import {createNavigation} from './dist/navigation.js';

// Decode the actual shipped skeleton, mesh and animation. Skip image decoding
// in Node; browser QA separately verifies the embedded texture visually.
const loader=new GLTFLoader();loader.register(parser=>({name:'HeadlessTexture',loadTexture:i=>{const t=new T.Texture();parser.associations.set(t,{textures:i});return Promise.resolve(t)}}));
const bytes=await readFile(new URL('./dist/assets/yoon.glb',import.meta.url));
const asset=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
assert.deepEqual(asset.animations.map(a=>a.name).sort(),['Idle','Seated','Walk']);
const a=createYoon(asset),b=createYoon(asset,true),r=a.userData;
assert.equal(r.modelRevision,YOON_REVISION);assert.equal(r.bones.size,65);assert.equal(r.hands.length,2);
assert(r.walkStride>1&&r.walkStride<1.6);assert(Math.abs(r.walkDuration-34/30)<1e-5);
const height=new T.Box3().setFromObject(a,true);assert(height.max.y>1.8&&height.max.y<1.9);assert(height.min.y>-.01);
const from=r.hands[0].getWorldPosition(new T.Vector3());r.wave(.5);const to=r.hands[0].getWorldPosition(new T.Vector3());assert(to.distanceTo(from)>.4);r.wave(1);
assert(from.distanceTo(r.hands[0].getWorldPosition(new T.Vector3()))<1e-5,'greeting must restore the paused idle pose');
for(const t of [0,.25,.5,.75,1]){r.pose(t);a.updateMatrixWorld(true);a.traverse(n=>assert(n.matrixWorld.elements.every(Number.isFinite)))}
r.pose(1);const sit=new T.Box3().setFromObject(a,true);assert(sit.max.y>1.2&&sit.max.y<1.6);assert(sit.min.y>-.02&&sit.min.y<.03);
const seatedHands=r.hands.map(h=>h.getWorldPosition(new T.Vector3()).y);for(const y of seatedHands)assert(y>.68&&y<.86,'hands must meet the desk');
r.pose(0);for(let i=0;i<30;i++)r.gait(i*7/30,true,.65/30);
const hips=r.bones.get('Hips'),first=hips.getWorldPosition(new T.Vector3()),wrist=r.hands[0].getWorldPosition(new T.Vector3());
r.gait(30*7/30,true,r.walkStride);const last=hips.getWorldPosition(new T.Vector3());assert(first.distanceTo(last)<1e-5,'one stride must loop without root travel');assert(wrist.distanceTo(r.hands[0].getWorldPosition(new T.Vector3()))<1e-5);
let sa,sb;a.traverse(n=>{if(n.isSkinnedMesh)sa=n});b.traverse(n=>{if(n.isSkinnedMesh)sb=n});assert(sa&&sb);assert.notEqual(sa.skeleton.bones[0],sb.skeleton.bones[0]);assert.notEqual(sa.geometry,sb.geometry);assert.notEqual(sa.material,sb.material);assert.notEqual(sa.material.map,sb.material.map);
assert(JSON.stringify(r).length<180,'live references must stay out of export extras');
// Waving must raise the same hand when a seat faces the opposite direction.
b.rotation.y=Math.PI;const seatedWrist=b.userData.hands[0].getWorldPosition(new T.Vector3());b.userData.wave(.5);assert(b.userData.hands[0].getWorldPosition(new T.Vector3()).y>1.1);b.userData.wave(1);assert(seatedWrist.distanceTo(b.userData.hands[0].getWorldPosition(new T.Vector3()))<1e-5,'seated greeting must return to the desk');
const workStart=b.userData.hands[0].quaternion.clone();b.userData.updateWork(100);const once=b.userData.hands[0].quaternion.clone();for(let i=0;i<100;i++)b.userData.updateWork(100);assert(b.userData.hands[0].quaternion.toArray().every((v,i)=>Math.abs(v-once.toArray()[i])<1e-6),'typing must not accumulate rotation');b.userData.pose(1);assert(b.userData.hands[0].quaternion.toArray().every((v,i)=>Math.abs(v-workStart.toArray()[i])<1e-6));
// Exercise the real model through the existing independent scheduled break/return state machine.
const layout=defaultLayout(),nav=createNavigation(layout),o=layout.objects.find(o=>o.kind==='seat'&&o.seatId==='s3'),node=new T.Group();
node.position.set(o.x,o.y,o.z);node.rotation.y=o.rotation*Math.PI/180;node.scale.set(o.scaleX,o.scaleY,o.scaleZ);node.add(b);b.position.z=.85;node.userData.avatar=b;node.updateMatrixWorld(true);
let seed=7;const motion=createPCMotion({items:[{node,o,person:{id:'m1'}},{o:layout.objects.find(o=>o.kind==='sofa-3'),node:new T.Group()}],nav,random:()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296)}),record=motion.records[0];
motion.setStates({s3:'online'});motion.tick(0,undefined,record.breakRemaining+.001);assert.equal(record.mode,'stand');let moved=0;for(let i=0;i<400;i++){motion.tick(.04);if(record.mode==='lounge-walk'&&Math.hypot(record.pos.x-record.approach.x,record.pos.z-record.approach.z)>.15)moved++}assert(moved>10);
motion.setStates({s3:'online'});for(let i=0;i<2400&&record.mode!=='seated';i++)motion.tick(.04);assert.equal(record.mode,'seated');assert.equal(record.amount,1);assert(Math.hypot(record.pos.x-record.seat.x,record.pos.z-record.seat.z)<.001);
console.log(JSON.stringify({pass:true,bones:r.bones.size,height_m:height.max.y-height.min.y,seated_height_m:sit.max.y-sit.min.y,feet_floor_y:sit.min.y,seated_hand_heights_m:seatedHands,walk_stride_m:r.walkStride,walk_duration_s:r.walkDuration,independent_instances:true,scheduled_break_and_return:true},null,2));
