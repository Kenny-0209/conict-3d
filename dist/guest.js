import * as T from './vendor/three.module.js';
import {avatar,kit} from './models.js';
import {loadRigAsset} from './rig-loader.js';
import {createGuestRig,GUEST_REVISION} from './guest-rig.js';

const asset=typeof document==='undefined'?null:await loadRigAsset(new URL('./assets/guest.glb?v='+GUEST_REVISION,import.meta.url).href).catch(error=>{console.error('손님 모델을 불러오지 못했습니다.',error);return null});

export const guestProfile={name:'연구실 손님',skin:'#dfb99a',shirt:'#b8c7ae',pants:'#475860',hair:'part',glasses:false,suit:false};
export function createGuest(){
 if(asset)return createGuestRig(asset);
 const body=avatar(kit('polygon'),guestProfile,false),rig=body.userData;
 const wrapper=new T.Group();wrapper.name='Visitor';wrapper.add(body);
 return {root:wrapper,body,pose:rig.pose,gait:rig.gait,wave:rig.wave};
}
