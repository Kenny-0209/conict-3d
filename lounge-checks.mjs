import assert from 'node:assert/strict';
import * as T from './dist/vendor/three.module.js';
import {defaultLayout,upgradeLayout,clone,footprints} from './dist/layout.js';
import {LOUNGE_UPDATE} from './dist/updates.js';
import {createNavigation,localPoint} from './dist/navigation.js';
import {createPCMotion} from './dist/pc-motion.js';
import {createLounge} from './dist/lounge.js';
import {coffeeSip} from './dist/lounge-rig.js';
import {kit,sofa,coffeeTools} from './dist/models.js';
import {batchStaticRoom} from './dist/static-batch.js';

const layout=defaultLayout(),nav=createNavigation(layout),root=new T.Group(),k=kit();
const items=layout.objects.map(o=>{
 const node=new T.Group();node.position.set(o.x,o.y,o.z);node.rotation.y=o.rotation*Math.PI/180;node.scale.set(o.scaleX,o.scaleY,o.scaleZ);node.userData.layoutKind='object';root.add(node);
 if(o.kind==='sofa-3')node.add(sofa(k));
 if(o.kind==='coffee-tools')node.add(coffeeTools(k));
 if(o.kind!=='seat')return {o,node};
 const body=new T.Group();body.userData.pose=amount=>body.userData.amount=amount;body.userData.gait=()=>{};body.userData.updateWork=()=>{};node.userData.avatar=body;node.add(body);
 return {o,node,person:{name:o.id}};
});root.updateMatrixWorld(true);
const couch=layout.objects.find(o=>o.kind==='sofa-3'),counter=layout.objects.find(o=>o.id==='coffee-cab');
assert.deepEqual(footprints['sofa-3'],[2.16,.94]);
assert.equal(layout.objects.filter(o=>o.kind==='sofa-3').length,1);
assert.equal(layout.appliedUpdates.filter(x=>x===LOUNGE_UPDATE).length,1);
const edited=clone(layout);edited.objects.find(o=>o.id===counter.id).x+=.3;edited.objects=edited.objects.filter(o=>o.id!==couch.id);
assert.deepEqual(upgradeLayout(edited),edited,'a manual deletion/move must survive reload');
const sofaBounds=new T.Box3().setFromObject(items.find(i=>i.o===couch).node);
assert(sofaBounds.min.x>-3.025&&sofaBounds.min.z>-4.15,'sofa must clear the bookcase and north wall');
assert(sofaBounds.max.x<counter.x-1.15/2,'sofa must clear the counter');
assert(!nav.walkable(couch),'sofa is a solid navigation obstacle');
batchStaticRoom(root);
const kettle=root.getObjectByName('gooseneck kettle');assert(kettle.children.length>4,'batching must preserve the moving kettle');
let seed=9;const random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
const motion=createPCMotion({items,nav,random}),off=Object.fromEntries(motion.records.map(r=>[r.item.o.seatId,'no-response'])),on=Object.fromEntries(motion.records.map(r=>[r.item.o.seatId,'online']));
assert.equal(motion.lounge.slots.filter(s=>s.type==='rest').length,3);
assert.equal(motion.lounge.slots.filter(s=>s.type==='coffee').length,1);
for(const s of motion.lounge.slots){assert(nav.walkable(s.entry),s.id+' entry must be clear');assert(nav.path(nav.spawn(),s.entry),s.id+' must be reachable')}
// Work, offline and unknown PCs all share the same independent break cadence.
motion.setStates(on);
assert(motion.records.every(r=>r.mode==='seated'));
const initial=motion.records.map(r=>r.breakRemaining),departuresBySeat=motion.records.map(()=>[]),previousCounts=motion.records.map(()=>0),returned=new Set(),observed=new Set();
assert(new Set(initial.map(x=>x.toFixed(3))).size===8,'first departures must be staggered');
assert(initial.every(x=>x>=6&&x<46));
assert(new Set(initial.map(x=>Math.floor((x-6)/5))).size>4,'first departures must be visibly spread');
let maxRest=0,maxBrew=0,sips=0,pours=0,stateIsolation=false;
for(let frame=0;frame<22500;frame++){
 const time=(frame+1)*.04;
 const beforeMotion=motion.records.map(r=>({mode:r.mode,coffee:r.hasCoffee,elapsed:r.activity?.elapsed}));
 motion.tick(.04);
 const resting=motion.records.filter(r=>r.mode==='rest'),brewing=motion.records.filter(r=>r.mode==='brew');maxRest=Math.max(maxRest,resting.length);maxBrew=Math.max(maxBrew,brewing.length);
 assert(resting.length<=3&&brewing.length<=1);assert(motion.lounge.owners.size<=4);
 for(const [i,r] of motion.records.entries()){
  const previous=beforeMotion[i];if(previous.coffee&&['rest','drink'].includes(previous.mode)&&r.mode!==previous.mode)assert.equal(coffeeSip(previous.elapsed+.04).phase,'hold','finish lowering the cup before leaving the break');
  observed.add(r.mode);assert(Number.isFinite(r.body.position.x)&&Number.isFinite(r.body.position.y));
  if(['roam','lounge-walk','return','brew','drink'].includes(r.mode))assert(nav.walkable(r.pos),r.item.o.id+' '+r.mode+' must be on walkable floor');
  if(r.activity)assert.equal(motion.lounge.owners.get(r.activity.slot.id),r);
  if(r.hasCoffee&&r.loungeRig.cup.visible)sips++;
  if(r.breakCount!==previousCounts[i]){assert.equal(r.breakCount,previousCounts[i]+1);departuresBySeat[i].push(time);previousCounts[i]=r.breakCount}
  if(r.mode==='seated'&&r.breakCount>0){returned.add(i);assert(Math.hypot(r.pos.x-r.seat.x,r.pos.z-r.seat.z)<.001)}
 }
 if(root.getObjectByName('Pouring water')?.visible)pours++;
 if(!stateIsolation&&resting.length){
  const before=motion.records.map(r=>({mode:r.mode,pos:{...r.pos},amount:r.amount,due:r.breakRemaining,slot:r.activity?.slot.id}));
  for(const states of [off,{},on]){motion.setStates(states);assert.deepEqual(motion.records.map(r=>({mode:r.mode,pos:{...r.pos},amount:r.amount,due:r.breakRemaining,slot:r.activity?.slot.id})),before,'PC changes must neither cancel breaks nor reset timers')}
  stateIsolation=true;
 }
 if(frame===5000)motion.setStates({});
 if(frame===10000)motion.setStates(off);
 if(frame===15000)motion.setStates(on);
}
assert(maxRest>=1&&maxBrew===1&&sips>0&&pours>0);assert(stateIsolation);assert.equal(returned.size,8);
for(const times of departuresBySeat){assert(times.length>=3,'every person must keep taking breaks');for(let i=1;i<times.length;i++)assert(times[i]-times[i-1]>=116.99,'no new departure before the minimum random interval')}
const capacity=motion.lounge;
for(const r of motion.records)capacity.release(r);
const reservations=Array.from({length:4},()=>({pos:nav.spawn()}));
for(let i=0;i<3;i++)assert(capacity.reserve(reservations[i],'rest'));
assert.equal(capacity.reserve(reservations[3],'rest'),null,'fourth person must wait');reservations.forEach(r=>capacity.release(r));
const moved={...couch,x:8,z:3,rotation:90,scaleX:1.2,scaleZ:.8};
const transformed=createLounge({items:[{o:moved,node:new T.Group()}],nav:{walkable:()=>true,path:(_,p)=>[p]},random:()=>0});
assert.deepEqual(transformed.slots[0].entry,localPoint(moved,-.64,.92),'rest positions follow editor rotation and scale');
const blocked=createLounge({items,nav:{walkable:()=>false},random});assert.equal(blocked.reserve({pos:nav.spawn()},'rest'),null);assert.equal(blocked.owners.size,0);
// Force the busy-sofa fallback, which this deterministic full-room run does not hit.
for(const r of motion.records){capacity.release(r);r.mode='seated';r.breakRemaining=10000}
const standing=motion.records[0],coffeeSlot=capacity.slots.find(s=>s.type==='coffee');
standing.mode='drink';standing.hasCoffee=true;standing.pos={...coffeeSlot.pos};standing.activity={slot:coffeeSlot,elapsed:6.8,duration:16};capacity.owners.set(coffeeSlot.id,standing);
for(let i=0;i<40;i++){motion.tick(.04);assert.equal(standing.mode,'drink','standing drink must not vanish halfway through lowering')}
for(let i=0;i<10;i++)motion.tick(.04);assert.equal(standing.mode,'return');assert(!standing.hasCoffee);
const restSlot=capacity.slots.find(s=>s.type==='rest');standing.mode='rest';standing.amount=1;standing.hasCoffee=true;standing.pos={...restSlot.pos};standing.activity={slot:restSlot,elapsed:4.9,duration:4.9};capacity.owners.set(restSlot.id,standing);
for(let i=0;i<85;i++){motion.tick(.04);assert.equal(standing.mode,'rest','a rest deadline must wait for the sip to finish')}
for(let i=0;i<5;i++)motion.tick(.04);assert.equal(standing.mode,'lounge-unwind');
for(let i=0;i<12;i++){motion.tick(.04);assert.equal(standing.amount,1,'stay seated while releasing the recline')}
for(let i=0;i<8;i++)motion.tick(.04);assert.equal(standing.mode,'lounge-stand');
console.log(JSON.stringify({status:'PASS',seconds:900,maxRest,maxBrew,sips,pours,observed:[...observed],stateIsolation,allEightReturned:returned.size===8,initialDelays:initial,departuresBySeat,editableTransforms:true,kettleSurvivesBatching:true,standingDrinkFinishesLowering:true,seatedSipFinishesBeforeStanding:true}));
