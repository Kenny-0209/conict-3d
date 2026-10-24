import assert from 'node:assert/strict';
import * as T from './dist/vendor/three.module.js';
import {defaultLayout,clone} from './dist/layout.js';
import {createNavigation,localPoint,screenViewTarget} from './dist/navigation.js';
import {thirdPersonView} from './dist/walk-view.js';

const layout=defaultLayout(),nav=createNavigation(layout),start=nav.spawn(),tv=layout.objects.find(o=>o.id==='f23');
const toLocal=(o,p)=>{const a=o.rotation*Math.PI/180,dx=p.x-o.x,dz=p.z-o.z;return{x:(Math.cos(a)*dx-Math.sin(a)*dz)/o.scaleX,z:(Math.sin(a)*dx+Math.cos(a)*dz)/o.scaleZ}};
const route=nav.approach(tv,start);assert(route,'professor monitor remains reachable from the entry');
const local=toLocal(tv,route.point);assert(local.z>.5&&Math.abs(local.x)<1e-8,'professor monitor must be approached from its screen centre, never rear/side');
let previous=start;for(const point of route.path){assert(nav.clear(previous,point),'front route must not cross walls or furniture');previous=point}
const target=screenViewTarget(tv),yaw=Math.atan2(target.x-route.point.x,target.z-route.point.z),normal=new T.Vector3(Math.sin(tv.rotation*Math.PI/180),0,Math.cos(tv.rotation*Math.PI/180));
assert(new T.Vector3(Math.sin(yaw),0,Math.cos(yaw)).dot(normal)<-.999,'arrival looks directly into the front of the screen');assert.equal(target.y,1.37);
let transformed=0;
for(const kind of ['tv','media-tv','monitors'])for(const rotation of [0,90,180,270,630]){
 const single=clone(layout);single.rooms=[single.rooms[0]];single.openings=[];single.walls=[];const item={...tv,id:'monitor-test',kind,x:0,z:0,rotation,scaleX:1.2,scaleY:.9,scaleZ:.8,roomId:single.rooms[0].id};single.objects=[item];
 const n=createNavigation(single),a=n.approach(item,{x:-3,z:2});assert(a,`${kind} at ${rotation} is reachable`);const q=toLocal(item,a.point);assert(q.z>0&&Math.abs(q.x)<1e-8,'rotation and scale preserve the front centre');transformed++;
}
const blocked=clone(layout);blocked.rooms=[blocked.rooms[0]];blocked.openings=[];blocked.walls=[];const monitor={...tv,x:0,z:0,rotation:0,roomId:blocked.rooms[0].id};blocked.objects=[monitor,{id:'block-front',kind:'cabinet',x:0,z:1.4,y:0,rotation:0,scaleX:4,scaleY:1,scaleZ:8}];
assert.equal(createNavigation(blocked).approach(monitor,{x:-3,z:-2}),null,'an inaccessible front must not silently fall back to the rear');

const walls=[new T.Mesh(new T.BoxGeometry(.12,3,5),new T.MeshBasicMaterial({color:0xffffff}))];walls[0].position.set(-.7,1.5,0);walls[0].updateMatrixWorld(true);
const state=walls.map(m=>({material:m.material,opacity:m.material.opacity,transparent:m.material.transparent,depthWrite:m.material.depthWrite})),ray=new T.Raycaster();
const isBlocked=(from,to)=>{const origin=new T.Vector3(...from),delta=new T.Vector3(...to).sub(origin),distance=delta.length();ray.set(origin,delta.normalize());return ray.intersectObjects(walls,false).some(hit=>hit.distance<distance-.08)};
const input={x:0,z:0,yaw:Math.PI/2,pitch:0,aspect:390/844},base=thirdPersonView(input),corrected=thirdPersonView({...input,isBlocked});
assert(isBlocked([0,1.25,0],base.position),'fixture reproduces a wall hiding the guest');assert(!isBlocked([0,1.25,0],corrected.position),'camera clears the opaque wall');assert(corrected.position[1]>base.position[1]);
assert.deepEqual(thirdPersonView({...input,isBlocked:()=>false}),base,'an unobstructed view stays at its original angle');
for(let i=0;i<walls.length;i++){assert.equal(walls[i].material,state[i].material);for(const key of ['opacity','transparent','depthWrite'])assert.equal(walls[i].material[key],state[i][key],'camera adjustment must preserve mesh appearance')}
for(const m of walls){m.geometry.dispose();m.material.dispose()}
console.log(JSON.stringify({professorFrontLocal:local,arrivalYaw:yaw,route:route.path,transformedMonitors:transformed,cameraBefore:base.position,cameraAfter:corrected.position}));
console.log('PASS: professor monitor front route and facing, 15 rotated/scaled monitors, blocked-front refusal, opaque camera clearance and unchanged materials');
