import {GLTFLoader} from './vendor/GLTFLoader.js';

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
   return await loader.parseAsync(bytes,new URL('.',url).href);
  }catch{
   // Do not lose an avatar if a browser, old cache or static host lacks gzip.
  }
 }
 return loader.loadAsync(url);
}
