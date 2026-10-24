import * as T from './vendor/three.module.js';

// Compact, reusable density volumes. Gaussian lobes merge before lighting and
// compositing, so their intersections never look like overlapping glass spheres.
export const CLOUD_VOLUME_SIZE=[64,40,48];
const clamp=x=>Math.max(0,Math.min(1,x)),smooth=x=>{x=clamp(x);return x*x*(3-2*x)};
function hash(x,y,z,seed){let n=Math.imul(x,374761393)^Math.imul(y,668265263)^Math.imul(z,2147483647)^Math.imul(seed,1274126177);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295}
function noise(x,y,z,seed){
 const ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z),u=smooth(x-ix),v=smooth(y-iy),w=smooth(z-iz),mix=(a,b,t)=>a+(b-a)*t;
 return mix(mix(mix(hash(ix,iy,iz,seed),hash(ix+1,iy,iz,seed),u),mix(hash(ix,iy+1,iz,seed),hash(ix+1,iy+1,iz,seed),u),v),mix(mix(hash(ix,iy,iz+1,seed),hash(ix+1,iy,iz+1,seed),u),mix(hash(ix,iy+1,iz+1,seed),hash(ix+1,iy+1,iz+1,seed),u),v),w);
}
export function cloudVolume(variant=0){
 const [nx,ny,nz]=CLOUD_VOLUME_SIZE,values=new Float32Array(nx*ny*nz),data=new Uint8Array(values.length*2),lobes=[];
 for(let i=0;i<9;i++){
  const x=(i%5-2)*.125+(hash(i,0,0,variant+1)-.5)*.055;
  lobes.push([x,i<5?-.12+hash(i,1,0,variant+1)*.06:.04+hash(i,2,0,variant+1)*.15,(hash(i,3,0,variant+1)-.5)*.23,.11+hash(i,4,0,variant+1)*.065,(i<5?.13:.18)+hash(i,5,0,variant+1)*.065,.13+hash(i,6,0,variant+1)*.055]);
 }
 for(let z=0;z<nz;z++)for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){
  const px=x/(nx-1)-.5,py=y/(ny-1)-.5,pz=z/(nz-1)-.5;
  let density=0;
  for(const [a,b,c,sx,sy,sz] of lobes){const r=((px-a)/sx)**2+((py-b)/sy)**2+((pz-c)/sz)**2;density+=Math.exp(-r*1.7)}
  const detail=noise((px+.5)*16,(py+.5)*12,(pz+.5)*14,variant+9)*.7+noise((px+.5)*37,(py+.5)*29,(pz+.5)*31,variant+23)*.3;
  // Erosion breaks up the outline, with an airy boundary and a soft, level base.
  const edge=smooth(Math.min(.5-Math.abs(px),.5-Math.abs(py),.5-Math.abs(pz))/.07);
  values[x+nx*(y+ny*z)]=smooth((density-.25-(1-detail)*.25)/.28)*edge*smooth((py+.39)/.10);
 }
 const sample=(x,y,z)=>x<0||x>=nx||y<0||y>=ny||z<0||z>=nz?0:values[x+nx*(y+ny*z)];
 for(let z=0;z<nz;z++)for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){
  const i=x+nx*(y+ny*z),shade=sample(x-2,y+3,z+1)*.7+sample(x-5,y+7,z+3)*.6+sample(x-9,y+12,z+5)*.45;
  const light=(.2+.8*smooth((y/(ny-1)-.25)/.50))*(.60+.40*Math.exp(-shade*1.3));
  data[i*2]=Math.round(values[i]*255);data[i*2+1]=Math.round(light*255);
 }
 const texture=new T.Data3DTexture(data,nx,ny,nz);
 texture.format=T.RGFormat;texture.type=T.UnsignedByteType;texture.minFilter=texture.magFilter=T.LinearFilter;
 texture.wrapS=texture.wrapT=texture.wrapR=T.ClampToEdgeWrapping;texture.unpackAlignment=1;texture.generateMipmaps=false;texture.needsUpdate=true;
 return texture;
}
const vertexShader=`
varying vec3 rayOrigin;
varying vec3 rayVector;
void main(){
 rayOrigin=(inverse(modelMatrix)*vec4(cameraPosition,1.0)).xyz;
 rayVector=position-rayOrigin;
 gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
}`;
const fragmentShader=`
precision highp sampler3D;
uniform mat4 modelMatrix;
uniform sampler3D volume;
uniform vec3 lightTint;
uniform vec3 shadeTint;
uniform vec3 skyTint;
uniform float opacity;
uniform float densityScale;
varying vec3 rayOrigin;
varying vec3 rayVector;
void main(){
 vec3 direction=normalize(rayVector);
 vec3 inv=1.0/(direction+vec3(0.000001));
 vec3 a=(-vec3(0.5)-rayOrigin)*inv,b=(vec3(0.5)-rayOrigin)*inv;
 vec3 lo=min(a,b),hi=max(a,b);
 float nearT=max(max(lo.x,lo.y),lo.z),farT=min(min(hi.x,hi.y),hi.z);
 nearT=max(nearT,0.0);
 if(farT<=nearT)discard;
 float stepSize=(farT-nearT)/float(CLOUD_STEPS);
 float jitter=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453);
 vec3 color=vec3(0.0);
 float alpha=0.0;
 for(int i=0;i<CLOUD_STEPS;i++){
  vec3 p=rayOrigin+direction*(nearT+(float(i)+jitter)*stepSize);
  vec2 field=texture(volume,p+0.5).rg;
  float weight=(1.0-alpha)*(1.0-exp(-field.r*densityScale*stepSize));
  color+=weight*mix(shadeTint,lightTint,field.g);
  alpha+=weight;
  if(alpha>0.985)break;
 }
 if(alpha<0.008)discard;
 vec3 cloud=color/max(alpha,0.0001);
 float distanceToCloud=length((modelMatrix*vec4(rayOrigin+direction*nearT,1.0)).xyz-cameraPosition);
 cloud=mix(cloud,skyTint,smoothstep(35.0,100.0,distanceToCloud)*0.65);
 gl_FragColor=vec4(cloud,alpha*opacity);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}`;

export function createClouds(bounds,{compact=false}={}){
 const root=new T.Group();root.name='Clouds outside rooms';
 const volumes=Array.from({length:3},(_,i)=>cloudVolume(i)),geometry=new T.BoxGeometry(1,1,1),materials=[];
 const cx=(bounds.minX+bounds.maxX)/2,cz=(bounds.minZ+bounds.maxZ)/2;
 // Irregular, separated clusters surround the horizon, clear of the rooms.
 const placements=[
  [cx-5,8.3,bounds.minZ-8.8,6.8,3.0,3.8,.16],
  [cx+4.8,9.5,bounds.minZ-12,8.4,3.7,4.5,-.31],
  [bounds.minX-8,8.8,cz-2,6.2,2.7,3.9,1.05],
  [bounds.maxX+9,10.2,cz-6,8.0,3.3,4.5,-.55],
  [cx-3.5,11.1,bounds.maxZ+11,8.5,3.5,4.6,.42],
  [bounds.maxX+8.5,8.7,cz+7,6.5,2.8,3.7,-.83]
 ];
 for(let i=0;i<placements.length;i++){
  const material=new T.ShaderMaterial({vertexShader,fragmentShader,defines:{CLOUD_STEPS:compact?20:28},uniforms:{volume:{value:volumes[i%3]},lightTint:{value:new T.Color('#fffdf6')},shadeTint:{value:new T.Color('#a5b9c7')},skyTint:{value:new T.Color()},opacity:{value:.8},densityScale:{value:8}},side:T.BackSide,transparent:true,depthWrite:false,toneMapped:true});
  const mesh=new T.Mesh(geometry,material),[x,y,z,sx,sy,sz,angle]=placements[i];
  mesh.name='Soft cloud '+(i+1);mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);mesh.rotation.y=angle;
  mesh.castShadow=mesh.receiveShadow=false;mesh.userData.cloudVolume=true;root.add(mesh);materials.push(material);
 }
 function update({coverage=0,level=1,wet=false,phase='day',sky}={}){
  const amount=clamp(coverage),count=amount>.25||wet?Math.max(2,Math.ceil(amount*6)):0;
  root.visible=count>0;
  for(let i=0;i<root.children.length;i++){
   root.children[i].visible=i<count;
   const u=materials[i].uniforms;
   u.lightTint.value.set(level>.5?'#fffdf6':'#71899f');u.shadeTint.value.set(level>.5?'#71859f':'#273f58');
   if(phase==='dawn'||phase==='dusk')u.lightTint.value.lerp(new T.Color('#f2c5a8'),.4);
   if(sky)u.skyTint.value.copy(sky);
   u.opacity.value=.62+level*.34;u.densityScale.value=12+amount*6+(wet?1:0);
  }
 }
 function dispose(){root.removeFromParent();geometry.dispose();materials.forEach(m=>m.dispose());volumes.forEach(t=>t.dispose())}
 return {root,update,dispose,volumes,materials};
}
