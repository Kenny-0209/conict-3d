import * as T from './vendor/three.module.js';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';

// Batch only opaque, stationary furniture within its own selectable object.
// Avatars, PC screens and hinged doors retain their independent transforms.
export function batchStaticRoom(root){
 root.updateMatrixWorld(true);
 const removed=new Set(),stats={before:0,after:0,batches:0},inverse=new T.Matrix4(),transform=new T.Matrix4();
 for(const group of root.children){
  if(!['object','room'].includes(group.userData.layoutKind))continue;
  inverse.copy(group.matrixWorld).invert();
  const buckets=new Map(),avatar=group.userData.avatar;
  function collect(node){
   if(node===avatar||node.isSkinnedMesh||node.userData.doorLeaf||node.userData.dynamic||!node.visible)return;
   if(node.isMesh&&!node.isInstancedMesh&&!Array.isArray(node.material)&&!node.material.transparent&&!node.userData.screen&&!Object.keys(node.geometry.morphAttributes).length){
    const geo=node.geometry,signature=Object.keys(geo.attributes).sort().map(k=>{const a=geo.attributes[k];return [k,a.itemSize,a.normalized,a.array.constructor.name].join(':')}).join('|');
    const key=[node.material.uuid,!!geo.index,signature,node.castShadow,node.receiveShadow,node.renderOrder].join('/');
    if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(node);
   }
   for(const child of node.children)collect(child);
  }
  collect(group);
  for(const nodes of buckets.values()){
   stats.before+=nodes.length;
   if(nodes.length<2){stats.after+=nodes.length;continue}
   const pieces=nodes.map(node=>{transform.multiplyMatrices(inverse,node.matrixWorld);return node.geometry.clone().applyMatrix4(transform)});
   const geometry=mergeGeometries(pieces,false);pieces.forEach(g=>g.dispose());
   if(!geometry){stats.after+=nodes.length;continue}
   geometry.computeBoundingBox();geometry.computeBoundingSphere();
   const first=nodes[0],mesh=new T.Mesh(geometry,first.material);mesh.name='Static furniture';mesh.castShadow=first.castShadow;mesh.receiveShadow=first.receiveShadow;mesh.renderOrder=first.renderOrder;mesh.updateMatrix();mesh.matrixAutoUpdate=false;
   for(const node of nodes){removed.add(node.geometry);node.removeFromParent()}
   group.add(mesh);stats.after++;stats.batches++;
  }
 }
 // A kit reuses geometry. Dispose only buffers that no remaining mesh needs.
 const live=new Set();root.traverse(n=>{if(n.geometry)live.add(n.geometry)});for(const geometry of removed)if(!live.has(geometry))geometry.dispose();
 root.updateMatrixWorld(true);return stats;
}
