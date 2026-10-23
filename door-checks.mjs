import assert from 'node:assert/strict';
import * as T from './dist/vendor/three.module.js';
import {defaultLayout,openingPosition,clone} from './dist/layout.js';
import {room,kit} from './dist/models.js';
import {createNavigation} from './dist/navigation.js';
import {createDoors,doorSegments,segmentDistance} from './dist/doors.js';

const layout=defaultLayout(),original=JSON.stringify(layout),root=room(kit('polygon'),[],[],{},{...layout,objects:[]});
let people=[],blocked=0,notifications=0;
const doors=createDoors({layout,root,occupied:()=>people,onBlocked:()=>blocked++,onChange:()=>notifications++});
const nav=createNavigation(layout);nav.setDynamicObstacle(doors.blocks);
assert.equal(doors.records.length,2);assert.equal(doors.records.find(r=>r.id==='d2').leaves.length,2);
function finish(){for(let i=0;i<30;i++)doors.tick(1/30)}
const professor=layout.objects.find(o=>o.id==='seat-s8'),spawn=nav.spawn();
assert(nav.approach(professor,spawn),'professor room must be reachable with the original open doors');
const connector=doors.records.find(r=>r.id==='d1'),p=openingPosition(layout,connector.opening);
assert(doors.toggle('d1'));assert(connector.moving);doors.tick(.2);assert(connector.fraction>0&&connector.fraction<1);finish();
assert.equal(connector.fraction,0);assert(!connector.moving);assert(!nav.walkable(p),'a closed door must block the actual opening');
assert.equal(nav.approach(professor,spawn),null,'path planning must not route through a closed connector');
const a=p.rotation*Math.PI/180,n={x:Math.sin(a),z:Math.cos(a)};
let walker={x:p.x+n.x*.6,z:p.z+n.z*.6};
assert(nav.walkable(walker));for(let i=0;i<100;i++)walker=nav.move(walker,-n.x*.04,-n.z*.04);
assert((walker.x-p.x)*n.x+(walker.z-p.z)*n.z>.13,'walking must stop at the closed panel');
assert(doors.toggle('d1'));finish();assert.equal(connector.fraction,1);assert(nav.approach(professor,spawn),'opening must restore a path without rebuilding the grid');

const entry=doors.records.find(r=>r.id==='d2');assert.equal(entry.poses[0].width,1);assert.equal(entry.poses[1].width,1);
assert(doors.toggle('d2'));doors.tick(.2);
assert(entry.leaves[0].rotation.y*entry.leaves[1].rotation.y<0,'double leaves must swing from their outside hinges');
assert(doors.toggle('d2'));finish();assert.equal(entry.fraction,1,'a second click during closing must reopen');
assert(doors.toggle('d2'));finish();assert.equal(entry.fraction,0);assert(entry.leaves.every(l=>Math.abs(l.rotation.y)<1e-9));
assert(doors.toggle('d2'));finish();

// Compare collision endpoints to Three's real world transforms, including mirror and swing.
let variants=0;
for(const mode of ['polygon','voxel'])for(const hinge of ['left','right'])for(const swing of [-85,85])for(const leaves of [1,2]){
 const plan=clone(layout);const o=plan.openings.find(o=>o.id==='d1');Object.assign(o,{hinge,swing,leaves});
 const model=room(kit(mode),[],[],{},{...plan,objects:[]});const runtime=createDoors({layout:plan,root:model});const r=runtime.records.find(r=>r.id==='d1');
 runtime.toggle(r.id);runtime.tick(.29);model.updateMatrixWorld(true);
 const segments=doorSegments(plan,o,r.fraction);
 r.leaves.forEach((leaf,i)=>{
  const end=leaf.localToWorld(new T.Vector3(r.poses[i].direction*(r.poses[i].width-.035),0,0));
  const start=leaf.getWorldPosition(new T.Vector3());assert(Math.hypot(end.x-segments[i].b.x,end.z-segments[i].b.z)<1e-8);assert(Math.hypot(start.x-segments[i].a.x,start.z-segments[i].a.z)<1e-8);
 });
 const geometries=new Set(),materials=new Set();model.traverse(n=>{if(n.geometry)geometries.add(n.geometry);if(n.material)materials.add(n.material)});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());variants++;
}

const segment=doorSegments(layout,connector.opening,0)[0];people=[{x:(segment.a.x+segment.b.x)/2,z:(segment.a.z+segment.b.z)/2,radius:.14}];
assert(!doors.toggle('d1'),'closing onto a person must be refused');assert.equal(connector.fraction,1);assert.equal(blocked,1);
people=[];assert(doors.toggle('d1'));doors.tick(.1);
const entering=doorSegments(layout,connector.opening,.6)[0];people=[{x:(entering.a.x+entering.b.x)/2,z:(entering.a.z+entering.b.z)/2,radius:.25}];
for(let i=0;i<12;i++)doors.tick(.025);assert.equal(connector.target,1,'someone entering the sweep must reverse a closing door');people=[];finish();
assert.equal(connector.fraction,1);assert.equal(JSON.stringify(layout),original,'opening doors must not edit the saved architecture');
assert(layout.rooms.every(r=>r.height===3));assert.equal(segmentDistance(segment.a,segment),0);
assert.equal(doors.tick(.05),false,'idle doors must not keep invalidating renders');
assert.equal(doors.toggle('unknown-door'),false);assert(notifications>0);
console.log(JSON.stringify({pass:true,doors:2,variant_geometry_checks:variants,closed_collision:true,dynamic_routes:true,double_leaf_reversal:true,occupied_sweep:true,saved_layout_unchanged:true,idle_rendering_unchanged:true}));
