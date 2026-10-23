import assert from 'node:assert/strict';
import * as T from './dist/vendor/three.module.js';
import {defaultLayout} from './dist/layout.js';
import {createNavigation} from './dist/navigation.js';
import {createPCMotion} from './dist/pc-motion.js';
import {firstBreaks,nextBreak,wanderGoal,BREAK_MIN,BREAK_MAX} from './dist/roam-policy.js';
import {NPC_TURN_RATE,headingDifference} from './dist/movement.js';
const rng=seed=>()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
const layout=defaultLayout(),nav=createNavigation(layout);
function makeItems(){return layout.objects.map(o=>{const node=new T.Group();node.position.set(o.x,o.y,o.z);node.rotation.y=o.rotation*Math.PI/180;node.scale.set(o.scaleX,o.scaleY,o.scaleZ);if(o.kind!=='seat')return {o,node};const body=new T.Group();body.rotation.y=Math.PI;body.userData.pose=()=>{};body.userData.gait=()=>{};body.userData.updateWork=()=>{};node.add(body);node.userData.avatar=body;node.updateMatrixWorld(true);return {o,node,person:{name:o.id}}})}
const motion=createPCMotion({items:makeItems(),nav,random:rng(24)}),initial=motion.records.map(r=>r.breakRemaining),histories=motion.records.map(()=>[]),goals=motion.records.map(()=>new Set()),returned=new Set(),modes=new Set();
assert(initial.every(x=>x>=6&&x<46));assert(initial.some((x,i)=>i&&x<initial[i-1]),'first departure order must not follow seat order');
assert.notDeepEqual(firstBreaks(8,rng(25)),initial,'a new visit must shuffle again');
const intervalRandom=rng(321),delays=Array.from({length:30},()=>nextBreak(intervalRandom));assert(delays.every(x=>x>=BREAK_MIN&&x<=BREAK_MAX));
for(let frame=0;frame<15000;frame++){
 const before=motion.records.map(r=>({count:r.breakCount,yaw:r.body.rotation.y,pos:{...r.pos}}));motion.tick(.08);
 for(const [i,r] of motion.records.entries()){
  modes.add(r.mode);assert(Number.isFinite(r.pos.x)&&Number.isFinite(r.pos.z));
  assert(Math.abs(headingDifference(before[i].yaw,r.body.rotation.y))<=NPC_TURN_RATE*.08+1e-8,'walking and arrival turns must stay smooth');
  if(['roam','return','lounge-walk','brew','drink'].includes(r.mode))assert(nav.walkable(r.pos),r.item.o.id+' '+r.mode+' crosses a wall or furniture');
  if(r.breakCount!==before[i].count){histories[i].push({time:frame*.08,type:r.lastActivity,delay:r.breakRemaining,speed:r.walkSpeed});assert(r.breakRemaining>=BREAK_MIN&&r.breakRemaining<=BREAK_MAX)}
  for(const goal of r.recentGoals)goals[i].add(goal.x.toFixed(3)+','+goal.z.toFixed(3));
  assert(r.recentGoals.length<=3,'destination memory must stay bounded');
  if(r.mode==='seated'&&r.breakCount){returned.add(i);assert(Math.hypot(r.pos.x-r.seat.x,r.pos.z-r.seat.z)<.001)}
  if(r.activity)assert.equal(motion.lounge.owners.get(r.activity.slot.id),r);
 }
 assert(motion.lounge.owners.size<=4);
 if(frame===5000||frame===10000){const before=motion.records.map(r=>[r.mode,r.breakRemaining,r.pos.x,r.pos.z]);motion.setStates(Object.fromEntries(motion.records.map(r=>[r.item.o.seatId,frame===5000?'no-response':'online'])));assert.deepEqual(motion.records.map(r=>[r.mode,r.breakRemaining,r.pos.x,r.pos.z]),before)}
}
assert(modes.has('roam')&&modes.has('rest')&&modes.has('brew'));assert.equal(returned.size,8);
for(const [i,h] of histories.entries()){
 assert(h.length>=4,'every member must keep departing');assert(new Set(h.map(x=>x.delay.toFixed(2))).size>=4,'the interval must be rerolled every time');
 assert(new Set(h.map(x=>x.type)).size>=2,'activity must keep changing');assert(goals[i].size>=3,'walking must visit different positions');
 for(let j=1;j<h.length;j++)assert(h[j].time-h[j-1].time>=h[j-1].delay-.16,'a person must not depart early');
}
// No navigable destinations, or a temporarily closed connection: do not teleport or spin.
assert.equal(wanderGoal({...nav,walkable:()=>false},nav.spawn(),[],rng(2)),null);
let searches=0;assert.equal(wanderGoal({...nav,walkable:()=>true,path:()=>{searches++;return null}},nav.spawn(),[],rng(3)),null);assert(searches<=3,'failed path searches must be bounded');
const r=motion.records[0],due=r.breakRemaining;motion.tick(.04,r.item.o.id,1000);assert.equal(r.breakRemaining,due);r.body.visible=false;motion.tick(.04,undefined,1000);assert.equal(r.breakRemaining,due);
console.log(JSON.stringify({pass:true,seconds:1200,initialDelays:initial,modes:[...modes],allEightReturned:returned.size===8,distinctGoals:goals.map(s=>s.size),histories}));
