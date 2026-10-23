import * as T from './vendor/three.module.js';

// Only the current target gets edge geometry; no full-screen postprocessing.
export function createTargetOutline(scene,onChange=()=>{}){
 const root=new T.Group(),cache=new Map(),material=new T.LineBasicMaterial({color:'#ffbe45',transparent:true,opacity:1,depthTest:false,depthWrite:false,toneMapped:false});
 root.name='Interaction target outline';scene.add(root);root.visible=false;
 let selected=null,parts=[];
 function update(){
  let changed=false;
  for(const {mesh,line} of parts){
   mesh.updateWorldMatrix(true,false);
   if(!line.matrix.equals(mesh.matrixWorld)){line.matrix.copy(mesh.matrixWorld);line.matrixWorldNeedsUpdate=true;changed=true}
  }
  return changed;
 }
 function set(item){
  if(item===selected)return;
  selected=item;root.clear();parts=[];root.visible=Boolean(item);
  if(item)item.node.traverseVisible(mesh=>{
   // The desk is the interaction target; animated people keep their own pose.
   if(!mesh.isMesh||mesh.isSkinnedMesh||mesh.userData.personSeat||!mesh.geometry?.attributes.position)return;
   let edges=cache.get(mesh.geometry);
   if(!edges){edges=new T.EdgesGeometry(mesh.geometry,35);cache.set(mesh.geometry,edges)}
   const line=new T.LineSegments(edges,material);line.matrixAutoUpdate=false;line.renderOrder=50;line.frustumCulled=false;root.add(line);parts.push({mesh,line});
  });
  update();onChange();
 }
 function dispose(){root.removeFromParent();root.clear();for(const geometry of cache.values())geometry.dispose();cache.clear();material.dispose();parts=[];selected=null}
 return {root,set,update,dispose};
}
