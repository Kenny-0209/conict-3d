import {readFile} from 'node:fs/promises';import * as T from './dist/vendor/three.module.js';import {GLTFLoader} from './dist/vendor/GLTFLoader.js';import {createYoon} from './dist/yoon.js';import {createLoungeRig} from './dist/lounge-rig.js';
const loader=new GLTFLoader();loader.register(p=>({name:'HeadlessTexture',loadTexture:()=>Promise.resolve(new T.Texture())}));
for(const id of ['m1','m5','m7']){
 const file=id==='m1'?'yoon':id,bytes=await readFile(new URL('./dist/assets/'+file+'.glb',import.meta.url)),asset=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 const body=createYoon(asset,false,{memberId:id,rootName:id==='m1'?'YoonSebeen':'Member_'+id,heightMeters:id==='m5'?1.6:undefined}),d=body.userData,rig=createLoungeRig(body),point=n=>body.worldToLocal(d.bones.get(n).getWorldPosition(new T.Vector3())).toArray().map(v=>+v.toFixed(4));
 rig.animate('rest',3.2,{hasCoffee:true});body.updateMatrixWorld(true);
 console.log(JSON.stringify({id,head:point('Head'),headTop:d.bones.has('HeadTop_End')?point('HeadTop_End'):null,fingers:[...d.bones.keys()].filter(n=>n.startsWith('RightHand')),wrist:point('RightHand'),index:point('RightHandIndex1'),middle:point('RightHandMiddle1'),pinky:point('RightHandPinky1'),thumb:point('RightHandThumb2'),cup:rig.cup.position.toArray(),rim:body.worldToLocal(rig.cup.localToWorld(new T.Vector3(0,.0375,0))).toArray()}));
}
