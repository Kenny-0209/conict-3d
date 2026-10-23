import {readdir,readFile,writeFile} from 'node:fs/promises';
import {gzipSync,gunzipSync} from 'node:zlib';
const assets=new URL('./dist/assets/',import.meta.url);let before=0,after=0;
for(const name of (await readdir(assets)).filter(name=>name.endsWith('.glb'))){
 const source=await readFile(new URL(name,assets)),packed=gzipSync(source,{level:9});
 if(!gunzipSync(packed).equals(source))throw new Error('GLB compression check failed: '+name);
 await writeFile(new URL(name+'.gz',assets),packed);before+=source.length;after+=packed.length;
}
console.log(JSON.stringify({before,after,saved:before-after,lossless:true}));
