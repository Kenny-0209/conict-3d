import {contains,allWalls,openingsOnWall,openingPosition,doorPassage,projectToWall,wallLength,planBounds,footprints} from './layout.js';

export function localPoint(o,x,z){const a=o.rotation*Math.PI/180;return {x:o.x+Math.cos(a)*x*o.scaleX+Math.sin(a)*z*o.scaleZ,z:o.z-Math.sin(a)*x*o.scaleX+Math.cos(a)*z*o.scaleZ}}
function rectangle(o,w,d,dx=0,dz=0){const c=localPoint(o,dx,dz);return {x:c.x,z:c.z,a:o.rotation*Math.PI/180,w:w*o.scaleX/2,d:d*o.scaleZ/2}}
function insideBox(p,b,r){const dx=p.x-b.x,dz=p.z-b.z,x=Math.cos(b.a)*dx-Math.sin(b.a)*dz,z=Math.sin(b.a)*dx+Math.cos(b.a)*dz;return Math.abs(x)<b.w+r&&Math.abs(z)<b.d+r}

// Shared metre-based floor and real door holes; windows never become walk-through holes.
export function createNavigation(layout,radius=.14){
 let dynamicObstacle=null;
 const walls=allWalls(layout).filter(w=>w.enabled).map(w=>({...w,doors:openingsOnWall(layout,w).filter(o=>o.kind==='door')}));
 const bridges=layout.openings.filter(o=>o.kind==='door').map(o=>{const p=openingPosition(layout,o),pass=doorPassage(layout,o);if(!p||pass.wallIds.length<2)return null;const a=p.rotation*Math.PI/180;return {x:p.x+Math.sin(a)*pass.centerZ,z:p.z+Math.cos(a)*pass.centerZ,a,w:o.width/2-radius,d:pass.depth/2+.02}}).filter(Boolean);
 const obstacles=[];
 for(const o of layout.objects){
  if(o.kind==='seat'){obstacles.push(rectangle(o,1.6,.86,0,-.03),rectangle(o,.57,.57,0,.82));continue}
  if(o.y>.6||['media-tv','cat','monitors','coffee-tools','partition','plant','printer'].includes(o.kind))continue;
  const f=footprints[o.kind];if(f)obstacles.push(rectangle(o,...f));
 }
 const floor=p=>layout.rooms.some(r=>contains(r.points,p))||bridges.some(b=>insideBox(p,b,0));
 function wallHit(p,r=radius){return walls.some(w=>{const q=projectToWall(w,p);if(q.distance>=w.thickness/2+r)return false;const along=q.t*wallLength(w);return !w.doors.some(o=>Math.abs(along-o.t*wallLength(w))<o.width/2-r)})}
 const walkable=p=>floor(p)&&!wallHit(p)&&!obstacles.some(b=>insideBox(p,b,radius))&&!dynamicObstacle?.(p,radius);
 function move(p,dx,dz){const count=Math.ceil(Math.hypot(dx,dz)/.07)||1,out={...p};for(let i=0;i<count;i++){let q={x:out.x+dx/count,z:out.z+dz/count};if(walkable(q)){Object.assign(out,q);continue}q={x:out.x+dx/count,z:out.z};if(walkable(q))out.x=q.x;q={x:out.x,z:out.z+dz/count};if(walkable(q))out.z=q.z}return out}
 const b=planBounds(layout),step=Math.max(.075,Math.sqrt((b.maxX-b.minX)*(b.maxZ-b.minZ)/50000)),minX=b.minX,minZ=b.minZ,nx=Math.ceil((b.maxX-minX)/step)+1,nz=Math.ceil((b.maxZ-minZ)/step)+1,grid=new Uint8Array(nx*nz);
 const at=i=>({x:minX+(i%nx)*step,z:minZ+Math.floor(i/nx)*step});
 for(let i=0;i<grid.length;i++)if(walkable(at(i)))grid[i]=1;
 function nearest(p,max=.6){let best=-1,dist=max;const x=Math.round((p.x-minX)/step),z=Math.round((p.z-minZ)/step),n=Math.ceil(max/step);for(let j=Math.max(0,z-n);j<=Math.min(nz-1,z+n);j++)for(let k=Math.max(0,x-n);k<=Math.min(nx-1,x+n);k++){const i=j*nx+k;if(!grid[i]||!walkable(at(i)))continue;const d=Math.hypot(at(i).x-p.x,at(i).z-p.z);if(d<dist){best=i;dist=d}}return best}
 function clear(a,b){const n=Math.ceil(Math.hypot(a.x-b.x,a.z-b.z)/.05);for(let j=0;j<=n;j++){const t=n?j/n:0;if(!walkable({x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t}))return false}return true}
 function path(start,end){
  if(walkable(end)&&clear(start,end))return [{...end}];
  const from=nearest(start),to=nearest(end,.45);if(from<0||to<0||!clear(start,at(from)))return null;
  const open=[from],cost=new Float32Array(grid.length).fill(Infinity),parent=new Int32Array(grid.length).fill(-1),closed=new Uint8Array(grid.length);cost[from]=0;
  const h=i=>Math.hypot((i%nx)-(to%nx),Math.floor(i/nx)-Math.floor(to/nx));let found=false;
  while(open.length){let best=0;for(let j=1;j<open.length;j++)if(cost[open[j]]+h(open[j])<cost[open[best]]+h(open[best]))best=j;const i=open.splice(best,1)[0];if(i===to){found=true;break}closed[i]=1;const x=i%nx,z=Math.floor(i/nx);
   for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){const xx=x+dx,zz=z+dz,j=zz*nx+xx;if(xx<0||xx>=nx||zz<0||zz>=nz||!grid[j]||closed[j])continue;if(dx&&dz&&(!grid[z*nx+xx]||!grid[zz*nx+x]))continue;if(!clear(at(i),at(j)))continue;const c=cost[i]+Math.hypot(dx,dz);if(c<cost[j]){cost[j]=c;parent[j]=i;if(!open.includes(j))open.push(j)}}
  }
  if(!found)return null;let list=[],i=to;while(i!==from){list.unshift(at(i));i=parent[i];if(i<0)return null}if(walkable(end)&&clear(at(to),end))list.push({...end});
  const smooth=[];let anchor=start,j=0;while(j<list.length){let k=j;while(k+1<list.length&&clear(anchor,list[k+1]))k++;smooth.push(list[k]);anchor=list[k];j=k+1}return smooth;
 }
 function spawn(){const door=layout.openings.find(o=>o.id==='d2');if(door){const p=openingPosition(layout,door);if(p){for(const s of [1,-1]){const a=p.rotation*Math.PI/180,q={x:p.x+Math.sin(a)*.75*s,z:p.z+Math.cos(a)*.75*s};if(walkable(q))return q}}}for(const r of layout.rooms){const centre={x:r.points.reduce((s,p)=>s+p.x,0)/r.points.length,z:r.points.reduce((s,p)=>s+p.z,0)/r.points.length};const i=nearest(centre,20);if(i>=0)return at(i)}return null}
 function approach(o,start){const candidates=o.kind==='seat'?[localPoint(o,.74,.84),localPoint(o,-.74,.84),localPoint(o,0,1.26),localPoint(o,1.06,.2),localPoint(o,-1.06,.2),localPoint(o,1.06,-.2),localPoint(o,-1.06,-.2)]:['media-tv','cat'].includes(o.kind)?[localPoint(o,0,.75),localPoint(o,.65,.75),localPoint(o,-.65,.75)]:[localPoint(o,0,.75),localPoint(o,0,1.15),localPoint(o,0,-1.15),localPoint(o,1.35,0),localPoint(o,-1.35,0)];let best=null;for(const q of candidates){if(!walkable(q))continue;const route=path(start,q);if(!route)continue;const length=route.reduce((s,p,i)=>s+Math.hypot(p.x-(i?route[i-1]:start).x,p.z-(i?route[i-1]:start).z),0);if(!best||length<best.length)best={point:q,path:route,length}}return best}
 return {walkable,move,path,spawn,approach,clear,wallHit,floor,radius,bounds:b,setDynamicObstacle:fn=>{dynamicObstacle=fn}};
}
