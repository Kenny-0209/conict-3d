import {clone,clamp,legacyLayout,roomBounds,footprints,contains,validateLayout} from './layout.js';

function median(values){const a=values.slice().sort((a,b)=>a-b);return a.length?(a[Math.floor((a.length-1)/2)]+a[Math.ceil((a.length-1)/2)])/2:0}
export function scaleForRoom(l,kind,roomId){const group=l.objects.filter(o=>o.roomId===roomId),ref=group.find(o=>o.kind===kind)||group.find(o=>o.kind==='seat')||group[0];return ref?{scaleX:ref.scaleX,scaleY:ref.scaleY,scaleZ:ref.scaleZ}:{scaleX:1,scaleY:1,scaleZ:1}}
export function objectCorners(o){const [w,d]=footprints[o.kind],a=o.rotation*Math.PI/180,c=Math.cos(a),s=Math.sin(a),offset=o.kind==='seat'?.38:0;return [-1,1].flatMap(x=>[-1,1].map(z=>{const px=x*w*o.scaleX/2,pz=(z*d/2+offset)*o.scaleZ;return {x:o.x+c*px+s*pz,z:o.z-s*px+c*pz}}))}
function inside(r,o){return objectCorners(o).every(p=>contains(r.points,p))}
function keepInside(r,o){if(inside(r,o))return false;const b=roomBounds(r),cx=(b.minX+b.maxX)/2,cz=(b.minZ+b.maxZ)/2;const corners=objectCorners(o),minX=Math.min(...corners.map(p=>p.x-o.x)),maxX=Math.max(...corners.map(p=>p.x-o.x)),minZ=Math.min(...corners.map(p=>p.z-o.z)),maxZ=Math.max(...corners.map(p=>p.z-o.z));o.x=clamp(o.x,b.minX+.08-minX,b.maxX-.08-maxX);o.z=clamp(o.z,b.minZ+.08-minZ,b.maxZ-.08-maxZ);if(inside(r,o))return true;const start={x:o.x,z:o.z};for(let i=1;i<=50;i++){o.x=start.x+(cx-start.x)*i/50;o.z=start.z+(cz-start.z)*i/50;if(inside(r,o))return true}return true}

// One-shot correction: infer prior room translation from matched furniture,
// retain the saved arrangement, and apply one uniform scale per room.
export function fitSavedFurniture(raw,reference=legacyLayout()){
 const l=validateLayout(clone(raw)),report=[];
 for(const r of l.rooms){const refRoom=reference.rooms.find(x=>x.id===r.id);if(!refRoom)continue;const objects=l.objects.filter(o=>o.roomId===r.id),pairs=objects.map(o=>({o,ref:reference.objects.find(x=>x.id===o.id&&x.kind===o.kind)})).filter(p=>p.ref);if(!pairs.length)continue;
  const rb=roomBounds(refRoom),b=roomBounds(r),scale=clamp(Math.min((b.maxX-b.minX)/(rb.maxX-rb.minX),(b.maxZ-b.minZ)/(rb.maxZ-rb.minZ)),.4,1.6),dx=median(pairs.map(p=>p.o.x-p.ref.x)),dz=median(pairs.map(p=>p.o.z-p.ref.z)),oldX=(rb.minX+rb.maxX)/2+dx,oldZ=(rb.minZ+rb.maxZ)/2+dz,cx=(b.minX+b.maxX)/2,cz=(b.minZ+b.maxZ)/2;
  let corrected=0;for(const o of objects){o.x=cx+(o.x-oldX)*scale;o.z=cz+(o.z-oldZ)*scale;o.y*=scale;o.scaleX*=scale;o.scaleY*=scale;o.scaleZ*=scale;if(keepInside(r,o))corrected++}
  report.push({roomId:r.id,name:r.name,scale,objects:objects.length,positionCorrections:corrected});
 }
 l.updatedAt=new Date().toISOString();return {layout:validateLayout(l),report};
}
