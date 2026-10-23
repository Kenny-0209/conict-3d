import {loadRigAsset} from './rig-loader.js';
import {createYoon} from './yoon.js';
export const MEMBER_REVISION='members-20261016';
export const RIG_MEMBER_IDS=['m3','m4','m5','m6','m7','m8'];
// Fetch independent assets together; one failed asset keeps its own fallback.
const loaded=typeof document==='undefined'?new Map():new Map(await Promise.all(RIG_MEMBER_IDS.map(async id=>{
 try{return [id,await loadRigAsset(new URL('./assets/'+id+'.glb?v='+MEMBER_REVISION,import.meta.url).href)]}
 catch(error){console.error('구성원 모델을 불러오지 못했습니다: '+id,error);return [id,null]}
})));
export function createMember(gltf,person,seated=false){return createYoon(gltf,seated,{memberId:person.id,name:person.name,revision:MEMBER_REVISION,rootName:'Member_'+person.id,idleAnimated:true,heightMeters:person.heightMeters})}
export function memberAvatar(fallback,person,seated){const asset=loaded.get(person.id);return asset?createMember(asset,person,seated):fallback()}
