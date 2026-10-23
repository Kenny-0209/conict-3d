import assert from 'node:assert/strict';
import * as T from './dist/vendor/three.module.js';
import {room,kit} from './dist/models.js';
import {defaultLayout} from './dist/layout.js';
import {members,seats} from './dist/data.js';
import {batchStaticRoom} from './dist/static-batch.js';
import {createDoors} from './dist/doors.js';

// Only canvas text/rect operations are irrelevant to these CPU geometry checks.
globalThis.document={createElement:()=>({getContext:()=>({fillRect(){},fillText(){}})})};
const layout=defaultLayout(),root=room(kit('polygon'),seats,members.map(p=>({...p,professor:false})),{}, {...layout,cutaway:false});
delete globalThis.document;
const seat=root.children.find(n=>n.userData.layoutId==='seat-s3'),avatar=new T.Group();
avatar.add(new T.Mesh(new T.BoxGeometry(.4,1,.25),new T.MeshStandardMaterial()));seat.add(avatar);seat.userData.avatar=avatar;
const doors=createDoors({layout,root}),leaves=doors.records.flatMap(r=>r.leaves),screens=[];
root.traverse(n=>{if(n.userData.screen)screens.push(n)});root.updateMatrixWorld(true);
const bounds=new Map(root.children.map(n=>[n,new T.Box3().setFromObject(n,true)]));
function count(){let meshes=0,triangles=0;root.traverse(n=>{if(n.isMesh){meshes++;triangles+=(n.geometry.index?.count||n.geometry.attributes.position.count)/3}});return {meshes,triangles}}
function pick(x,z){const ray=new T.Raycaster(new T.Vector3(x,10,z),new T.Vector3(0,-1,0)),h=ray.intersectObject(root,true)[0];if(!h)return null;let n=h.object;while(n&&!n.userData.layoutId)n=n.parent;return {id:n?.userData.layoutId,distance:h.distance}}
const rays=[];for(let x=-4;x<12;x+=.37)for(let z=-3;z<4;z+=.41)rays.push({x,z,hit:pick(x,z)});
const before=count(),stats=batchStaticRoom(root),after=count();
assert(after.meshes<before.meshes*.35);assert.equal(after.triangles,before.triangles);
for(const [node,box] of bounds){const current=new T.Box3().setFromObject(node,true);assert(current.min.distanceTo(box.min)<1e-5,node.name+' min');assert(current.max.distanceTo(box.max)<1e-5,node.name+' max')}
for(const {x,z,hit} of rays){const current=pick(x,z);assert.equal(current?.id,hit?.id,`pick ${x},${z}`);if(hit)assert(Math.abs(current.distance-hit.distance)<1e-5)}
assert.equal(seat.userData.avatar,avatar);assert.equal(avatar.parent,seat);assert.equal(avatar.children.length,1);
assert(screens.every(n=>n.parent&&n.userData.screen));assert(leaves.every(n=>n.parent&&n.userData.doorLeaf));
doors.toggle('d1');for(let i=0;i<40;i++)doors.tick(1/30);assert.equal(doors.records.find(r=>r.id==='d1').fraction,0);
console.log(JSON.stringify({pass:true,before,after,stats,raycasts:rays.length,screens:screens.length,animatedDoors:leaves.length}));
