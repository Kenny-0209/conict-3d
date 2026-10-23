import {GLTFLoader} from './vendor/GLTFLoader.js';
import {isCompactViewport} from './mobile-core.js';

// Keep source assets intact; use a smaller texture upload on compact touch views.
function mobileTextureBudget(gltf){
 if(typeof window==='undefined'||typeof document==='undefined'||!isCompactViewport({width:innerWidth,height:innerHeight,coarse:matchMedia('(pointer: coarse)').matches}))return gltf;
 const seen=new Set();
 gltf.scene.traverse(node=>{for(const material of [node.material].flat().filter(Boolean))for(const texture of Object.values(material)){
  if(!texture?.isTexture||seen.has(texture))continue;seen.add(texture);const image=texture.image;
  if(!image||Math.max(image.width||0,image.height||0)<=2048)continue;
  const scale=2048/Math.max(image.width,image.height),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));
  const ctx=canvas.getContext('2d');if(!ctx)continue;ctx.drawImage(image,0,0,canvas.width,canvas.height);texture.image=canvas;texture.needsUpdate=true;
 }});
 return gltf;
}

// Native streaming decompression preserves every GLB byte, including textures,
// bones and keyframes. Older browsers can still load the original asset.
export async function loadRigAsset(url){
 const loader=new GLTFLoader();
 if(typeof DecompressionStream==='function'){
  try{
   const packed=new URL(url);packed.pathname+='.gz';packed.searchParams.set('pack','20261017');
   const response=await fetch(packed);
   if(!response.ok||!response.body)throw new Error('Compressed asset unavailable');
   const bytes=await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
   return mobileTextureBudget(await loader.parseAsync(bytes,new URL('.',url).href));
  }catch{
   // Do not lose an avatar if a browser, old cache or static host lacks gzip.
  }
 }
 return mobileTextureBudget(await loader.loadAsync(url));
}
