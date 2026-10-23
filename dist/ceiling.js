import * as T from './vendor/three.module.js';
import {WALL_HEIGHT,roomBounds,contains,openingPosition,doorPassage} from './layout.js';

// Thin flush fixtures follow each editable room, including concave boundaries.
export function ceilingFixtures(layout){
 const result=[];
 for(const room of layout.rooms){
  const b=roomBounds(room),width=b.maxX-b.minX,depth=b.maxZ-b.minZ;
  const nx=Math.max(1,Math.ceil(width/3)),nz=Math.max(1,Math.ceil(depth/3));
  const w=Math.min(1.18,width*.65),d=Math.min(.28,depth*.45);
  for(let ix=0;ix<nx;ix++)for(let iz=0;iz<nz;iz++){
   const x=b.minX+(ix+.5)*width/nx,z=b.minZ+(iz+.5)*depth/nz;
   if(![-1,1].every(sx=>[-1,1].every(sz=>contains(room.points,{x:x+sx*(w/2+.04),z:z+sz*(d/2+.04)}))))continue;
   result.push({roomId:room.id,x,z,width:w,depth:d});
  }
 }
 return result;
}

function tileLines(room){
 const points=[],b=roomBounds(room);
 for(const axis of ['x','z']){
  const other=axis==='x'?'z':'x',min=axis==='x'?b.minX:b.minZ,max=axis==='x'?b.maxX:b.maxZ;
  for(let at=Math.ceil(min/.6)*.6;at<max;at+=.6){
   const crossings=[];
   room.points.forEach((a,i)=>{const c=room.points[(i+1)%room.points.length];if((a[axis]>at)!==(c[axis]>at))crossings.push(a[other]+(at-a[axis])*(c[other]-a[other])/(c[axis]-a[axis]))});
   crossings.sort((a,b)=>a-b);
   for(let i=0;i+1<crossings.length;i+=2)for(const v of [crossings[i],crossings[i+1]])points.push(new T.Vector3(axis==='x'?at:v,WALL_HEIGHT-.002,axis==='z'?at:v));
  }
 }
 return points;
}

export function createCeiling(layout){
 const root=new T.Group();root.name='3m ceiling and flush LED panels';root.userData.layoutKind='ceiling';root.visible=false;
 const surface=new T.MeshBasicMaterial({color:'#efeee8',side:T.BackSide});
 const seams=new T.LineBasicMaterial({color:'#c7cdc4',transparent:true,opacity:.32,depthWrite:false});
 const frame=new T.MeshBasicMaterial({color:'#dfe2dc'});
 const diffuser=new T.MeshBasicMaterial({color:'#fffef8',toneMapped:false});
 const panels=[];
 for(const room of layout.rooms){
  const shape=new T.Shape();room.points.forEach((p,i)=>i?shape.lineTo(p.x,-p.z):shape.moveTo(p.x,-p.z));shape.closePath();
  const roof=new T.Mesh(new T.ShapeGeometry(shape),surface);roof.name=room.name+' ceiling';roof.rotation.x=-Math.PI/2;roof.position.y=WALL_HEIGHT;root.add(roof);
  const lines=new T.LineSegments(new T.BufferGeometry().setFromPoints(tileLines(room)),seams);root.add(lines);
 }
 // Cover the small bridge between independently edited room boundaries too.
 for(const opening of layout.openings.filter(o=>o.kind==='door')){
  const p=openingPosition(layout,opening);if(!p)continue;const passage=doorPassage(layout,opening);if(passage.wallIds.length<2)continue;
  const a=p.rotation*Math.PI/180,g=new T.Group();g.position.set(p.x+Math.sin(a)*passage.centerZ,WALL_HEIGHT,p.z+Math.cos(a)*passage.centerZ);g.rotation.y=a;
  const bridge=new T.Mesh(new T.PlaneGeometry(opening.width,passage.depth),surface);bridge.rotation.x=-Math.PI/2;g.add(bridge);root.add(g);
 }
 for(const f of ceilingFixtures(layout)){
  const group=new T.Group();group.name='Flush LED · '+f.roomId;group.position.set(f.x,WALL_HEIGHT-.016,f.z);
  group.add(new T.Mesh(new T.BoxGeometry(f.width+.04,.032,f.depth+.04),frame));
  const panel=new T.Mesh(new T.BoxGeometry(f.width,.008,f.depth),diffuser);panel.position.y=-.020;group.add(panel);root.add(group);panels.push(panel);
 }
 root.traverse(n=>{n.castShadow=false;n.receiveShadow=false});
 return {root,panels,setFirstPerson:visible=>{root.visible=!!visible},dispose(){
  root.removeFromParent();const geometries=new Set(),materials=new Set();root.traverse(n=>{if(n.geometry)geometries.add(n.geometry);if(n.material)materials.add(n.material)});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());
 }};
}
