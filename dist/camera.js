import {contains} from './layout.js';

// Monitor screens face local +Z; the chair sits on that side of the desk.
// Use the editable seat transform, rather than a fixed world-space offset.
export function seatView(position,layout,aspect=1){
 const a=position.rotation*Math.PI/180,sx=position.scaleX,sy=position.scaleY,sz=position.scaleZ;
 const dx=Math.cos(a)*.38*sx+Math.sin(a)*2.6*sz,dz=-Math.sin(a)*.38*sx+Math.cos(a)*2.6*sz;
 const room=layout.rooms.find(r=>r.id===position.roomId)||layout.rooms.find(r=>contains(r.points,position));
 let fraction=1;
 if(room&&contains(room.points,position)){
  // Stop inside the first room boundary, so a full-height wall cannot hide the seat.
  for(let i=1;i<=100;i++){const t=i/100;if(!contains(room.points,{x:position.x+dx*t,z:position.z+dz*t})){fraction=Math.max(0,(i-1)/100-.12/Math.hypot(dx,dz));break}}
 }
 const targetY=position.y+.98*sy,horizontal=Math.hypot(dx,dz)*fraction,fov=50;
 const frameDistance=1.75*sx/(2*Math.tan(fov*Math.PI/360)*Math.max(.45,aspect))*1.12;
 const rise=Math.max(1.4*sy,Math.sqrt(Math.max(0,frameDistance*frameDistance-horizontal*horizontal)));
 return {position:[position.x+dx*fraction,targetY+rise,position.z+dz*fraction],target:[position.x,targetY,position.z],fov};
}
