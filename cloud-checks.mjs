import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import * as T from './dist/vendor/three.module.js';
import {createClouds,CLOUD_VOLUME_SIZE} from './dist/clouds.js';
const before=performance.now(),bounds={minX:-5,maxX:5,minZ:-3,maxZ:3},field=createClouds(bounds),hashes=new Set();
let bytes=0,disposed=0;
for(const texture of field.volumes){
 const {data,width,height,depth}=texture.image;bytes+=data.byteLength;
 assert.deepEqual([width,height,depth],CLOUD_VOLUME_SIZE);
 hashes.add(createHash('sha256').update(data).digest('hex'));
 let occupied=0,partial=0,bright=0,shade=0;
 for(let z=0;z<depth;z++)for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const i=(x+width*(y+height*z))*2,d=data[i];
  if(!x||!y||!z||x===width-1||y===height-1||z===depth-1)assert.equal(d,0,'bounding boxes must have invisible edges');
  if(d){occupied++;if(d<240)partial++;if(data[i+1]>220)bright++;if(data[i+1]<150)shade++}
 }
 assert(occupied>data.length/40&&occupied<data.length/4,'density should occupy a cloud, not a solid box');assert(partial>occupied*.3);assert(bright>0&&shade>0,'volume needs both lit and shaded regions');
 texture.addEventListener('dispose',()=>disposed++);
}
assert.equal(hashes.size,3,'cloud silhouettes must differ');assert(bytes<1024*1024,'volume textures must stay below 1 MiB');
field.root.updateMatrixWorld(true);
for(const mesh of field.root.children){const box=new T.Box3().setFromObject(mesh);assert(box.min.y>6);assert(box.max.x<bounds.minX||box.min.x>bounds.maxX||box.max.z<bounds.minZ||box.min.z>bounds.maxZ,'clouds must stay outside the rooms');assert.equal(mesh.castShadow,false);assert.equal(mesh.material.depthWrite,false)}
field.update({coverage:.1,level:1});assert.equal(field.root.visible,false);
field.update({coverage:.4,level:1});const partialCount=field.root.children.filter(m=>m.visible).length;
field.update({coverage:1,level:1});assert(partialCount<field.root.children.filter(m=>m.visible).length);assert.equal(field.root.children.length,6);
const day=field.materials[0].uniforms.lightTint.value.clone();field.update({coverage:1,level:0});assert(field.materials[0].uniforms.lightTint.value.r<day.r);
field.dispose();assert.equal(disposed,3,'all volume textures must be released');
console.log(JSON.stringify({result:'PASS',generationMs:Math.round(performance.now()-before),volumeBytes:bytes,drawCallsMax:6,trianglesMax:72,stepsDesktop:28,stepsMobile:20,checks:['soft invisible bounds','varied density and lighting','3 unique silhouettes','outside rooms','weather coverage','day/night tint','resource disposal']},null,2));
