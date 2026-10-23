import * as T from './vendor/three.module.js';

const V=()=>new T.Vector3();
// A torso envelope from the avatar's skinned clothing, carried by its chest.
// Limb weights are excluded so an arm cannot make its own collision hole.
export function createTorsoEnvelope(root){
 const d=root.userData,bones=d.bones,chest=bones?.get('Spine2');if(!chest)return null;
 root.updateMatrixWorld(true);
 const point=n=>root.worldToLocal(bones.get(n).getWorldPosition(V())),shoulder=point('RightArm'),other=point('LeftArm'),centreX=(shoulder.x+other.x)/2,width=Math.abs(other.x-shoulder.x)/2;
 const low=point('Hips').y+.10,high=point('Neck').y+.015,bins=Array.from({length:8},()=>({count:0,x:0,z0:Infinity,z1:-Infinity})),radii=[[],[]];
 const arm=[point('RightArm'),point('RightForeArm'),point('RightHand')],segments=[new T.Line3(arm[0],arm[1]),new T.Line3(arm[1],arm[2])],upperCloudBins=Array(36).fill(null),upperAxis=arm[1].clone().sub(arm[0]).normalize(),side=new T.Vector3(1,0,0);
 side.addScaledVector(upperAxis,-side.dot(upperAxis)).normalize();const around=upperAxis.clone().cross(side).normalize(),armInverse=d.arms[0].matrixWorld.clone().invert();
 const leftLine=new T.Line3(point('LeftArm'),point('LeftForeArm')),leftAxis=leftLine.delta(V()).normalize(),leftSide=new T.Vector3(1,0,0),leftCloudBins=Array(36).fill(null),leftInverse=d.arms[1].matrixWorld.clone().invert();leftSide.addScaledVector(leftAxis,-leftSide.dot(leftAxis)).normalize();const leftAround=leftAxis.clone().cross(leftSide).normalize();
 root.traverse(m=>{if(!m.isSkinnedMesh)return;const a=m.geometry.attributes,types=m.skeleton.bones.map(b=>b.name.replace(/^mixamorig:?/,''));
  for(let i=0;i<a.position.count;i++){
   let body=0,limb=0,leftWeight=0;const weights=[0,0];
   for(let j=0;j<4;j++){const name=types[a.skinIndex.getComponent(i,j)],w=a.skinWeight.getComponent(i,j);if(/^(Spine\d*|Neck|Hips|Head|RightShoulder|LeftShoulder)$/.test(name))body+=w;if(/(Arm|ForeArm|Hand)/.test(name))limb+=w;if(name==='RightArm')weights[0]+=w;if(name==='RightForeArm')weights[1]+=w;if(name==='LeftArm')leftWeight+=w}
   if(body<.55&&Math.max(...weights)<.6&&leftWeight<.6)continue;
   const p=root.worldToLocal(m.localToWorld(m.getVertexPosition(i,V())));
   if(body>.55&&limb<.25&&p.y>=low&&p.y<=high&&Math.abs(p.x-centreX)<width*.98){const b=bins[Math.min(7,Math.floor((p.y-low)/(high-low)*8))];b.count++;b.x=Math.max(b.x,Math.abs(p.x-centreX));b.z0=Math.min(b.z0,p.z);b.z1=Math.max(b.z1,p.z)}
   for(let k=0;k<2;k++)if(weights[k]>.6){const along=segments[k].closestPointToPointParameter(p,false),radial=p.clone().sub(segments[k].closestPointToPoint(p,true,V()));if(along>.2&&along<.85)radii[k].push(radial.length());if(k===0&&along>=.50&&along<=1){const sector=Math.min(11,Math.floor((Math.atan2(radial.dot(around),radial.dot(side))+Math.PI)/(Math.PI*2)*12)),bin=Math.min(2,Math.floor((along-.5)*6))*12+sector,length=radial.length();if(!upperCloudBins[bin]||length>upperCloudBins[bin].radius)upperCloudBins[bin]={radius:length,p:root.localToWorld(p.clone()).applyMatrix4(armInverse)}}}
   if(leftWeight>.6){const along=leftLine.closestPointToPointParameter(p,false);if(along>=.5&&along<=1){const radial=p.clone().sub(leftLine.closestPointToPoint(p,true,V())),sector=Math.min(11,Math.floor((Math.atan2(radial.dot(leftAround),radial.dot(leftSide))+Math.PI)/(Math.PI*2)*12)),bin=Math.min(2,Math.floor((along-.5)*6))*12+sector,radius=radial.length();if(!leftCloudBins[bin]||radius>leftCloudBins[bin].radius)leftCloudBins[bin]={radius,p:root.localToWorld(p.clone()).applyMatrix4(leftInverse)}}}
  }
 });
 const populated=bins.filter(b=>b.count>3);if(!populated.length)populated.push({count:4,x:width*.9,z0:-.14,z1:.14});
 const globalBack=Math.min(...populated.map(b=>b.z0)),globalFront=Math.max(...populated.map(b=>b.z1));
 const rows=bins.map((b,i)=>{if(b.count<4)b=populated.reduce((best,c)=>Math.abs(bins.indexOf(c)-i)<Math.abs(bins.indexOf(best)-i)?c:best,populated[0]);return {y:low+(i+.5)*(high-low)/8,x:centreX,z:(b.z0+b.z1)/2,rx:Math.max(width*.73,b.x)+.008,rz:Math.max(.07,(b.z1-b.z0)/2)+.008}});
 const frameToChest=chest.matrixWorld.clone().invert().multiply(root.matrixWorld),inverse=new T.Matrix4();
 const radius=radii.map(values=>{values.sort((a,b)=>a-b);return T.MathUtils.clamp(values[Math.floor(values.length*.95)]||.05,.035,.085)});
 function update(){root.updateMatrixWorld(true);inverse.copy(chest.matrixWorld).multiply(frameToChest).invert()}
 function clearance(p,r=0){const q=p.clone().applyMatrix4(inverse);
  const index=T.MathUtils.clamp((q.y-low)/(high-low)*8-.5,0,7),a=rows[Math.floor(index)],b=rows[Math.ceil(index)],u=index%1,rx=T.MathUtils.lerp(a.rx,b.rx,u)+r,rz=T.MathUtils.lerp(a.rz,b.rz,u)+r,z=T.MathUtils.lerp(a.z,b.z,u);
  const horizontal=(Math.hypot((q.x-centreX)/rx,(q.z-z)/rz)-1)*Math.min(rx,rz),vertical=Math.max(low-q.y-r,q.y-high-r);
  return Math.hypot(Math.max(horizontal,0),Math.max(vertical,0))+Math.min(Math.max(horizontal,vertical),0);
 }
 function segment(a,b,r,start=0){let result=Infinity;for(let i=0;i<=8;i++)result=Math.min(result,clearance(a.clone().lerp(b,start+(1-start)*i/8),r));return result}
 const upperCloud=upperCloudBins.filter(Boolean).map(p=>p.p);
 const upperClouds=[upperCloud,leftCloudBins.filter(Boolean).map(p=>p.p)];
 update();return {update,clearance,segment,radius,upperCloud,upperClouds,rows,low,high,globalBack,globalFront};
}
