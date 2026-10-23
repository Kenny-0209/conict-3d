import {isCompactViewport,joystickVector} from './mobile-core.js';

const root=document.documentElement,coarse=matchMedia('(pointer: coarse)');
export const compactUI=()=>root.dataset.ui==='compact';
function syncDevice(){
 const compact=isCompactViewport({width:innerWidth,height:innerHeight,coarse:coarse.matches}),changed=compact!==compactUI();
 root.dataset.ui=compact?'compact':'desktop';
 root.dataset.input=coarse.matches?'touch':'pointer';
 if(changed)window.dispatchEvent(new CustomEvent('lab-device-change',{detail:{compact}}));
}
syncDevice();window.addEventListener('resize',syncDevice);coarse.addEventListener('change',syncDevice);

const paths={
 menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
 close:'<path d="m6 6 12 12M18 6 6 18"/>',
 chevron:'<path d="m6 9 6 6 6-6"/>',
 info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/>',
 people:'<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3m1-16a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 5v2"/>',
 image:'<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.5"/><path d="m3 17 6-6 4 4 3-3 5 5"/>',
 edit:'<path d="m15 4 5 5M4 20l5-1L21 7a2 2 0 0 0-5-5L4 14z"/>',
 monitor:'<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8m-4-4v4"/>',
 route:'<circle cx="6" cy="5" r="2"/><circle cx="18" cy="19" r="2"/><path d="M8 5h7a4 4 0 0 1 0 8H9a3 3 0 0 0 0 6h7"/>',
 overview:'<path d="m12 3 9 5-9 5-9-5zM3 12l9 5 9-5M3 16l9 5 9-5"/>',
 eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12"/><circle cx="12" cy="12" r="3"/>',
 person:'<circle cx="12" cy="6" r="3"/><path d="M7 21v-6a5 5 0 0 1 10 0v6M12 15v6"/>',
 help:'<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 4 2c-1 .6-1.5 1.1-1.5 2.5m0 3v.5"/>',
 controls:'<path d="M8 4h8l5 12a3 3 0 0 1-5 3l-2-2h-4l-2 2a3 3 0 0 1-5-3zM6 11h6m-3-3v6m7-4h.01m2 3h.01"/>',
 map:'<path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2zm6-2v16m6-14v16"/>',
 hand:'<path d="M7 12V6a2 2 0 0 1 4 0v6-8a2 2 0 0 1 4 0v8-6a2 2 0 0 1 4 0v9c0 4-3 7-7 7h-1c-2 0-3-1-4-3l-4-6a2 2 0 0 1 3-2l1 1z"/>',
 door:'<path d="M4 21h16M6 21V3h12v18M10 3l7 3v15M13 12h.01"/>',
 turnLeft:'<path d="m8 4-5 5 5 5M3 9h10a7 7 0 0 1 0 14"/>',
 turnRight:'<path d="m16 4 5 5-5 5m5-5H11a7 7 0 0 0 0 14"/>',
 walk:'<circle cx="14" cy="4" r="2"/><path d="m9 21 3-7-3-4-3 4m3-4 3-3 4 4h4m-8 3 5 7M12 7v7"/>',
 expand:'<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',minus:'<path d="M5 12h14"/>',
 download:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>'
};
export const uiIcon=name=>'<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+(paths[name]||paths.info)+'</svg>';
export const panelBlocks=panel=>panel.open&&!(compactUI()&&panel.classList.contains('is-collapsed'));
export function showResponsivePanel(panel){if(!panel.open){if(compactUI())panel.show();else panel.showModal()}}
export function syncPanelHeading(panel){
 const caption=panel.querySelector('#panel-caption');
 if(caption)caption.textContent=panel.querySelector('h2')?.textContent||'상세 보기';
 const fold=panel.querySelector('#panel-fold');
 fold?.setAttribute('aria-expanded',String(!panel.classList.contains('is-collapsed')));
 fold?.setAttribute('aria-label',panel.classList.contains('is-collapsed')?'상세 패널 펼치기':'상세 패널 접기');
}
function decorate(element,name,shortLabel){
 if(!element)return;
 const text=element.textContent.trim(),html=element.innerHTML;
 element.setAttribute('aria-label',element.getAttribute('aria-label')||text);
 element.title=element.getAttribute('aria-label');
 element.innerHTML=uiIcon(name)+'<span class="desktop-label">'+html+'</span>'+(shortLabel?'<span class="compact-label">'+shortLabel+'</span>':'');
}

export function mountVisitorMobileUI({canWalk,onJoystick,onStop,closePanel}){
 const house=document.querySelector('#house'),panel=document.querySelector('#panel'),nav=document.querySelector('.topbar nav');
 nav.id='visitor-nav';
 [['about-button','info','소개'],['people-button','people','구성원'],['album-button','image','앨범'],['pc-button','monitor','PC']].forEach(([id,icon,label])=>decorate(document.getElementById(id),icon,label));
 decorate(nav.querySelector('.studio-link'),'edit','공간 편집');
 decorate(document.querySelector('#tour-toggle'),'route');
 decorate(document.querySelector('[data-view="overview"]'),'overview');
 decorate(document.querySelector('[data-view="first"]'),'eye');
 decorate(document.querySelector('[data-view="third"]'),'person');
 decorate(document.querySelector('#help-button'),'help');
 decorate(document.querySelector('#enter-button'),'walk','입장');
 const menu=document.createElement('button');menu.id='mobile-menu';menu.className='mobile-only icon-button';menu.setAttribute('aria-label','메뉴 열기');menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-controls',nav.id);menu.innerHTML=uiIcon('menu');nav.before(menu);
 const setMenu=open=>{house.classList.toggle('menu-open',open);menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'메뉴 닫기':'메뉴 열기');menu.innerHTML=uiIcon(open?'close':'menu')};
 menu.onclick=()=>setMenu(!house.classList.contains('menu-open'));
 nav.addEventListener('click',()=>setMenu(false));
 document.addEventListener('pointerdown',e=>{if(!e.target.closest('.topbar'))setMenu(false)});

 const welcome=document.querySelector('#welcome'),welcomeFold=document.createElement('button');
 welcomeFold.id='welcome-fold';welcomeFold.className='mobile-only panel-fold';welcomeFold.innerHTML=uiIcon('chevron');welcomeFold.setAttribute('aria-label','안내 접기');welcomeFold.setAttribute('aria-expanded','true');
 const summary=document.createElement('span');summary.className='welcome-summary mobile-only';summary.textContent='CONICT · 501';welcome.prepend(summary,welcomeFold);
 welcomeFold.onclick=()=>{const folded=welcome.classList.toggle('is-collapsed');welcomeFold.setAttribute('aria-expanded',String(!folded));welcomeFold.setAttribute('aria-label',folded?'안내 펼치기':'안내 접기')};

 const panelTop=panel.querySelector('.panel-top');
 panelTop.insertAdjacentHTML('afterbegin','<span id="panel-caption" class="mobile-only"></span>');
 panelTop.querySelector('.close').insertAdjacentHTML('beforebegin','<button id="panel-fold" class="mobile-only panel-fold" aria-label="상세 패널 접기" aria-expanded="true">'+uiIcon('chevron')+'</button>');
 function foldPanel(folded){panel.classList.toggle('is-collapsed',folded);syncPanelHeading(panel);onStop();window.dispatchEvent(new Event('lab-visual-change'))}
 document.querySelector('#panel-fold').onclick=()=>foldPanel(!panel.classList.contains('is-collapsed'));
 let sheetStart=null;
 panelTop.addEventListener('pointerdown',e=>{if(compactUI()&&!e.target.closest('button')){sheetStart={id:e.pointerId,y:e.clientY};panelTop.setPointerCapture(e.pointerId)}});
 panelTop.addEventListener('pointerup',e=>{if(!sheetStart||e.pointerId!==sheetStart.id)return;const delta=e.clientY-sheetStart.y;sheetStart=null;if(Math.abs(delta)>35)foldPanel(delta>0)});
 panelTop.addEventListener('pointercancel',()=>sheetStart=null);
 window.addEventListener('keydown',e=>{if(e.key==='Escape'){setMenu(false);if(compactUI()&&panel.open){e.preventDefault();closePanel()}}});

 const hud=document.querySelector('#walk-hud');
 hud.insertAdjacentHTML('beforeend','<div id="walk-stick" class="mobile-only" role="group" aria-label="이동 조이스틱"><button id="stick-pad" aria-label="이동 조이스틱: 누른 채 원하는 방향으로 미세요"><span class="stick-directions" aria-hidden="true">⌃<i>‹</i><b>›</b><em>⌄</em></span><span id="stick-thumb">'+uiIcon('walk')+'</span></button></div>');
 const stick=document.querySelector('#stick-pad'),thumb=document.querySelector('#stick-thumb');let pointer=null;
 const resetStick=()=>{pointer=null;thumb.style.transform='translate(-50%,-50%)';stick.classList.remove('active');onJoystick({forward:0,side:0})};
 const moveStick=e=>{const r=stick.getBoundingClientRect(),v=joystickVector(e.clientX-r.left-r.width/2,e.clientY-r.top-r.height/2);thumb.style.transform='translate(calc(-50% + '+v.x+'px),calc(-50% + '+v.y+'px))';onJoystick(v)};
 stick.addEventListener('pointerdown',e=>{if(!canWalk()||pointer!==null||e.button!==0)return;e.preventDefault();pointer=e.pointerId;stick.setPointerCapture(pointer);stick.classList.add('active');moveStick(e)});
 stick.addEventListener('pointermove',e=>{if(e.pointerId===pointer){e.preventDefault();if(canWalk())moveStick(e);else resetStick()}});
 for(const event of ['pointerup','pointercancel','lostpointercapture'])stick.addEventListener(event,e=>{if(e.pointerId===pointer)resetStick()});
 window.addEventListener('blur',resetStick);document.addEventListener('visibilitychange',()=>{if(document.hidden)resetStick()});

 const map=document.querySelector('.minimap');map.id='walk-map';
 const mapToggle=document.createElement('button');mapToggle.id='map-toggle';mapToggle.className='mobile-only icon-button';mapToggle.setAttribute('aria-label','지도 펼치기');mapToggle.setAttribute('aria-expanded','false');mapToggle.setAttribute('aria-controls',map.id);mapToggle.innerHTML=uiIcon('map');document.querySelector('.walk-location').append(mapToggle);
 mapToggle.onclick=()=>{const expanded=map.classList.toggle('is-expanded');mapToggle.setAttribute('aria-expanded',String(expanded));mapToggle.setAttribute('aria-label',expanded?'지도 접기':'지도 펼치기')};
 const tools=document.createElement('button');tools.id='controls-toggle';tools.className='mobile-only icon-button';tools.setAttribute('aria-label','이동 조작 접기');tools.setAttribute('aria-expanded','true');tools.innerHTML=uiIcon('controls');document.querySelector('.experience-bar').append(tools);
 tools.onclick=()=>{const hidden=house.classList.toggle('controls-collapsed');tools.setAttribute('aria-expanded',String(!hidden));tools.setAttribute('aria-label',hidden?'이동 조작 펼치기':'이동 조작 접기');resetStick();onStop()};
 document.querySelectorAll('[data-look]').forEach(b=>decorate(b,b.dataset.look==='left'?'turnLeft':'turnRight'));
 window.addEventListener('lab-device-change',()=>{
  resetStick();onStop();setMenu(false);house.classList.remove('controls-collapsed');tools.setAttribute('aria-expanded','true');tools.setAttribute('aria-label','이동 조작 접기');
  if(panel.open){const collapsed=panel.classList.contains('is-collapsed');panel.close();showResponsivePanel(panel);panel.classList.toggle('is-collapsed',compactUI()&&collapsed)}
  if(!compactUI()){panel.classList.remove('is-collapsed');welcome.classList.remove('is-collapsed');welcomeFold.setAttribute('aria-expanded','true');welcomeFold.setAttribute('aria-label','안내 접기')}
  syncPanelHeading(panel);
 });
 return {resetStick,syncTour(){
  const card=document.querySelector('#tour-card');if(!card.querySelector('#tour-fold'))return;
  const fold=card.querySelector('#tour-fold'),sync=()=>{const collapsed=card.classList.contains('is-collapsed');fold.setAttribute('aria-expanded',String(!collapsed));fold.setAttribute('aria-label',collapsed?'투어 설명 펼치기':'투어 설명 접기')};
  sync();fold.onclick=()=>{card.classList.toggle('is-collapsed');sync()};
 }};
}
