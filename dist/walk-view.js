// Pure camera and facing geometry, shared with the CPU checks.
export function thirdPersonView({x,z,yaw,pitch=0,aspect=1,isBlocked}){
 const distance=aspect<.75?8.8:7.4,base=Math.max(.62,Math.min(1.15,.88-pitch*.55)),azimuth=yaw+.30;
 const frame=elevation=>{const horizontal=Math.cos(elevation)*distance;return {position:[x-Math.sin(azimuth)*horizontal,.85+Math.sin(elevation)*distance,z-Math.cos(azimuth)*horizontal],target:[x+Math.sin(yaw)*.65,.85,z+Math.cos(yaw)*.65],fov:aspect<.75?58:55}};
 const original=frame(base),eye=[x,1.25,z];
 if(!isBlocked||!isBlocked(eye,original.position))return original;
 // Lift the camera above opaque walls; never change scene material opacity.
 let low=base,high=1.52;
 if(isBlocked(eye,frame(high).position))return frame(high);
 for(let i=0;i<8;i++){const middle=(low+high)/2;if(isBlocked(eye,frame(middle).position))low=middle;else high=middle}
 return frame(high);
}
export function facingScore({player,yaw,target,primary=false}){
 const distance=Math.hypot(target.x-player.x,target.z-player.z),angle=Math.abs(Math.atan2(Math.sin(Math.atan2(target.x-player.x,target.z-player.z)-yaw),Math.cos(Math.atan2(target.x-player.x,target.z-player.z)-yaw)));
 if(distance>2.2||angle>Math.PI*.25)return Infinity;
 return distance+angle*.9-(primary?.25:0);
}
