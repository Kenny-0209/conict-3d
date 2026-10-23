// Serializable, metre-based room plan shared by the editor and both 3D styles.
import {preset} from './seed.js';
import {applyRoomLabels} from './interactions.js?v=20261024';
import {applyLabUpdate,applyProfTableUpdate,applyTVUpdate,applyWallTableUpdate,applyLoungeUpdate,USER_BASELINE} from './updates.js';
export const WALL_HEIGHT=3;
export const footprints={desk:[1.60,.8], 'chair-black':[.66,.66],'chair-white':[.66,.66],'chair-meeting':[.66,.66],monitors:[1.64,.22],tower:[.25,.45],partition:[1.62,.05],meeting:[2.00,.95],'prof-table':[2.1,.85],tv:[1.93,.66],bookshelf:[1.53,.37],cabinet:[2.24,.4],'side-table':[1.30,.65],'wall-table':[1.40,.60],'wood-cabinet':[.62,.43],'coffee-cabinet':[1.15,.48],'coffee-tools':[1.10,.42],kitchen:[1.96,.61],shelf:[.9,.42],purifier:[.38,.38],'purifier-lab':[.54,.54],rack:[1.0,.45],cat:[2.16,.07],'media-tv':[2.16,.07],lamp:[.36,.36],printer:[.46,.41],sink:[.5,.45],fridge:[.5,.54],plant:[.35,.35],seat:[1.7,1.7]};
footprints['sofa-3']=[2.16,.94];
export const clone=x=>structuredClone(x);
export const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
export function uid(prefix='item'){return prefix+'-'+Math.random().toString(36).slice(2,9)}
const verts=(coords)=>coords.map(([x,z],i)=>({id:'v'+(i+1),x,z}));
export function legacyLayout(){
 const rooms=[{id:'r1',name:'연구원 공간',points:verts([[-5,-3.87],[5,-3.87],[5,3.15],[-5,3.15]]),height:WALL_HEIGHT,thickness:.10,color:'#cbd0c9',edges:{}},{id:'r2',name:'교수실 · 미팅 공간',points:verts([[-5,3.15],[5,3.15],[5,7.24],[-5,7.24]]),height:WALL_HEIGHT,thickness:.10,color:'#cbd0c9',edges:{}}];
 const objects=[];
 const seatData=[[-3.2,-1.75,0],[-1.3,-1.75,0],[.6,-1.75,0],[2.5,-1.75,0],[-3.2,.05,180],[-1.3,.05,180],[.6,.05,180],[.75,5.95,180]];
 seatData.forEach(([x,z,rotation],i)=>objects.push({id:'seat-s'+(i+1),kind:'seat',seatId:'s'+(i+1),name:i===7?'교수님 자리':'좌석 '+String(i+1).padStart(2,'0'),x,z,y:0,rotation,scaleX:1,scaleY:1,scaleZ:1,roomId:i===7?'r2':'r1'}));
 function obj(kind,name,x,z,rotation=0,scale=1,y=0){objects.push({id:'f'+(objects.length+1),kind,name,x,z,y,rotation,scaleX:scale,scaleY:scale,scaleZ:scale,roomId:z>3.15?'r2':'r1'})}
 obj('meeting','연구실 회의 테이블',3.18,1.59,90);obj('chair-black','회의 의자 1',2.38,1.55,-90);obj('chair-white','회의 의자 2',3.95,1.55,90);
 obj('cabinet','흰색 수납장',.02,2.87,180);obj('cat','고양이 액자',.02,2.82,180);obj('rack','옷걸이·우산꽂이',4.23,2.53,90);obj('shelf','가전 선반',3.98,-3.25);obj('kitchen','싱크대·냉장고',1.83,-3.38);obj('bookshelf','연구실 책장',-.01,-3.56);obj('purifier','연구실 공기청정기',1.93,.97);obj('lamp','연구실 스탠드',-4.31,-3.12);obj('printer','프린터',-4.30,.98);
 obj('bookshelf','교수실 책장',-4.61,5.15,90);obj('prof-table','교수실 회의 테이블',-.55,4.95,90);obj('tv','이동식 TV',3.59,4.41,-90);obj('sink','교수실 세면대',3.85,6.91,180);obj('fridge','교수실 냉장고',2.75,6.93,180);obj('purifier','교수실 공기청정기',4.48,6.34);obj('lamp','교수실 스탠드',-3.30,6.53);
 for(const x of [-1.37,.29])for(const z of [4.45,5.45])obj('chair-meeting','교수실 회의 의자',x,z,x<0?-90:90,.85);
 obj('plant','책상 화분',.33,6.10,0,1,.80);
 return {version:1,units:'m',updatedAt:null,rooms,walls:[],objects,cutaway:true,openings:[{id:'d1',kind:'door',wallId:'r1-v3',t:.18,width:1.32,height:2.2,sill:0,swing:70},{id:'d2',kind:'door',wallId:'r1-v2',t:.80,width:1.6,height:2.2,sill:0,swing:-80},{id:'win1',kind:'window',wallId:'r1-v4',t:.627,width:4.1,height:1.47,sill:.8},{id:'win2',kind:'window',wallId:'r1-v1',t:.395,width:3.25,height:1.47,sill:.8},{id:'win3',kind:'window',wallId:'r2-v4',t:.386,width:2.3,height:1.47,sill:.8}]};
}
export function roomBounds(r){const x=r.points.map(p=>p.x),z=r.points.map(p=>p.z);return {minX:Math.min(...x),maxX:Math.max(...x),minZ:Math.min(...z),maxZ:Math.max(...z)}}
export function planBounds(l){const pts=l.rooms.flatMap(r=>r.points).concat(l.walls.flatMap(w=>[w.a,w.b]),l.objects.map(o=>({x:o.x,z:o.z})));if(!pts.length)return {minX:-3,maxX:3,minZ:-3,maxZ:3};return roomBounds({points:pts})}
export function area(points){return Math.abs(points.reduce((s,p,i)=>{const q=points[(i+1)%points.length];return s+p.x*q.z-q.x*p.z},0))/2}
export function contains(points,p){let inside=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[i],b=points[j];if((a.z>p.z)!==(b.z>p.z)&&p.x<(b.x-a.x)*(p.z-a.z)/(b.z-a.z)+a.x)inside=!inside}return inside}
export function allWalls(l){const out=[],shared=new Map();for(const r of l.rooms){r.points.forEach((p,i)=>{const q=r.points[(i+1)%r.points.length],a={x:p.x,z:p.z},b={x:q.x,z:q.z};const key=[`${a.x.toFixed(5)},${a.z.toFixed(5)}`,`${b.x.toFixed(5)},${b.z.toFixed(5)}`].sort().join('|');const overrides=r.edges?.[p.id]||{};if(shared.has(key)){const old=shared.get(key);old.shared=true;old.aliases.push(r.id+'-'+p.id);return}const w={id:r.id+'-'+p.id,a,b,height:WALL_HEIGHT,thickness:overrides.thickness??r.thickness,enabled:overrides.enabled!==false,roomId:r.id,index:i,aliases:[],...overrides,height:WALL_HEIGHT};out.push(w);shared.set(key,w)})}return out.concat(l.walls.map(w=>({...w,manual:true,height:WALL_HEIGHT,enabled:w.enabled!==false,aliases:[]})))}
export function wallById(l,id){return allWalls(l).find(w=>w.id===id||w.aliases.includes(id))}
function normalizeOpeningAttachment(l,o){
 const w=wallById(l,o.wallId);if(!w||w.id===o.wallId)return o;
 const room=l.rooms.find(r=>r.points.some(p=>r.id+'-'+p.id===o.wallId)),i=room.points.findIndex(p=>room.id+'-'+p.id===o.wallId),a=room.points[i],b=room.points[(i+1)%room.points.length];
 const reversed=(b.x-a.x)*(w.b.x-w.a.x)+(b.z-a.z)*(w.b.z-w.a.z)<0;
 // Reversing the wall axis must preserve the door's world position and opening side.
 return {...o,wallId:w.id,...(reversed?{t:1-number(o.t,0,1,'벽 위 위치'),...(o.kind==='door'?{hinge:o.hinge==='right'?'left':'right',swing:-number(o.swing??70,-160,160,'문 여는 각도')}:{})}:{})};
}
export function collinear(a,b){const len=wallLength(a),cross=p=>Math.abs((p.x-a.a.x)*(a.b.z-a.a.z)-(p.z-a.a.z)*(a.b.x-a.a.x))/len;return cross(b.a)<.0001&&cross(b.b)<.0001}
export function alongWall(w,p){const len=wallLength(w);return ((p.x-w.a.x)*(w.b.x-w.a.x)+(p.z-w.a.z)*(w.b.z-w.a.z))/len}
export function renderWalls(l){
 const raw=allWalls(l),result=[];
 raw.forEach((w,index)=>{const len=wallLength(w),dx=(w.b.x-w.a.x)/len,dz=(w.b.z-w.a.z)/len,aligned=raw.map((q,i)=>({q,i})).filter(({q})=>collinear(w,q)),cuts=[0,len];for(const {q} of aligned)cuts.push(clamp(alongWall(w,q.a),0,len),clamp(alongWall(w,q.b),0,len));const sorted=[...new Set(cuts.map(v=>Number(v.toFixed(6))))].sort((a,b)=>a-b);for(let j=0;j<sorted.length-1;j++){const from=sorted[j],to=sorted[j+1];if(to-from<.00001)continue;const mid={x:w.a.x+dx*(from+to)/2,z:w.a.z+dz*(from+to)/2},cover=aligned.filter(({q})=>{const t=alongWall(q,mid);return t>=-.00001&&t<=wallLength(q)+.00001}).sort((a,b)=>a.i-b.i);if(cover[0].i!==index)continue;result.push({...w,parentId:w.id,a:{x:w.a.x+dx*from,z:w.a.z+dz*from},b:{x:w.a.x+dx*to,z:w.a.z+dz*to},height:Math.max(...cover.map(v=>v.q.height)),thickness:Math.max(...cover.map(v=>v.q.thickness)),shared:w.shared||cover.length>1})}});
 return result;
}
// Small gaps between independently edited room boundaries still form one doorway.
// Only outward-facing walls of different rooms qualify; distant walls and windows do not.
const DOOR_GAP=.25;
function inwardNormal(l,w){const r=l.rooms.find(r=>r.id===w.roomId);if(!r)return null;const signed=r.points.reduce((s,p,i)=>{const q=r.points[(i+1)%r.points.length];return s+p.x*q.z-q.x*p.z},0),len=wallLength(w),sign=Math.sign(signed);return {x:-(w.b.z-w.a.z)/len*sign,z:(w.b.x-w.a.x)/len*sign}}
function facesDoor(l,parent,w,p){
 if(parent.manual||w.manual||!parent.roomId||parent.roomId===w.roomId)return false;
 const n=inwardNormal(l,parent),m=inwardNormal(l,w);if(!n||!m||n.x*m.x+n.z*m.z>-.99999)return false;
 const at=alongWall(w,p),len=wallLength(w),dx=(w.b.x-w.a.x)/len,dz=(w.b.z-w.a.z)/len;
 const delta={x:w.a.x+dx*at-p.x,z:w.a.z+dz*at-p.z},distance=Math.hypot(delta.x,delta.z);
 return distance<=parent.thickness/2+w.thickness/2+DOOR_GAP&&delta.x*n.x+delta.z*n.z<=.0001&&delta.x*m.x+delta.z*m.z>=-.0001;
}
function projectOpening(l,o,w){const parent=wallById(l,o.wallId);if(!parent?.enabled||!w.enabled)return null;const p=openingPosition(l,o),at=alongWall(w,p),len=wallLength(w);if(at+o.width/2<=.00001||at-o.width/2>=len-.00001)return null;if(!collinear(parent,w)&&!(o.kind==='door'&&facesDoor(l,parent,w,p)))return null;return {...o,t:at/len}}
export function openingsOnWall(l,w){return l.openings.map(o=>projectOpening(l,o,w)).filter(Boolean)}
export function doorConnections(l,o){return o.kind==='door'?allWalls(l).filter(w=>projectOpening(l,o,w)):[]}
export function doorPassage(l,o){const p=openingPosition(l,o),w=p.wall,len=wallLength(w),nx=-(w.b.z-w.a.z)/len,nz=(w.b.x-w.a.x)/len,connections=doorConnections(l,o),ends=(connections.length?connections:[w]).flatMap(q=>{const offset=(q.a.x-p.x)*nx+(q.a.z-p.z)*nz;return [offset-q.thickness/2,offset+q.thickness/2]}),min=Math.min(...ends),max=Math.max(...ends);return {depth:max-min+.025,centerZ:(min+max)/2,wallIds:connections.map(q=>q.id)}}
export function doorPose(o){const direction=o.hinge==='right'?-1:1,angle=o.swing*Math.PI/180,hingeX=-direction*o.width/2;return {width:o.width,direction,hingeX,rotation:-direction*angle,closedX:direction*o.width/2,endX:hingeX+direction*Math.cos(angle)*o.width,endZ:Math.sin(angle)*o.width,sweep:direction*angle>=0?1:0}}
export function doorPoses(o){
 if(o.leaves!==2)return [doorPose(o)];
 return ['left','right'].map(hinge=>{const offset=hinge==='left'?-o.width/4:o.width/4,p=doorPose({...o,width:o.width/2,hinge});return {...p,hinge,hingeX:p.hingeX+offset,closedX:p.closedX+offset,endX:p.endX+offset}});
}
export function doorInwardSign(l,o){const w=wallById(l,o.wallId),n=w&&inwardNormal(l,w);if(!n)return 1;const len=wallLength(w);return Math.sign(n.x*-(w.b.z-w.a.z)/len+n.z*(w.b.x-w.a.x)/len)||1}
export function doorOpensInward(l,o){return Math.sign(o.swing)===doorInwardSign(l,o)}
export function wallLength(w){return Math.hypot(w.b.x-w.a.x,w.b.z-w.a.z)}
export function projectToWall(w,p){const dx=w.b.x-w.a.x,dz=w.b.z-w.a.z,len2=dx*dx+dz*dz;const t=clamp(((p.x-w.a.x)*dx+(p.z-w.a.z)*dz)/len2,0,1),x=w.a.x+t*dx,z=w.a.z+t*dz;return {t,x,z,distance:Math.hypot(p.x-x,p.z-z)}}
export function openingPosition(l,o){const w=wallById(l,o.wallId);if(!w)return null;return {x:w.a.x+(w.b.x-w.a.x)*o.t,z:w.a.z+(w.b.z-w.a.z)*o.t,rotation:-Math.atan2(w.b.z-w.a.z,w.b.x-w.a.x)*180/Math.PI,wall:w}}
function crosses(a,b,c,d){const sign=(p,q,r)=>(q.x-p.x)*(r.z-p.z)-(q.z-p.z)*(r.x-p.x);return sign(a,b,c)*sign(a,b,d)<-1e-10&&sign(c,d,a)*sign(c,d,b)<-1e-10}
function number(n,a,b,label){if(typeof n!=='number'||!Number.isFinite(n)||n<a||n>b)throw new Error(label+' 값이 범위를 벗어났습니다.');return n}
function name(n,fallback){return typeof n==='string'?n.slice(0,70):fallback}
function point(p){const id=String(p.id||uid('v')).slice(0,60);if(!/^[a-zA-Z0-9_-]+$/.test(id))throw new Error('모서리 ID가 올바르지 않습니다.');return {id,x:number(p.x,-60,60,'X'),z:number(p.z,-60,60,'Z')}}
export function validateLayout(raw){
 if(!raw||raw.version!==1||raw.units!=='m'||!Array.isArray(raw.rooms)||!Array.isArray(raw.walls)||!Array.isArray(raw.objects)||!Array.isArray(raw.openings))throw new Error('지원하는 공간 JSON 형식(version 1, units m)이 아닙니다.');
 if(raw.rooms.length>12||raw.walls.length>80||raw.objects.length>100||raw.openings.length>100)throw new Error('방 12개, 가구 100개, 벽 80개, 문·창문 100개까지 지원합니다.');
 const ids=new Set();function id(s){if(typeof s!=='string'||!s||s.length>80||!/^[a-zA-Z0-9_-]+$/.test(s)||ids.has(s))throw new Error('항목 ID가 올바르지 않거나 중복됩니다.');ids.add(s);return s}
 const rooms=raw.rooms.map(r=>{if(!Array.isArray(r.points)||r.points.length<3||r.points.length>24)throw new Error('방은 3~24개의 모서리를 가져야 합니다.');const ps=r.points.map(point);if(new Set(ps.map(p=>p.id)).size!==ps.length)throw new Error('방 모서리 ID가 중복됩니다.');if(area(ps)<.05||area(ps)>1000)throw new Error('방의 면적은 0.05~1,000㎡ 범위여야 합니다.');for(let i=0;i<ps.length;i++){const a=ps[i],b=ps[(i+1)%ps.length];if(Math.hypot(a.x-b.x,a.z-b.z)<.08)throw new Error('벽의 길이는 8cm 이상이어야 합니다.');for(let j=i+2;j<ps.length;j++){if(i===0&&j===ps.length-1)continue;if(crosses(a,b,ps[j],ps[(j+1)%ps.length]))throw new Error('방의 모서리가 서로 교차합니다.')}}const edges={};for(const p of ps){const e=r.edges?.[p.id];if(e)edges[p.id]={enabled:e.enabled!==false,...(e.height!==undefined?{height:WALL_HEIGHT}:{}),...(e.thickness!==undefined?{thickness:number(e.thickness,.04,.6,'벽 두께')}: {})}}return {id:id(r.id),name:name(r.name,'방'),points:ps,height:WALL_HEIGHT,thickness:number(r.thickness,.04,.6,'벽 두께'),color:/^#[0-9a-fA-F]{6}$/.test(r.color)?r.color:'#cbd0c9',edges}});
 const walls=raw.walls.map(w=>({id:id(w.id),name:name(w.name,'추가 벽'),a:point(w.a),b:point(w.b),height:WALL_HEIGHT,thickness:number(w.thickness,.04,.6,'벽 두께'),enabled:w.enabled!==false}));for(const w of walls)if(wallLength(w)<.08)throw new Error('벽의 길이는 8cm 이상이어야 합니다.');
 const seats=new Set(),objects=raw.objects.map(o=>{if(!Object.hasOwn(footprints,o.kind))throw new Error('지원하지 않는 가구 종류입니다.');if(o.kind==='seat'){if(!/^s[1-8]$/.test(o.seatId)||seats.has(o.seatId))throw new Error('좌석 ID는 s1~s8이고 중복할 수 없습니다.');seats.add(o.seatId)}return {id:id(o.id),kind:o.kind,name:name(o.name,o.kind),...(o.kind==='seat'?{seatId:o.seatId}:{}),x:number(o.x,-60,60,'가구 X'),z:number(o.z,-60,60,'가구 Z'),y:number(o.y??0,0,5,'가구 바닥 높이'),rotation:number(o.rotation??0,-3600,3600,'회전'),scaleX:number(o.scaleX??1,.1,5,'가로 배율'),scaleY:number(o.scaleY??1,.1,5,'높이 배율'),scaleZ:number(o.scaleZ??1,.1,5,'세로 배율'),roomId:rooms.some(r=>r.id===o.roomId)?o.roomId:null}});
 const result={version:1,units:'m',updatedAt:typeof raw.updatedAt==='string'?raw.updatedAt:null,appliedUpdates:Array.isArray(raw.appliedUpdates)?raw.appliedUpdates.filter(x=>typeof x==='string'&&/^[a-zA-Z0-9_-]{1,80}$/.test(x)).slice(0,20):[],rooms,walls,objects,openings:[],cutaway:raw.cutaway!==false};
 const openings=raw.openings.map(input=>{const o=normalizeOpeningAttachment(result,input);if(!['door','window'].includes(o.kind))throw new Error('문·창문 종류가 올바르지 않습니다.');const w=wallById(result,o.wallId);if(!w)throw new Error('문 또는 창문의 벽을 찾을 수 없습니다.');const length=wallLength(w);if(length<.12)throw new Error('문·창문은 길이 12cm 이상의 벽에 배치하세요.');const width=Math.min(number(o.width,.1,10,'문·창문 폭'),length-.02),sill=o.kind==='door'?0:Math.min(number(o.sill??.8,0,4.5,'창문 하단 높이'),w.height-.1),height=Math.min(number(o.height,.1,5,'문·창문 높이'),w.height-sill);return {id:id(o.id),kind:o.kind,wallId:w.id,t:clamp(number(o.t,0,1,'벽 위 위치'),width/length/2,1-width/length/2),width,height,sill,...(o.kind==='door'?{swing:number(o.swing??70,-160,160,'문 여는 각도'),hinge:o.hinge==='right'?'right':'left',leaves:o.leaves===2?2:1}: {})}});result.openings=openings;return result;
}
export function defaultLayout(){return upgradeLayout(clone(preset||legacyLayout()))}
export function moveBoundary(l,id,dx,dz){const w=wallById(l,id);if(!w)throw new Error('경계선을 찾을 수 없습니다.');const len=wallLength(w),nx=-(w.b.z-w.a.z)/len,nz=(w.b.x-w.a.x)/len,distance=dx*nx+dz*nz;const a={...w.a},b={...w.b},shift=p=>{p.x+=nx*distance;p.z+=nz*distance};if(w.manual){const item=l.walls.find(x=>x.id===w.id);shift(item.a);shift(item.b)}else for(const r of l.rooms)for(const p of r.points)if(Math.hypot(p.x-a.x,p.z-a.z)<.00001||Math.hypot(p.x-b.x,p.z-b.z)<.00001)shift(p);return distance}
export function upgradeLayout(raw){return applyRoomLabels(validateLayout(applyLoungeUpdate(applyWallTableUpdate(applyTVUpdate(applyProfTableUpdate(applyLabUpdate(validateLayout(raw))))))))}
export function loadLayout(){try{const saved=validateLayout(JSON.parse(localStorage.getItem('conict-layout-v1')||'null'));return Date.parse(saved.updatedAt||'')<Date.parse(USER_BASELINE)?defaultLayout():upgradeLayout(saved)}catch{return defaultLayout()}}
export function wallBlocks(w,openings,displayHeight){const len=wallLength(w),cuts=[0,len];const slots=openings.map(o=>({from:clamp(o.t*len-o.width/2,0,len),to:clamp(o.t*len+o.width/2,0,len),bottom:o.sill,top:o.sill+o.height}));for(const s of slots)cuts.push(s.from,s.to);cuts.sort((a,b)=>a-b);const blocks=[];for(let i=0;i<cuts.length-1;i++){const from=cuts[i],to=cuts[i+1];if(to-from<.0001)continue;const mid=(from+to)/2,holes=slots.filter(s=>mid>s.from-.00001&&mid<s.to+.00001).sort((a,b)=>a.bottom-b.bottom);let low=0;for(const h of holes){if(h.bottom>low&&low<displayHeight)blocks.push({from,to,bottom:low,top:Math.min(h.bottom,displayHeight)});low=Math.max(low,h.top)}if(low<displayHeight)blocks.push({from,to,bottom:low,top:displayHeight})}return blocks.filter(b=>b.top-b.bottom>.001)}
