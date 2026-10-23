import assert from 'node:assert/strict';
import * as T from './dist/vendor/three.module.js';
import {thirdPersonView,facingScore} from './dist/walk-view.js';
import {createTargetOutline} from './dist/target-outline.js';

let frames=0;
for(const aspect of [320/568,390/844,844/390,932/430,16/9])for(const pitch of [-.6,0,.55])for(const yaw of [0,Math.PI/2,Math.PI,-Math.PI/2]){
 const frame=thirdPersonView({x:3,z:-4,yaw,pitch,aspect});
 assert(frame.position.every(Number.isFinite));
 assert(frame.position[1]>4,'third-person camera stays above full-height walls, even looking up');
 assert(Math.hypot(frame.position[0]-3,frame.position[2]+4)>2,'camera does not collapse into a close rear view');
 const camera=new T.PerspectiveCamera(frame.fov,aspect,.035,150);camera.position.set(...frame.position);camera.lookAt(new T.Vector3(...frame.target));camera.updateMatrixWorld();
 for(const height of [0,1.75]){const projected=new T.Vector3(3,height,-4).project(camera);assert(Math.abs(projected.x)<.85&&Math.abs(projected.y)<.85&&projected.z<1,'full guest stays inside portrait and landscape frames')}
 frames++;
}
for(const yaw of [-Math.PI,0,Math.PI/2,Math.PI]){
 const player={x:1,z:2},point=(angle,d)=>({x:1+Math.sin(yaw+angle)*d,z:2+Math.cos(yaw+angle)*d});
 assert(Number.isFinite(facingScore({player,yaw,target:point(0,2)})));
 assert.equal(facingScore({player,yaw,target:point(Math.PI,1)}),Infinity,'objects behind the guest are not interaction targets');
 assert.equal(facingScore({player,yaw,target:point(Math.PI/2,1)}),Infinity,'side objects are outside the facing cone');
 assert.equal(facingScore({player,yaw,target:point(0,2.3)}),Infinity,'far objects cannot be activated');
 assert(facingScore({player,yaw,target:point(0,1)})<facingScore({player,yaw,target:point(.6,1)}),'facing straight ahead has priority at equal distance');
}
const scene=new T.Scene(),node=new T.Group(),geometry=new T.BoxGeometry(1,1,1),material=new T.MeshBasicMaterial(),mesh=new T.Mesh(geometry,material),person=new T.Mesh(geometry,material);
node.add(mesh,person);person.userData.personSeat='seat';scene.add(node);node.position.set(2,0,-1);
const outline=createTargetOutline(scene),item={node};outline.set(item);
assert(outline.root.visible&&outline.root.children.length===1,'outline follows the selected object without duplicating animated people');
assert(outline.root.children[0].geometry.getAttribute('position').count>0);
node.position.x=4;assert(outline.update());assert.equal(outline.root.children[0].matrix.elements[12],4,'outline follows transformed doors or furniture');
assert.equal(mesh.material,material,'highlight does not replace object materials');
outline.set(null);assert(!outline.root.visible&&outline.root.children.length===0,'no target leaves no stale outline');
let originalDisposed=false;geometry.addEventListener('dispose',()=>originalDisposed=true);outline.dispose();assert(!originalDisposed,'disposing outlines preserves original scene geometry');geometry.dispose();material.dispose();
console.log(`PASS: ${frames} oblique camera frames, full avatar visibility in both orientations, facing cone/range, target transforms, outline reset and resource ownership`);
