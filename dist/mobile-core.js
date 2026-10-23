// Shared, DOM-free geometry for touch layouts and two-axis movement.
export function isCompactViewport({width,height,coarse=false}){
 return width<=760||(coarse&&width<=1366)||(width<=1024&&height<=500);
}
export function joystickVector(dx,dy,radius=34,deadZone=.13){
 const distance=Math.hypot(dx,dy),travel=Math.min(distance,radius),strength=Math.max(0,(travel/radius-deadZone)/(1-deadZone));
 return {side:strength&&distance?dx/distance*strength:0,forward:strength&&distance?-dy/distance*strength:0,x:distance?dx/distance*travel:0,y:distance?dy/distance*travel:0};
}
export function analogMovementDirection(yaw,forward,side){
 const length=Math.max(1,Math.hypot(forward,side));forward/=length;side/=length;
 return {x:Math.sin(yaw)*forward-Math.cos(yaw)*side,z:Math.cos(yaw)*forward+Math.sin(yaw)*side};
}
