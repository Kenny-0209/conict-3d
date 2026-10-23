import assert from 'node:assert/strict';
import * as T from './dist/vendor/three.module.js';
import {defaultLayout} from './dist/layout.js';
import {createNavigation} from './dist/navigation.js';
import {createPCMotion} from './dist/pc-motion.js';

const layout=defaultLayout(),nav=createNavigation(layout),o=layout.objects.find(o=>o.seatId==='s3'),node=new T.Group(),body=new T.Group();
node.position.set(o.x,o.y,o.z);node.rotation.y=o.rotation*Math.PI/180;node.add(body);node.userData.avatar=body;body.userData.pose=()=>{};body.userData.gait=()=>{};node.updateMatrixWorld(true);
const couch=layout.objects.find(o=>o.kind==='sofa-3'),motion=createPCMotion({items:[{o,node,person:{name:'Worker'}},{o:couch,node:new T.Group()}],nav,random:()=>.5}),r=motion.records[0];
motion.setStates({s3:'online'});
const delay=r.breakRemaining,seatPos={...r.pos};
motion.tick(0,o.id,delay+1);assert.equal(r.breakRemaining,delay,'a personal-site interaction pauses only that person');
body.visible=false;motion.tick(0,undefined,delay+1);assert.equal(r.breakRemaining,delay,'hidden personal avatars must not take offscreen breaks');body.visible=true;
const blockers=Array.from({length:3},()=>({pos:nav.spawn()}));for(const b of blockers)assert(motion.lounge.reserve(b,'rest'));
motion.tick(.01,undefined,delay+.01);assert.equal(r.mode,'seated');assert.equal(r.breakCount,0);assert.deepEqual(r.pos,seatPos,'busy furniture must leave the worker at their desk');
blockers.forEach(b=>motion.lounge.release(b));motion.tick(0,undefined,8);assert.equal(r.mode,'stand');assert.equal(r.breakCount,1);assert.equal(r.breakRemaining,180);
for(let i=0;i<2500&&r.mode!=='seated';i++)motion.tick(.04);assert.equal(r.mode,'seated');
const left=r.breakRemaining;motion.tick(.01,undefined,left-.01);assert.equal(r.mode,'seated','a slow render frame uses elapsed time without starting early');motion.tick(.01,undefined,.02);assert.equal(r.mode,'stand');assert.equal(r.breakCount,2,'next departure occurs at 180 elapsed seconds');
console.log(JSON.stringify({status:'PASS',busyFurnitureWaitsAtDesk:true,pausedAvatarKeepsTimer:true,hiddenAvatarKeepsTimer:true,elapsedTimeIndependentOfAnimationStep:true,onlineWorkerTakesRepeatedBreaks:true}));
