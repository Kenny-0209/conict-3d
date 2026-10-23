import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import * as T from './dist/vendor/three.module.js';
import {GLTFLoader} from './dist/vendor/GLTFLoader.js';
import {createGuestRig,GUEST_REVISION} from './dist/guest-rig.js';
const bytes=await readFile(new URL('./dist/assets/guest.glb',import.meta.url));
const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
assert.deepEqual(gltf.animations.map(a=>a.name).sort(),['Idle_Neutral','Walk','Wave']);
const guest=createGuestRig(gltf),other=createGuestRig(gltf),rig=guest.body.userData;
assert.equal(rig.modelRevision,GUEST_REVISION);assert.equal(rig.license,'CC0-1.0');assert.equal(rig.bones.size,62);
const box=()=>new T.Box3().setFromObject(guest.root,true),p=n=>rig.bones.get(n).getWorldPosition(new T.Vector3());
const stand=box();assert(Math.abs(stand.max.y-stand.min.y-1.80)<.003,JSON.stringify({standing:stand,height:stand.max.y-stand.min.y}));assert(Math.abs(stand.min.y)<.005);
assert(p('UpperArmL').x>p('UpperArmR').x,'front convention +Z');
const start=p('WristR'),head=p('Head');let walkMotion=0,minFloor=Infinity,maxFloor=-Infinity;
for(let i=0;i<21;i++){guest.gait(i*Math.PI/10,true);walkMotion=Math.max(walkMotion,start.distanceTo(p('WristR')));const b=box();minFloor=Math.min(minFloor,b.min.y);maxFloor=Math.max(maxFloor,b.min.y)}
assert(walkMotion>.08,'authored walk must swing skinned limbs');assert(minFloor>-.05&&maxFloor<.05,'walk floor '+minFloor+' '+maxFloor);
guest.pose(1);const sit=box(),hands=rig.hands.map(n=>n.getWorldPosition(new T.Vector3()).toArray());assert(p('Head').y<head.y-.3);assert(sit.min.y>-.06&&sit.min.y<.06,'seated feet must meet floor: '+sit.min.y);assert(hands.every(p=>p[1]>.76&&p[1]<.95),'hands meet desk');
for(const t of [0,.2,.4,.6,.8,1]){guest.pose(t);guest.root.traverse(n=>assert(n.matrixWorld.elements.every(Number.isFinite)))}
guest.pose(0);const before=rig.hands.map(n=>n.getWorldPosition(new T.Vector3()));let waveMotion=0;
for(const t of [.15,.3,.45,.6,.75]){guest.wave(t);waveMotion=Math.max(waveMotion,...rig.hands.map((n,i)=>n.getWorldPosition(new T.Vector3()).distanceTo(before[i])))}assert(waveMotion>.25,'authored wave must raise a hand');guest.wave(1);assert(rig.hands.every((n,i)=>n.getWorldPosition(new T.Vector3()).distanceTo(before[i])<1e-5),'greeting restores idle');
guest.pose(1);guest.wave(.4);guest.wave(1);assert(p('Head').y<head.y-.3,'greeting while seated keeps seated pose');
assert.notEqual(rig.bones.get('Head'),other.body.userData.bones.get('Head'),'independent skeleton');
let skin=null;guest.body.traverse(n=>{if(n.isSkinnedMesh)skin=n});const vertex=()=>skin.localToWorld(skin.getVertexPosition(0,new T.Vector3()));guest.pose(0);const v=vertex();guest.pose(1);assert(v.distanceTo(vertex())>.01,'skin follows seat pose');
const report={pass:true,source:'Quaternius Casual_2',license:'CC0-1.0',bytes:bytes.length,bones:rig.bones.size,height:stand.max.y-stand.min.y,walkMotion,walkFloor:[minFloor,maxFloor],seatedFloor:sit.min.y,seatedHands:hands,waveMotion};
if(process.argv[2])await writeFile(process.argv[2],JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
