// One-time additions to existing user layouts. Room boundaries and seat positions stay editable.
export const LAYOUT_UPDATE='lab-furniture-2026-10-15';
export const USER_BASELINE='2026-10-14T15:33:58.516Z';
export const PROF_TABLE_UPDATE='prof-side-table-2026-10-15';
export const LOUNGE_UPDATE='coffee-lounge-2026-10-17';

export function applyLoungeUpdate(layout){
 if(layout.appliedUpdates?.includes(LOUNGE_UPDATE))return layout;
 const room=layout.rooms.find(r=>r.id==='r1'),coffee=layout.objects.find(o=>o.id==='coffee-cab'),tools=layout.objects.find(o=>o.id==='coffee-tools');
 if(!room||!coffee)return layout;
 const north=Math.min(...room.points.map(p=>p.z)),west=Math.min(...room.points.map(p=>p.x));
 if(!layout.objects.some(o=>o.id==='lounge-sofa'))layout.objects.push({id:'lounge-sofa',kind:'sofa-3',name:'커피 휴식 공간 · 3인 소파',x:west+1.66,z:north+.56,y:0,rotation:0,scaleX:1,scaleY:1,scaleZ:1,roomId:room.id});
 // Reorient the existing counter beside the sofa, with both fronts facing the aisle.
 // The marker makes later manual moves/deletions permanent across page reloads.
 Object.assign(coffee,{x:west+3.68,z:north+.33,rotation:0});
 if(tools)Object.assign(tools,{x:coffee.x,z:coffee.z,rotation:coffee.rotation,y:coffee.y+.78*coffee.scaleY,scaleX:coffee.scaleX,scaleY:coffee.scaleY,scaleZ:coffee.scaleZ});
 layout.appliedUpdates=[...(layout.appliedUpdates||[]),LOUNGE_UPDATE];
 return layout;
}

export function applyProfTableUpdate(layout){
 if(layout.appliedUpdates?.includes(PROF_TABLE_UPDATE))return layout;
 const room=layout.rooms.find(r=>r.id==='r2'),seat=layout.objects.find(o=>o.seatId==='s8'&&o.roomId==='r2');
 if(!room||!seat)return layout;
 if(!layout.objects.some(o=>o.id==='prof-side-table')){
  const fridge=layout.objects.find(o=>o.id==='f25'&&o.roomId===room.id),bookcase=layout.objects.find(o=>o.id==='f21'&&o.roomId===room.id);
  const minZ=Math.min(...room.points.map(p=>p.z));
  // The saved professor desk faces west: its right wall is the north (-Z) wall.
  // In the photo, this table occupies the gap between the fridge and the bookcase.
  const x=fridge&&bookcase?(fridge.x+.25*fridge.scaleX+bookcase.x-.765*bookcase.scaleX)/2:seat.x-3.64;
  layout.objects.push({id:'prof-side-table',kind:'side-table',name:'교수실 보조 테이블',x,z:minZ+.385,y:0,rotation:0,scaleX:1,scaleY:1,scaleZ:1,roomId:room.id});
 }
 layout.appliedUpdates=[...(layout.appliedUpdates||[]),PROF_TABLE_UPDATE];
 return layout;
}

export function applyLabUpdate(layout){
 if(layout.appliedUpdates?.includes(LAYOUT_UPDATE))return layout;
 const room=layout.rooms.find(r=>r.id==='r1'),seat=layout.objects.find(o=>o.seatId==='s7');
 if(!room||!seat)return layout;
 const maxX=Math.max(...room.points.map(p=>p.x)),maxZ=Math.max(...room.points.map(p=>p.z));
 const add=(id,kind,name,x,z,rotation=0,y=0)=>{
  if(!layout.objects.some(o=>o.id===id))layout.objects.push({id,kind,name,x,z,y,rotation,scaleX:1,scaleY:1,scaleZ:1,roomId:room.id});
 };
 // S7 looks toward -Z in the saved plan; this window-wall corner is on their right.
 // Keep the adjoining professor-room doorway (Z 1.64–2.96) clear.
 const cabinetZ=maxZ-.32;
 for(let i=0;i<3;i++)add('printer-cab-'+(i+1),'wood-cabinet','프린터 수납장 '+(i+1),maxX-1.78+i*.63,cabinetZ,180);
 const printer=layout.objects.find(o=>o.id==='f20'&&o.kind==='printer');
 if(printer)Object.assign(printer,{x:maxX-1.15,z:cabinetZ,y:.74,rotation:180,scaleX:1,scaleY:1,scaleZ:1});
 const lamp=layout.objects.find(o=>o.id==='f19'&&o.kind==='lamp');
 if(lamp)Object.assign(lamp,{x:maxX-2.4,z:maxZ-.29});
 const purifier=layout.objects.find(o=>o.id==='f18'&&o.kind==='purifier');
 if(purifier)Object.assign(purifier,{kind:'purifier-lab',name:'연구원 공간 공기청정기'});
 // Opposite the west-facing kitchenette, with room between it and the bookcase.
 const sink=layout.objects.find(o=>o.id==='f16'&&o.kind==='kitchen');
 if(sink){
  add('coffee-cab','coffee-cabinet','검정 커피 수납장',sink.x-2.1,sink.z,90);
  add('coffee-tools','coffee-tools','핸드드립 커피 도구',sink.x-2.1,sink.z,90,.78);
 }
 const entry=layout.openings.find(o=>o.id==='d2'&&o.kind==='door');
 if(entry){
  const wallRoom=layout.rooms.find(r=>entry.wallId.startsWith(r.id+'-'));
  const signed=wallRoom?.points.reduce((sum,p,i)=>{const q=wallRoom.points[(i+1)%wallRoom.points.length];return sum+p.x*q.z-q.x*p.z},0);
  Object.assign(entry,{width:2,leaves:2,swing:80*(Math.sign(signed)||1)});
 }
 layout.appliedUpdates=[...(layout.appliedUpdates||[]),LAYOUT_UPDATE];
 return layout;
}

// User clarified that the cat image is a TV display, not a framed artwork.
export function applyTVUpdate(layout){
 const marker='album-tv-2026-10-15';
 if(layout.appliedUpdates?.includes(marker))return layout;
 for(const o of layout.objects)if(o.kind==='cat'){o.kind='media-tv';o.name='연구실 앨범 TV'}
 layout.appliedUpdates=[...(layout.appliedUpdates||[]),marker];return layout;
}

// Separate from the rounded snack table near the fridge. Preserve prior furniture.
export function applyWallTableUpdate(layout){
 const marker='prof-wall-table-2026-10-15';if(layout.appliedUpdates?.includes(marker))return layout;
 const seat=layout.objects.find(o=>o.seatId==='s8'),room=layout.rooms.find(r=>r.id===seat?.roomId);if(!seat||!room)return layout;
 if(!layout.objects.some(o=>o.id==='prof-wall-table')){
  const angle=seat.rotation*Math.PI/180,right={x:Math.cos(angle),z:-Math.sin(angle)},cross=(a,b)=>a.x*b.z-a.z*b.x;
  let nearest=null;
  for(let i=0;i<room.points.length;i++){
   const a=room.points[i],b=room.points[(i+1)%room.points.length],edge={x:b.x-a.x,z:b.z-a.z},delta={x:a.x-seat.x,z:a.z-seat.z},den=cross(right,edge);if(Math.abs(den)<1e-8)continue;
   const distance=cross(delta,edge)/den,t=cross(delta,right)/den;
   if(distance>0&&t>=0&&t<=1&&(!nearest||distance<nearest.distance))nearest={a,b,edge,distance};
  }
  if(!nearest)return layout;
  const length=Math.hypot(nearest.edge.x,nearest.edge.z),axis={x:nearest.edge.x/length,z:nearest.edge.z/length},along=o=>(o.x-nearest.a.x)*axis.x+(o.z-nearest.a.z)*axis.z;
  const bookcase=layout.objects.find(o=>o.id==='f21'&&o.roomId===room.id),lamp=layout.objects.find(o=>o.id==='f27'&&o.roomId===room.id),half=(o,w,d)=>{const a=o.rotation*Math.PI/180;return Math.abs(axis.x*Math.cos(a)-axis.z*Math.sin(a))*w*o.scaleX/2+Math.abs(axis.x*Math.sin(a)+axis.z*Math.cos(a))*d*o.scaleZ/2};
  let at=along({x:seat.x+right.x*nearest.distance,z:seat.z+right.z*nearest.distance});
  if(bookcase&&lamp){const bs=along(bookcase),ls=along(lamp),bh=half(bookcase,1.53,.37),lh=half(lamp,.36,.36);at=bs<ls?(bs+bh+ls-lh)/2:(ls+lh+bs-bh)/2}
  const margin=.70*seat.scaleX+.10;at=Math.max(margin,Math.min(length-margin,at));
  const inset=.30*seat.scaleZ+room.thickness/2+.05;
  layout.objects.push({id:'prof-wall-table',kind:'wall-table',name:'교수실 벽면 탁자',x:nearest.a.x+axis.x*at-right.x*inset,z:nearest.a.z+axis.z*at-right.z*inset,y:0,rotation:-Math.atan2(axis.z,axis.x)*180/Math.PI,scaleX:seat.scaleX,scaleY:seat.scaleY,scaleZ:seat.scaleZ,roomId:room.id});
 }
 layout.appliedUpdates=[...(layout.appliedUpdates||[]),marker];return layout;
}
