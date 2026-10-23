import assert from 'node:assert/strict';
import {defaultLayout,upgradeLayout,allWalls,contains,clone} from './dist/layout.js';
import {createNavigation} from './dist/navigation.js';
import {preset} from './dist/seed.js';
const layout=defaultLayout(),nav=createNavigation(layout),spawn=nav.spawn();
assert(nav.walkable(spawn));assert.equal(layout.objects.length,preset.objects.length);assert(layout.rooms.every(r=>r.height===3));
assert.equal(layout.objects.find(o=>o.id==='f13').kind,'media-tv');
const raw=clone(layout);raw.objects.find(o=>o.id==='f13').kind='cat';raw.appliedUpdates=raw.appliedUpdates.filter(x=>x!=='album-tv-2026-10-15');const migrated=upgradeLayout(raw);
assert.deepEqual(migrated.rooms,layout.rooms);assert.deepEqual(migrated.openings,layout.openings);assert.equal(migrated.objects.find(o=>o.id==='f13').x,layout.objects.find(o=>o.id==='f13').x);
assert.deepEqual(upgradeLayout(migrated),migrated);
const targets=layout.objects.filter(o=>o.kind==='seat'||['media-tv','coffee-cabinet','prof-table'].includes(o.kind));
for(const o of targets){const a=nav.approach(o,spawn);assert(a,`${o.id} must be reachable from the entry`);let from=spawn;for(const p of a.path){assert(nav.clear(from,p),`${o.id} path crosses an obstacle`);from=p}assert(nav.walkable(a.point))}
assert(!nav.walkable({x:50,z:50}));assert(!nav.walkable({x:object('coffee-cab').x,z:object('coffee-cab').z}));
function object(id){return layout.objects.find(o=>o.id===id)}
const door=layout.openings.find(o=>o.id==='d1'),prof=nav.approach(object('seat-s8'),spawn);assert(prof);assert(prof.path.some(p=>p.x>4.585));
for(const p of prof.path)assert(nav.floor(p));
let p=spawn;for(let i=0;i<800;i++)p=nav.move(p,.04,0);assert(nav.floor(p));assert(p.x<11.315);
const closed=clone(layout);closed.openings=closed.openings.filter(o=>o.id!==door.id);const closedNav=createNavigation(closed);assert.equal(closedNav.approach(object('seat-s8'),spawn),null,'rooms must not connect through solid walls');
const moved=clone(layout);moved.objects.find(o=>o.id==='f13').x-=.1;assert.equal(upgradeLayout(moved).objects.find(o=>o.id==='f13').x,moved.objects.find(o=>o.id==='f13').x);
console.log(`PASS: ${targets.length} destinations, doorway connection, blocked walls, collision sliding, TV migration, saved layout preservation`);

const {createGuest}=await import('./dist/guest.js');const g=createGuest(),before=g.body.userData.head.position.y;assert.equal(g.body.userData.arms.length,2);assert.equal(g.body.userData.legs.length,2);g.pose(1);assert(g.body.userData.head.position.y<before-.3);g.pose(.5);g.gait(1,true);g.wave(.5);g.pose(0);assert.equal(g.body.userData.head.position.y,before);g.root.traverse(n=>{if(n.geometry?.attributes.position)assert(n.geometry.attributes.position.array.every(Number.isFinite))});console.log('PASS: articulated full-body walk, wave and standing-to-sitting pose');

// Check movement against Three's actual camera basis, rather than duplicating yaw math.
const T=await import('./dist/vendor/three.module.js');
const {movementDirection,turnYaw,walkingAction}=await import('./dist/movement.js');
for(const yaw of [0,Math.PI/2,-Math.PI/2,Math.PI,-Math.PI*.35]){
 const camera=new T.PerspectiveCamera();camera.lookAt(new T.Vector3(Math.sin(yaw),0,Math.cos(yaw)));camera.updateMatrixWorld();
 const right=new T.Vector3().setFromMatrixColumn(camera.matrixWorld,0),forward=camera.getWorldDirection(new T.Vector3());
 for(const [action,basis,sign] of [['right',right,1],['left',right,-1],['forward',forward,1],['back',forward,-1]]){
  const d=movementDirection(yaw,[action]),v=new T.Vector3(d.x,0,d.z);assert(Math.abs(v.dot(basis)-sign)<1e-8,action+' must match the camera view');
 }
 const diagonal=movementDirection(yaw,['forward','right']);assert(Math.abs(Math.hypot(diagonal.x,diagonal.z)-1)<1e-8);
 const cancelled=movementDirection(yaw,['left','right','forward','back']);assert(Math.hypot(cancelled.x,cancelled.z)===0);
 for(const [direction,sign] of [['left',-1],['right',1]]){const angle=turnYaw(yaw,direction);assert(new T.Vector3(Math.sin(angle),0,Math.cos(angle)).dot(right)*sign>0)}
}
assert.equal(walkingAction({code:'KeyW',key:'ㅈ'}),'forward');assert.equal(walkingAction({code:'KeyA',key:'ㅁ'}),'left');assert.equal(walkingAction({code:'ArrowRight',key:'ArrowRight'}),'right');assert.equal(walkingAction({key:'W'}),'forward');
console.log('PASS: camera-relative arrows, reversed-view movement, normalized diagonals, look buttons, Korean keyboard layout');

const {avatar,kit}=await import('./dist/models.js');
const {members}=await import('./dist/data.js');
for(const mode of ['polygon','voxel'])for(const member of members){
 const model=avatar(kit(mode),member,false),rig=model.userData;
 assert.equal(rig.modelRevision,'human-v2-2026-10-15');assert(JSON.stringify(rig).length<200,'rig references must not inflate GLB metadata');assert.equal(rig.elbows.length,2);assert.equal(rig.knees.length,2);assert.equal(rig.hands.length,2);
 const standing=new T.Box3().setFromObject(model);assert(standing.max.y>1.70&&standing.max.y<1.85);assert(standing.min.y>-.03);
 const wristBefore=rig.hands[1].getWorldPosition(new T.Vector3());rig.wave(.5);model.updateMatrixWorld(true);const wristAfter=rig.hands[1].getWorldPosition(new T.Vector3());assert(wristAfter.distanceTo(wristBefore)>.15,'hands must follow the waved arm');
 rig.pose(1);model.updateMatrixWorld(true);const seatedBox=new T.Box3().setFromObject(model);assert(seatedBox.max.y>1.3&&seatedBox.max.y<1.5);assert(seatedBox.min.y>-.04);assert(seatedBox.min.y<.07,'seated feet must reach the floor');
 for(const hand of rig.hands){const y=hand.getWorldPosition(new T.Vector3()).y;assert(y>.71&&y<.82,'hands must reach the 74cm desk')}
 for(const t of [0,.25,.5,.75,1]){rig.pose(t);model.updateMatrixWorld(true);model.traverse(n=>{if(n.geometry?.attributes.position)assert(n.geometry.attributes.position.array.every(Number.isFinite));assert(n.matrixWorld.elements.every(Number.isFinite))})}
}
console.log('PASS: all 8 members × 2 styles, anatomical height, articulated hands, desk posture, seated feet and finite pose interpolation');
