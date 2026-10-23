import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import * as T from './dist/vendor/three.module.js';
import {GLTFLoader} from './dist/vendor/GLTFLoader.js';
import {createMember,RIG_MEMBER_IDS,MEMBER_REVISION} from './dist/member-rigs.js';
import {members,seats} from './dist/data.js';
import {createPCMotion} from './dist/pc-motion.js';
import {defaultLayout} from './dist/layout.js';
import {createNavigation} from './dist/navigation.js';
const reports=[];
for(const id of RIG_MEMBER_IDS){
 const person=members.find(p=>p.id===id),loader=new GLTFLoader();loader.register(parser=>({name:'HeadlessTexture',loadTexture:i=>{const t=new T.Texture();parser.associations.set(t,{textures:i});return Promise.resolve(t)}}));
 const bytes=await readFile(new URL('./dist/assets/'+id+'.glb',import.meta.url)),gltf=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),''),model=createMember(gltf,person),r=model.userData,pos=n=>r.bones.get(n).getWorldPosition(new T.Vector3()),box=()=>new T.Box3().setFromObject(model,true);
 assert.equal(r.memberId,id);assert.equal(r.modelRevision,MEMBER_REVISION);assert.equal(r.bones.size,65);assert.equal(r.idleDuration,8);assert.deepEqual(gltf.animations.map(a=>a.name).sort(),['Idle','Seated','Walk']);
 r.idle(0);const standing=box(),wrist=pos('RightHand'),ankle=pos('LeftFoot'),neck=pos('Neck');if(id==='m5')assert(Math.abs(standing.max.y-standing.min.y-1.60)<.003,'Wesam must be 160cm');else assert(standing.max.y>1.7&&standing.max.y<1.96);assert(standing.min.y>-.03);
 const across=pos('LeftArm').sub(pos('RightArm'));assert(across.x>0&&Math.abs(across.z)<across.x*.25,'front must be +Z');
 r.idle(1);const breath=neck.distanceTo(pos('Neck'));assert(breath>.0001&&breath<.04);assert(ankle.distanceTo(pos('LeftFoot'))<.003);r.idle(8);assert(wrist.distanceTo(pos('RightHand'))<1e-5);r.wave(.5);assert(pos('RightHand').y>1.4);r.wave(1);assert(wrist.distanceTo(pos('RightHand'))<1e-5);
 for(const t of [0,.25,.5,.75,1]){r.pose(t);model.updateMatrixWorld(true);model.traverse(n=>assert(n.matrixWorld.elements.every(Number.isFinite)))}
 const sit=box(),hands=r.hands.map(h=>h.getWorldPosition(new T.Vector3()).y);assert(sit.min.y>-.035&&sit.min.y<.045,id+' seated floor '+sit.min.y);assert(hands.every(y=>y>.65&&y<.9),id+' seated hands '+hands);
 r.pose(0);for(let i=0;i<20;i++)r.gait(i*7/30,true,.65/30);const hips=pos('Hips'),hand=pos('RightHand');r.gait(20*7/30,true,r.walkStride);assert(hips.distanceTo(pos('Hips'))<1e-5);assert(hand.distanceTo(pos('RightHand'))<1e-5);
 let min=Infinity,max=-Infinity;for(let i=0;i<=136;i++){r.gait(i*2*Math.PI/136,true);const y=box().min.y;min=Math.min(min,y);max=Math.max(max,y)}assert(min>-.012&&max<.03,id+' walk floor '+JSON.stringify([min,max]));
 const layout=defaultLayout(),nav=createNavigation(layout),seat=seats.find(s=>s.member===id),o=layout.objects.find(o=>o.kind==='seat'&&o.seatId===seat.id),node=new T.Group();node.position.set(o.x,o.y,o.z);node.rotation.y=o.rotation*Math.PI/180;node.scale.set(o.scaleX,o.scaleY,o.scaleZ);node.add(model);model.position.z=.85;model.rotation.y=Math.PI;node.userData.avatar=model;node.updateMatrixWorld(true);
 let seed=9;const motion=createPCMotion({items:[{node,o,person},{o:layout.objects.find(o=>o.kind==='sofa-3'),node:new T.Group()}],nav,random:()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296)}),record=motion.records[0];motion.setStates({[seat.id]:'online'});motion.tick(0,undefined,record.breakRemaining+.001);assert.equal(record.mode,'stand');let moved=0;for(let i=0;i<400;i++){motion.tick(.04);if(record.mode==='lounge-walk'&&Math.hypot(record.pos.x-record.approach.x,record.pos.z-record.approach.z)>.15)moved++}assert(moved>10,person.name+' must take a scheduled break while online');motion.setStates({[seat.id]:'online'});for(let i=0;i<2400&&record.mode!=='seated';i++)motion.tick(.04);assert.equal(record.mode,'seated');
 reports.push({id,name:person.name,pass:true,bones:65,standing_height_m:standing.max.y-standing.min.y,idle_neck_motion_m:breath,seated_floor_y:sit.min.y,seated_hand_heights_m:hands,walk_floor_range_m:[min,max],scheduled_break_and_return:true});
}
if(process.argv[2])await writeFile(process.argv[2],JSON.stringify({pass:true,members:reports},null,2));console.log(JSON.stringify({pass:true,members:reports},null,2));
