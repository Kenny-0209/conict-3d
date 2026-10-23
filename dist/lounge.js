import * as T from './vendor/three.module.js';
import {localPoint} from './navigation.js';

// Reservations include the walk to a station: three sofa places, one brewer.
// Targets come from editable furniture transforms, rather than a second floor plan.
export function createLounge({items,nav,random=Math.random}){
 const slots=[],owners=new Map();
 for(const item of items){
  const o=item.o;
  if(o.kind==='sofa-3')for(const [i,x] of [-.64,0,.64].entries())slots.push({id:o.id+'-'+i,type:'rest',item,pos:localPoint(o,x,-.025),entry:localPoint(o,x,.92),yaw:o.rotation*Math.PI/180});
  if(o.kind==='coffee-cabinet'){
   const tools=items.find(i=>i.o.kind==='coffee-tools'&&i.o.roomId===o.roomId&&Math.hypot(i.o.x-o.x,i.o.z-o.z)<.65);
   if(!tools)continue;
   const kettle=tools.node.getObjectByName('gooseneck kettle');
   let stream=null,home=null;
   if(kettle){
    home={p:kettle.position.clone(),q:kettle.quaternion.clone()};
    stream=new T.Mesh(new T.CylinderGeometry(.003,.004,1,6),new T.MeshBasicMaterial({color:'#c8e2df',transparent:true,opacity:.7}));
    stream.name='Pouring water';stream.visible=false;stream.userData.dynamic=true;tools.node.add(stream);
   }
   const pos=localPoint(o,0,.50);
   slots.push({id:o.id+'-brew',type:'coffee',item,tools,kettle,stream,home,pos,entry:pos,yaw:o.rotation*Math.PI/180+Math.PI});
  }
 }
 function brew(slot,t){
  if(!slot?.kettle)return;
  const {kettle,home,stream}=slot,u=Math.min(1,t/.9,Math.max(0,(8-t)/.9));
  kettle.position.copy(home.p).lerp(new T.Vector3(-.20,.314,.015),u);
  kettle.quaternion.copy(home.q).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,0,1),-.4*u));
  const spout=new T.Vector3(.193,.168,0).applyQuaternion(kettle.quaternion).add(kettle.position),bottom=.29;
  stream.visible=u>.95;stream.position.set(spout.x,(spout.y+bottom)/2,spout.z);stream.scale.y=Math.max(.001,spout.y-bottom);
 }
 function release(record){
  for(const slot of slots)if(owners.get(slot.id)===record){
   owners.delete(slot.id);
   if(slot.kettle){slot.kettle.position.copy(slot.home.p);slot.kettle.quaternion.copy(slot.home.q);slot.stream.visible=false}
  }
 }
 function reserve(record,type,start=record.pos){
  const available=slots.filter(s=>s.type===type&&!owners.has(s.id)),offset=Math.floor(random()*available.length);
  for(let i=0;i<available.length;i++){
   const slot=available[(i+offset)%available.length];
   if(!nav.walkable(slot.entry))continue;
   const path=nav.path(start,slot.entry);
   if(!path)continue;
   release(record);owners.set(slot.id,record);return {slot,path};
  }
  return null;
 }
 return {slots,owners,reserve,release,brew};
}
