import assert from 'node:assert/strict';
import {isCompactViewport,joystickVector,analogMovementDirection} from './dist/mobile-core.js';
import {movementDirection} from './dist/movement.js';

for(const [width,height,coarse,expected] of [[390,844,false,true],[320,568,false,true],[844,390,false,true],[1024,768,true,true],[1366,1024,true,true],[1366,768,false,false],[1920,1080,false,false],[1920,1080,true,false]]){
 assert.equal(isCompactViewport({width,height,coarse}),expected,`viewport ${width}x${height}, coarse=${coarse}`);
}
assert.deepEqual(joystickVector(0,0),{side:0,forward:0,x:0,y:0});
assert.equal(joystickVector(2,1).forward,0,'a resting thumb must not creep');
assert.equal(joystickVector(0,-34).forward,1,'pushing up walks forward');
assert.equal(joystickVector(34,0).side,1,'pushing right strafes right');
let samples=0;
for(let x=-160;x<=160;x+=8)for(let y=-160;y<=160;y+=8){
 const v=joystickVector(x,y),opposite=joystickVector(-x,-y);
 assert(Math.hypot(v.forward,v.side)<=1+1e-12,'diagonal walking cannot run faster');
 assert(Math.hypot(v.x,v.y)<=34+1e-12,'thumb stays inside the control');
 assert(Math.abs(v.forward+opposite.forward)<1e-12&&Math.abs(v.side+opposite.side)<1e-12,'opposite pushes are symmetric');samples++;
}
for(const yaw of [0,.4,Math.PI/2,Math.PI,-Math.PI/2])for(const [action,forward,side] of [['forward',1,0],['back',-1,0],['left',0,-1],['right',0,1]]){
 const touch=analogMovementDirection(yaw,forward,side),keyboard=movementDirection(yaw,[action]);
 assert(Math.hypot(touch.x-keyboard.x,touch.z-keyboard.z)<1e-12,`${action} follows the same camera coordinates`);
}
assert.equal(Math.hypot(...Object.values(analogMovementDirection(0,.5,0))),.5,'analog speed follows thumb strength');
assert.deepEqual(analogMovementDirection(.3,0,0),{x:0,z:0},'release stops movement');
console.log(`PASS: viewport rotation/touch detection, ${samples} joystick positions, dead zone, bounded diagonal speed, keyboard parity and neutral stop`);
