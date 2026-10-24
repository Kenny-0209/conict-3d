export const BREAK_MIN=240,BREAK_MAX=420,MAX_AWAY=2;
export const nextBreak=random=>BREAK_MIN+(BREAK_MAX-BREAK_MIN)*random();
export function firstBreaks(count,random){
 const order=Array.from({length:count},(_,i)=>i);
 for(let i=count-1;i>0;i--){const j=Math.floor(random()*(i+1));[order[i],order[j]]=[order[j],order[i]]}
 return order.map(i=>20+i*30+random()*12);
}
export function activityChoices(previous,random){
 const roll=random(),preferred=roll<.45?'walk':roll<.72?'coffee':'rest';
 const rest=['walk','coffee','rest'].filter(type=>type!==preferred);
 if(random()<.5)rest.reverse();
 const order=[preferred,...rest];
 // Prefer a different activity next time, while retaining a usable fallback.
 return [...order.filter(type=>type!==previous),...order.filter(type=>type===previous)];
}
export function wanderGoal(nav,start,recent,random,occupied=[]){
 let searches=0;
 for(let i=0;i<24&&searches<3;i++){
  const angle=random()*Math.PI*2,radius=.8+random()*1.1;
  const point={x:start.x+Math.sin(angle)*radius,z:start.z+Math.cos(angle)*radius};
  if(!nav.walkable(point)||Math.hypot(point.x-start.x,point.z-start.z)<.75||recent.some(p=>Math.hypot(p.x-point.x,p.z-point.z)<.65)||occupied.some(p=>Math.hypot(p.x-point.x,p.z-point.z)<.4))continue;
  searches++;const path=nav.path(start,point);
  if(path?.length){let length=0,previous=start;for(const p of path){length+=Math.hypot(p.x-previous.x,p.z-previous.z);previous=p}if(length<=3)return {point,path}}
 }
 return null;
}
