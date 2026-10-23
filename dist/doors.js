import {openingPosition,doorPoses,doorInwardSign} from './layout.js';

const clamp=v=>Math.max(0,Math.min(1,v));
const ease=t=>t*t*(3-2*t);
export function doorName(o){return o.name||(o.id==='d2'?'연구실 출입문':o.id==='d1'?'교수실 연결문':'문')}

// These segments follow the same hinge and panel dimensions as models.js.
export function doorSegments(layout,opening,fraction){
 const p=openingPosition(layout,opening);if(!p)return [];
 const angle=p.rotation*Math.PI/180,cos=Math.cos(angle),sin=Math.sin(angle);
 const world=(x,z)=>({x:p.x+cos*x+sin*z,z:p.z-sin*x+cos*z});
 return doorPoses(opening).map(pose=>{
  const a=pose.rotation*clamp(fraction),length=pose.direction*(pose.width-.035);
  return {a:world(pose.hingeX,0),b:world(pose.hingeX+Math.cos(a)*length,-Math.sin(a)*length),thickness:.025};
 });
}
export function segmentDistance(p,segment){
 const dx=segment.b.x-segment.a.x,dz=segment.b.z-segment.a.z;
 const t=clamp(((p.x-segment.a.x)*dx+(p.z-segment.a.z)*dz)/(dx*dx+dz*dz||1));
 return Math.hypot(p.x-segment.a.x-t*dx,p.z-segment.a.z-t*dz);
}

export function createDoors({layout,root,occupied=()=>[],onChange=()=>{},onBlocked=()=>{},reduced=false}){
 const records=[];
 for(const original of layout.openings.filter(o=>o.kind==='door')){
  const node=root.children.find(n=>n.userData.layoutKind==='opening'&&n.userData.layoutId===original.id);
  if(!node)continue;
  const opening={...original,swing:original.swing||doorInwardSign(layout,original)*80};
  const poses=doorPoses(opening),leaves=node.children.filter(n=>n.userData.doorLeaf);
  if(leaves.length!==poses.length)continue;
  const p=openingPosition(layout,opening),fraction=original.swing===0?0:1;
  const record={id:opening.id,opening,node,leaves,poses,fraction,target:fraction,from:fraction,elapsed:0,moving:false,segments:[],
   object:{...opening,name:doorName(original),x:p.x,z:p.z,y:0,rotation:p.rotation,scaleX:1,scaleY:1,scaleZ:1}};
  records.push(record);apply(record);
 }
 const byId=new Map(records.map(r=>[r.id,r]));
 function apply(r){r.leaves.forEach((leaf,i)=>leaf.rotation.y=r.poses[i].rotation*r.fraction);r.node.updateMatrixWorld(true);r.segments=doorSegments(layout,r.opening,r.fraction)}
 function occupiedAt(r,fraction,people){const segments=doorSegments(layout,r.opening,fraction);return people.some(p=>segments.some(s=>segmentDistance(p,s)<(p.radius??.18)+s.thickness/2+.035))}
 function begin(r,target){r.from=r.fraction;r.target=target;r.elapsed=0;r.moving=Math.abs(r.fraction-target)>.0001;onChange(r)}
 function toggle(id){
  const r=byId.get(id);if(!r)return false;
  const target=r.target===1?0:1;
  if(target===0){const people=occupied();for(let i=0;i<=16;i++)if(occupiedAt(r,r.fraction*(1-i/16),people)){onBlocked(r);return false}}
  begin(r,target);return true;
 }
 function tick(dt){
  let changed=false;
  for(const r of records){
   if(!r.moving)continue;
   r.elapsed+=Math.max(0,dt);const t=Math.min(1,r.elapsed/(reduced?.12:.65));const next=r.from+(r.target-r.from)*ease(t);
   if(r.target===0&&occupiedAt(r,next,occupied())){begin(r,1);onBlocked(r);continue}
   r.fraction=next;apply(r);changed=true;
   if(t===1){r.moving=false;onChange(r)}
  }
  return changed;
 }
 const blocks=(point,radius=.14)=>records.some(r=>r.segments.some(s=>segmentDistance(point,s)<radius+s.thickness/2));
 function actionLabel(id){const r=byId.get(id);return r?r.object.name+' '+(r.target===1?'닫기':'열기'):''}
 function status(id){const r=byId.get(id);return r?(r.moving?(r.target===1?'열리는 중':'닫히는 중'):(r.target===1?'열림':'닫힘')):''}
 return {records,toggle,tick,blocks,actionLabel,status};
}
