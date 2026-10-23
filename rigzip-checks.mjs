import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {gzipSync,gunzipSync} from 'node:zlib';
import * as T from './dist/vendor/three.module.js';
import {GLTFLoader} from './dist/vendor/GLTFLoader.js';
import {loadRigAsset} from './dist/rig-loader.js';

const parse=GLTFLoader.prototype.parseAsync;
GLTFLoader.prototype.parseAsync=function(bytes,path){this.register(parser=>({name:'HeadlessTexture',loadTexture:i=>{const t=new T.Texture();parser.associations.set(t,{textures:i});return Promise.resolve(t)}}));return parse.call(this,bytes,path)};
const fetchOriginal=globalThis.fetch,requests=[];
globalThis.fetch=async url=>{requests.push(String(url));return fetchOriginal(url)};
for(const file of (await readdir('./dist/assets')).filter(n=>n.endsWith('.glb'))){
 const bytes=await readFile('./dist/assets/'+file),packed=await readFile('./dist/assets/'+file+'.gz');assert.deepEqual(gunzipSync(packed),bytes);
 const asset=await loadRigAsset('http://127.0.0.1:5178/assets/'+file);
 assert(asset.scene);assert(asset.animations.length>=3);assert(requests.at(-1).includes('.glb.gz?pack='));
}
const loadOriginal=GLTFLoader.prototype.loadAsync,stream=globalThis.DecompressionStream;
GLTFLoader.prototype.loadAsync=async url=>({fallback:url});
globalThis.fetch=async()=>{throw new Error('offline or old host')};
assert.equal((await loadRigAsset('http://127.0.0.1:5178/assets/yoon.glb')).fallback,'http://127.0.0.1:5178/assets/yoon.glb');
globalThis.DecompressionStream=undefined;
assert.equal((await loadRigAsset('http://127.0.0.1:5178/assets/guest.glb')).fallback,'http://127.0.0.1:5178/assets/guest.glb');
globalThis.DecompressionStream=stream;globalThis.fetch=fetchOriginal;GLTFLoader.prototype.loadAsync=loadOriginal;
console.log('PASS: 9 byte-identical compressed rigs, native stream decoding, real GLTF parsing, missing gzip and older-browser fallbacks');
