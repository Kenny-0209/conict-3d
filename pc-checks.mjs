import assert from 'node:assert/strict';
import {normalizePresence,createPresenceClient,MAX_AGE} from './dist/presence.js';
import {createPCMotion,isWorking} from './dist/pc-motion.js';
import * as T from './dist/vendor/three.module.js';
import {defaultLayout} from './dist/layout.js';
import {createNavigation} from './dist/navigation.js';
import {reconcilePCBindings,recordsForSeats} from './pc-bindings.mjs';
const now=Date.now(),snapshot={observedAt:new Date(now).toISOString(),seats:{s1:{state:'online'},s2:{state:'no-response'}}};
assert.deepEqual(normalizePresence(snapshot,['s1','s2','s3'],now),{s1:'online',s2:'no-response',s3:'unknown'});
assert.equal(normalizePresence({...snapshot,seats:{s2:{state:'no-response',consecutiveMisses:1}}},['s2'],now).s2,'no-response','the first missed ping must be reported without changing a break schedule');
const addressChange=reconcilePCBindings({s1:{hostname:'LAB-PC',macs:['AABBCCDDEE01'],ip:'192.168.0.20'}},{s1:'192.168.0.20'},[{ip:'192.168.0.21',hostname:'LAB-PC',mac:'AA-BB-CC-DD-EE-01',state:'no-response',pingState:'no-response',identityResponded:true,identitySource:'netbios'}]);
assert.equal(addressChange.assignments.s1,'192.168.0.21','NetBIOS can still identify a PC after its DHCP address changes');
assert.equal(recordsForSeats(addressChange.hosts,addressChange.assignments,[{ip:'192.168.0.21',mac:'AA-BB-CC-DD-EE-01',state:'no-response',identityResponded:true}]).s1.state,'no-response','identity response must not override a missed ICMP ping');
for(const bad of [null,{...snapshot,error:'collector failed'},{...snapshot,observedAt:'bad'},{...snapshot,observedAt:new Date(now-MAX_AGE-1).toISOString()},{...snapshot,observedAt:new Date(now+6000).toISOString()}])assert(Object.values(normalizePresence(bad,['s1','s2'],now)).every(s=>s==='unknown'));
let result,fail=false;
globalThis.location={href:'http://localhost/'};
const client=createPresenceClient({seatIds:['s1','s2'],clock:()=>now,onChange:data=>result=data,fetcher:async()=>{if(fail)throw new Error('offline');return {ok:true,json:async()=>snapshot}},interval:100000});
client.connect('http://127.0.0.1:5178/api/status');await new Promise(r=>setTimeout(r,10));assert.equal(result.states.s1,'online');fail=true;await client.refresh();assert.equal(result.states.s1,'unknown');assert.equal(result.states.s2,'unknown');assert.throws(()=>client.connect('file:///etc/passwd'));client.close();
const layout=defaultLayout(),nav=createNavigation(layout),items=layout.objects.filter(o=>o.kind==='seat').map(o=>{const node=new T.Group(),body=new T.Group();node.position.set(o.x,o.y,o.z);node.rotation.y=o.rotation*Math.PI/180;node.scale.set(o.scaleX,o.scaleY,o.scaleZ);node.add(body);body.position.z=.85;node.userData.avatar=body;body.userData.pose=t=>body.userData.amount=t;body.userData.gait=()=>{};body.userData.workSamples=0;body.userData.updateWork=()=>body.userData.workSamples++;node.updateMatrixWorld(true);return {node,o,person:{name:o.id,professor:o.seatId==='s8'}}});
let seed=1;const random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296),motion=createPCMotion({items,nav,random}),states=Object.fromEntries(items.map(i=>[i.o.seatId,'no-response']));
motion.records.forEach(r=>r.breakRemaining=1000000);motion.tick(.04);assert(motion.records.every(r=>isWorking(r)&&r.body.userData.workSamples===1),'unconnected introduction avatars must type and request redraws');
motion.setStates(states);const stopped=motion.records.map(r=>r.body.userData.workSamples);
assert(motion.records.every(r=>r.mode==='seated'),'ping changes must not make everyone stand together');
for(let frame=0;frame<550;frame++){motion.tick(.04);for(const r of motion.records){assert(Number.isFinite(r.body.position.x));assert.equal(r.mode,'seated','missing break furniture must leave people at their desks')}}
assert(motion.records.every((r,i)=>!isWorking(r)&&r.body.userData.workSamples===stopped[i]),'explicit missed responses rest the hands');
motion.setStates(Object.fromEntries(items.map(i=>[i.o.seatId,'online'])));for(let frame=0;frame<2400;frame++)motion.tick(.04);for(const r of motion.records){assert.equal(r.mode,'seated',r.item.o.id+' must return to its own desk');assert.equal(r.amount,1);assert(r.body.userData.workSamples>0,'online seated avatars must visibly type');assert(Math.hypot(r.pos.x-r.seat.x,r.pos.z-r.seat.z)<.001)}
motion.setStates(states);for(let frame=0;frame<75;frame++)motion.tick(.04);const timers=motion.records.map(r=>r.breakRemaining);motion.setStates({});assert.deepEqual(motion.records.map(r=>r.breakRemaining),timers,'collector failure must not reset individual timers');
console.log('PASS: freshness, invalid data, collector errors, strict ICMP identity binding, independent PC visuals, missing-furniture waiting, online typing and unchanged individual timers');
