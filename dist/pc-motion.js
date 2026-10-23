import * as T from './vendor/three.module.js';
import {avatar,kit} from './models.js';
import {localPoint} from './navigation.js';
import {createLounge} from './lounge.js';
import {createLoungeRig,coffeeSip} from './lounge-rig.js';
import {smoothFacing,headingDifference} from './movement.js';
import {nextBreak,firstBreaks,activityChoices,wanderGoal} from './roam-policy.js';

// Supports both the published morph rig and the newer joint rig without replacing model files.
function rigFor(item){
  const original=item.node.userData.avatar;
  if(original.userData.pose)return original;
  const k=kit('polygon'),body=avatar(k,item.person,false),sit=avatar(k,item.person,true),a=[],b=[];
  body.traverse(n=>{a.push(n);if(n.geometry)n.geometry=n.geometry.clone()});sit.traverse(n=>b.push(n));
  const poses=a.map((n,i)=>{const q=b[i];if(!q||q.type!==n.type)throw new Error('인물 자세 구조 불일치');const p=n.geometry?.attributes.position,t=q.geometry?.attributes.position;return {n,p:n.position.clone(),q:q.position.clone(),r:n.quaternion.clone(),s:q.quaternion.clone(),scale:n.scale.clone(),toScale:q.scale.clone(),from:p&&p.count===t?.count?new Float32Array(p.array):null,to:p&&p.count===t?.count?new Float32Array(t.array):null}});
  for(const p of poses)if(p.from&&!p.from.some((v,i)=>Math.abs(v-p.to[i])>1e-7)){p.from=null;p.to=null}
  const pose=t=>{for(const p of poses){p.n.position.lerpVectors(p.p,p.q,t);p.n.quaternion.slerpQuaternions(p.r,p.s,t);p.n.scale.lerpVectors(p.scale,p.toScale,t);if(p.from){const pos=p.n.geometry.attributes.position;for(let i=0;i<p.from.length;i++)pos.array[i]=p.from[i]+(p.to[i]-p.from[i])*t;pos.needsUpdate=true;p.n.geometry.computeVertexNormals();p.n.geometry.computeBoundingSphere()}}};
  const gait=(phase,moving)=>{body.userData.legs.forEach((n,i)=>n.rotation.x=Math.sin(phase+i*Math.PI)*(moving?.28:0));body.userData.arms.forEach((n,i)=>n.rotation.x=-Math.sin(phase+i*Math.PI)*(moving?.18:0))};
  Object.defineProperties(body.userData,{pose:{value:pose},gait:{value:gait}});
  body.position.copy(original.position);body.rotation.copy(original.rotation);item.node.remove(original);item.node.add(body);item.node.userData.avatar=body;
  const geometries=new Set();for(const root of [original,sit])root.traverse(n=>{if(n.geometry)geometries.add(n.geometry)});for(const g of geometries)g.dispose();
  return body;
}
export const BREAK_INTERVAL=180;
// Unconnected introduction avatars still work; an explicit missed response
// rests their hands. LAN presence remains a separate PC indicator.
export const isWorking=r=>r.mode==='seated'&&r.state!=='no-response'&&typeof r.body.userData.updateWork==='function';
export function createPCMotion({items,nav,random=Math.random}){
  const lounge=createLounge({items,nav,random});
  const people=items.filter(i=>i.person&&i.node.userData.avatar);
  const initialDelays=firstBreaks(people.length,random);
  const records=people.map((item,index)=>{
    const body=rigFor(item),seat=localPoint(item.o,0,.85),approach=nav.approach(item.o,nav.spawn()||seat)?.point;
    body.traverse(n=>n.userData.personSeat=item.o.id);body.userData.pose(1);
    const screens=[];item.node.traverse(n=>{if(n.userData.screen){n.material=n.material.clone();screens.push(n)}});
    const breakRemaining=initialDelays[index];
    return {item,body,seat,approach:approach||seat,state:'unknown',mode:'seated',pos:{...seat},route:[],amount:1,phase:random()*Math.PI*2,wait:0,screens,activity:null,hasCoffee:false,breakRemaining,scheduleRetry:0,breakCount:0,lastActivity:null,wander:null,recentGoals:[],walkSpeed:.65,loungeRig:createLoungeRig(body)};
  });
  const place=r=>{const p=r.item.node.worldToLocal(new T.Vector3(r.pos.x,r.item.o.y,r.pos.z));r.body.position.copy(p)};
  const face=(r,yaw,dt)=>{const target=yaw-r.item.node.rotation.y;r.body.rotation.y=smoothFacing(r.body.rotation.y,target,dt);return Math.abs(headingDifference(r.body.rotation.y,target))};
  function release(r){lounge.release(r);r.activity=null;r.hasCoffee=false;r.loungeRig.clear()}
  function returnHome(r){release(r);r.wander=null;r.amount=0;r.body.userData.pose(0);r.mode='return';r.route=nav.path(r.pos,r.approach)||[]}
  function setStates(states){for(const r of records){const state=states[r.item.o.seatId]||'unknown';if(state===r.state)continue;r.state=state;r.item.pcState=state;for(const s of r.screens)s.material.color.set(state==='online'?'#ffffff':state==='no-response'?'#101820':'#56636a');
    if(r.mode==='seated'&&state==='no-response')r.body.userData.pose(1);
    // Presence controls PC visuals, never the independent fictional break schedule.
  }}
  // Initial screen tint also distinguishes unconnected introduction avatars from live online PCs.
  for(const r of records){r.item.pcState='unknown';for(const s of r.screens)s.material.color.set('#56636a')}
  function startBreak(r,type,start=r.pos){
    const reserved=lounge.reserve(r,type,start);if(!reserved)return false;
    r.activity={slot:reserved.slot,elapsed:0,duration:16+random()*18};r.route=reserved.path;r.mode='lounge-walk';r.wait=0;return true;
  }
  function finishBreak(r){returnHome(r);r.wait=0}
  function findWander(r,start){return wanderGoal(nav,start,r.recentGoals,random,records.filter(other=>other!==r&&other.body.visible).map(other=>other.pos))}
  function rememberGoal(r,point){r.recentGoals.push({...point});if(r.recentGoals.length>3)r.recentGoals.shift()}
  function startWander(r,start){
    const goal=findWander(r,start);if(!goal)return false;
    release(r);r.wander={remaining:1+Math.floor(random()*3),elapsed:0,duration:28+random()*28,failures:0};r.route=goal.path;rememberGoal(r,goal.point);r.wait=0;return true;
  }
  function arrived(r){
    if(r.mode!=='lounge-walk')return;
    r.activity.elapsed=0;
    if(r.activity.slot.type==='rest'){r.mode='lounge-sit';r.amount=0}
    else{r.mode='brew';r.amount=0}
  }
  function tick(dt,pausedSeat,elapsed=dt){for(const r of records){if(r.item.o.id===pausedSeat||!r.body.visible)continue;r.phase+=dt*7;
    r.breakRemaining=Math.max(0,r.breakRemaining-elapsed);r.scheduleRetry=Math.max(0,r.scheduleRetry-elapsed);
    if(r.mode==='stand'||r.mode==='sit'){
      const sitting=r.mode==='sit',turn=face(r,r.item.node.rotation.y+Math.PI,dt);
      if(sitting&&r.amount===0&&turn>.09){r.body.userData.pose(0);r.body.userData.gait(r.phase,false,0);place(r);continue}
      r.amount=T.MathUtils.clamp(r.amount+(sitting?dt:-dt)*1.4,0,1);r.body.userData.pose(r.amount);
      const u=r.amount*r.amount*(3-2*r.amount);r.pos={x:T.MathUtils.lerp(r.approach.x,r.seat.x,u),z:T.MathUtils.lerp(r.approach.z,r.seat.z,u)};place(r);
      if(sitting&&r.amount===1){r.mode='seated';if(r.breakRemaining===0)r.breakRemaining=nextBreak(random)}
      if(!sitting&&r.amount===0)r.mode=r.wander?'roam':'lounge-walk';continue;
    }
    if(r.mode==='seated'){
      if(isWorking(r))r.body.userData.updateWork(r.phase/7*1000);
      if(r.breakRemaining===0&&r.scheduleRetry===0){
        // Plan from the clear aisle before standing; unavailable destinations do not move the body.
        let chosen=null;for(const type of activityChoices(r.lastActivity,random))if(type==='walk'?startWander(r,r.approach):startBreak(r,type,r.approach)){chosen=type;break}
        if(chosen){r.mode='stand';r.lastActivity=chosen;r.walkSpeed=.50+random()*.24;r.breakRemaining=nextBreak(random);r.breakCount++}
        else r.scheduleRetry=4+random()*3;
      }
      continue;
    }
    if(r.mode==='lounge-sit'||r.mode==='lounge-stand'){
      const sitting=r.mode==='lounge-sit',slot=r.activity.slot;
      const turn=face(r,slot.yaw,dt);if(sitting&&r.amount===0&&turn>.09){r.body.userData.pose(0);r.body.userData.gait(r.phase,false,0);place(r);if(r.hasCoffee)r.loungeRig.carry();continue}
      r.amount=T.MathUtils.clamp(r.amount+(sitting?dt:-dt)*1.25,0,1);r.body.userData.pose(r.amount);
      const u=r.amount*r.amount*(3-2*r.amount);r.pos={x:T.MathUtils.lerp(slot.entry.x,slot.pos.x,u),z:T.MathUtils.lerp(slot.entry.z,slot.pos.z,u)};
      place(r);if(r.hasCoffee)r.loungeRig.carry(r.amount);
      if(sitting&&r.amount===1){r.mode='rest';r.activity.elapsed=0}
      if(!sitting&&r.amount===0)finishBreak(r);
      continue;
    }
    if(r.mode==='lounge-unwind'){
      const a=r.activity;a.unwind+=dt;face(r,a.slot.yaw,dt);place(r);
      const u=T.MathUtils.smoothstep(a.unwind,0,.7);r.loungeRig.animate('rest',a.elapsed,{hasCoffee:r.hasCoffee,slot:a.slot,relax:1-u});
      if(a.unwind>=.7)r.mode='lounge-stand';continue;
    }
    if(['rest','brew','drink'].includes(r.mode)){
      const a=r.activity,turn=face(r,a.slot.yaw,dt);place(r);
      if(r.mode!=='rest'&&a.elapsed===0&&turn>.09){r.body.userData.pose(0);r.body.userData.gait(r.phase,false,0);if(r.hasCoffee)r.loungeRig.carry();continue}
      a.elapsed+=dt;
      if(r.mode==='brew')lounge.brew(a.slot,a.elapsed);
      r.loungeRig.animate(r.mode,a.elapsed,{hasCoffee:r.hasCoffee,slot:a.slot,relax:T.MathUtils.smoothstep(a.elapsed,0,1.1)});
      if(r.mode==='brew'&&a.elapsed>=8){
        r.hasCoffee=true;
        if(!startBreak(r,'rest')){r.mode='drink';a.elapsed=0;lounge.brew(a.slot,8)}
      }else if(r.mode==='drink'&&a.elapsed>=8.5&&coffeeSip(a.elapsed).phase==='hold')finishBreak(r);
      else if(r.mode==='rest'&&a.elapsed>=a.duration&&(!r.hasCoffee||coffeeSip(a.elapsed).phase==='hold')){r.mode='lounge-unwind';a.unwind=0}
      continue;
    }
    if(r.mode==='roam'){
      r.wander.elapsed+=dt;
      if(r.wander.elapsed>=r.wander.duration){finishBreak(r);continue}
    }
    if(r.wait>0){r.wait-=dt;if(r.body.userData.walkDuration)r.body.userData.gait(r.phase,false,0);continue}
    if(!r.route.length){
      if(r.mode==='roam'){
        if(r.wander.remaining<=0){finishBreak(r);continue}
        const goal=findWander(r,r.pos);
        if(!goal){if(++r.wander.failures>=3)finishBreak(r);else r.wait=.7+random()*1.4;continue}
        r.wander.remaining--;r.wander.failures=0;r.route=goal.path;rememberGoal(r,goal.point);r.wait=.8+random()*2.8;continue;
      }
      if(r.mode==='return'){if(Math.hypot(r.pos.x-r.approach.x,r.pos.z-r.approach.z)<.035){r.mode='sit';continue}r.route=nav.path(r.pos,r.approach)||[];if(!r.route.length){r.wait=2;continue}}
      else if(r.mode==='lounge-walk'){
        if(Math.hypot(r.pos.x-r.activity.slot.entry.x,r.pos.z-r.activity.slot.entry.z)<.04){arrived(r);continue}
        r.route=nav.path(r.pos,r.activity.slot.entry)||[];if(!r.route.length){finishBreak(r);continue}
      }
    }
    let moving=false,distance=0;if(r.route.length){const p=r.route[0],dx=p.x-r.pos.x,dz=p.z-r.pos.z,d=Math.hypot(dx,dz);if(d<.025){r.route.shift()}else{const turn=face(r,Math.atan2(dx,dz),dt),pace=T.MathUtils.smoothstep(Math.cos(turn),0,.99),step=Math.min(d,dt*r.walkSpeed*pace),next=nav.move(r.pos,dx/d*step,dz/d*step);distance=Math.hypot(next.x-r.pos.x,next.z-r.pos.z);moving=distance>.0001;r.pos=next;if(!moving&&step>.0001){r.route=[];r.wait=.6+random()*.8}}}
    r.body.userData.gait(r.phase,moving,distance);place(r);if(r.hasCoffee)r.loungeRig.carry();
  }}
  return {setStates,tick,records,lounge};
}
