// Yaw follows the viewing direction: forward is (sin(yaw), cos(yaw)).
// A camera looking along +Z has screen-right along -X.
const codeActions={KeyW:'forward',ArrowUp:'forward',KeyS:'back',ArrowDown:'back',KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right'};
const keyActions={w:'forward',ArrowUp:'forward',s:'back',ArrowDown:'back',a:'left',ArrowLeft:'left',d:'right',ArrowRight:'right'};
export function walkingAction(event){return codeActions[event.code]||keyActions[event.key]||keyActions[event.key?.toLowerCase()]||null}
export function movementDirection(yaw,directions){
 const held=new Set(directions),front=Number(held.has('forward'))-Number(held.has('back')),side=Number(held.has('right'))-Number(held.has('left')),length=Math.hypot(front,side)||1;
 return {x:(Math.sin(yaw)*front-Math.cos(yaw)*side)/length,z:(Math.cos(yaw)*front+Math.sin(yaw)*side)/length};
}
export function turnYaw(yaw,direction,angle=Math.PI/8){return yaw+(direction==='left'?1:-1)*angle}

export const NPC_TURN_RATE=3.4;
export function headingDifference(from,to){return Math.atan2(Math.sin(to-from),Math.cos(to-from))}
export function smoothFacing(current,target,dt){
 if(!(dt>0))return current;
 const delta=headingDifference(current,target),step=delta*(-Math.expm1(-dt/.20)),limit=NPC_TURN_RATE*dt;
 return current+Math.max(-limit,Math.min(limit,step));
}
