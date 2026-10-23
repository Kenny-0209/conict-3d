// Pure camera and facing geometry, shared with the CPU checks.
export function thirdPersonView({x,z,yaw,pitch=0,aspect=1}){
 const distance=aspect<.75?8.8:7.4,elevation=Math.max(.62,Math.min(1.15,.88-pitch*.55)),azimuth=yaw+.30;
 const horizontal=Math.cos(elevation)*distance;
 return {position:[x-Math.sin(azimuth)*horizontal,.85+Math.sin(elevation)*distance,z-Math.cos(azimuth)*horizontal],target:[x+Math.sin(yaw)*.65,.85,z+Math.cos(yaw)*.65],fov:aspect<.75?58:55};
}
export function facingScore({player,yaw,target,primary=false}){
 const distance=Math.hypot(target.x-player.x,target.z-player.z),angle=Math.abs(Math.atan2(Math.sin(Math.atan2(target.x-player.x,target.z-player.z)-yaw),Math.cos(Math.atan2(target.x-player.x,target.z-player.z)-yaw)));
 if(distance>2.2||angle>Math.PI*.25)return Infinity;
 return distance+angle*.9-(primary?.25:0);
}
