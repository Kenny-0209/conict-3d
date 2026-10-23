import {loadRigAsset} from './rig-loader.js';
import {createYoon} from './yoon.js';
export const LEE_REVISION='lee-round-20261016';
const asset=typeof document==='undefined'?null:await loadRigAsset(new URL('./assets/lee.glb?v='+LEE_REVISION,import.meta.url).href).catch(error=>{console.error('이상민 모델을 불러오지 못했습니다.',error);return null});
export function createLee(gltf,seated=false){return createYoon(gltf,seated,{memberId:'m2',name:'이상민',revision:LEE_REVISION,rootName:'LeeSangmin',idleAnimated:true})}
export function leeAvatar(fallback,seated){return asset?createLee(asset,seated):fallback()}
