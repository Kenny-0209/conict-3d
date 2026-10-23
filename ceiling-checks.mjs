import assert from 'node:assert/strict';
import * as T from './dist/vendor/three.module.js';
import {createCeiling,ceilingFixtures} from './dist/ceiling.js';
import {defaultLayout,contains,roomBounds,WALL_HEIGHT} from './dist/layout.js';
import {createAtmosphere} from './dist/weather-scene.js';
import {room,kit} from './dist/models.js';

const layout=defaultLayout(),before=JSON.stringify(layout),ceiling=createCeiling(layout),fixtures=ceilingFixtures(layout);
assert(!ceiling.root.visible);ceiling.setFirstPerson(true);assert(ceiling.root.visible);ceiling.root.updateMatrixWorld(true);
assert.equal(WALL_HEIGHT,3);assert(fixtures.length>5);assert(layout.rooms.every(r=>fixtures.some(f=>f.roomId===r.id)));
for(const f of fixtures){const r=layout.rooms.find(r=>r.id===f.roomId);for(const sx of [-1,1])for(const sz of [-1,1])assert(contains(r.points,{x:f.x+sx*(f.width/2+.04),z:f.z+sz*(f.depth/2+.04)}))}
for(const panel of ceiling.panels){const b=new T.Box3().setFromObject(panel);assert(b.max.y<=3&&b.min.y>2.95);assert(b.max.y-b.min.y<.01);assert(!panel.castShadow&&!panel.receiveShadow);assert.equal(panel.material.toneMapped,false)}
const ray=new T.Raycaster(),surfaces=ceiling.root.children.filter(n=>n.isMesh);let coverage=0;
for(const r of layout.rooms){const b=roomBounds(r);for(let x=b.minX+.13;x<b.maxX;x+=.4)for(let z=b.minZ+.13;z<b.maxZ;z+=.4){
 ray.set(new T.Vector3(x,1.62,z),new T.Vector3(0,1,0));const hit=ray.intersectObjects(surfaces,false);const inside=layout.rooms.some(q=>contains(q.points,{x,z}));assert.equal(hit.length>0,inside,'ceiling must cover the editable polygon and leave its notch empty');if(inside){assert(Math.abs(hit[0].point.y-3)<1e-6);coverage++}
}}
ceiling.setFirstPerson(false);assert(!ceiling.root.visible);assert.equal(JSON.stringify(layout),before);

const model=room(kit('polygon'),[],[],{},{...layout,objects:[]});let walls=0;
model.traverse(n=>{if(n.userData.layoutKind==='wall')n.traverse(m=>{if(m.isMesh){assert(m.material.isMeshBasicMaterial,'walls must stay evenly lit independently of weather');assert(!m.castShadow&&!m.receiveShadow);walls++}})});assert(walls>0);
const scene=new T.Scene();scene.background=new T.Color();scene.fog=new T.Fog('#fff',45,100);
const sun=new T.DirectionalLight(),hemisphere=new T.HemisphereLight(),ground=new T.Mesh(new T.PlaneGeometry(100,100),new T.MeshStandardMaterial());sun.castShadow=true;
const atmosphere=createAtmosphere({scene,renderer:{},sun,hemisphere,ground,layout});
const fill=atmosphere.root.getObjectByName('Room lighting').children[0];assert(fill.isAmbientLight);
for(const hour of [3,12,20]){
 atmosphere.update({status:'live',data:{kind:'clear',cloud:8,days:[],timestamp:0}},new Date('2026-10-16T'+String(hour).padStart(2,'0')+':00:00+09:00'),true);
 assert.equal(fill.intensity,1.85);assert.equal(hemisphere.intensity,1.05);assert(!sun.castShadow);assert(sun.intensity<=.65&&sun.intensity>=.3);
}
ceiling.dispose();atmosphere.dispose();
console.log(JSON.stringify({pass:true,height_m:3,fixtures:fixtures.length,polygon_coverage_rays:coverage,flat_lamps:true,unlit_wall_meshes:walls,night_fill_preserved:true,saved_layout_unchanged:true}));
