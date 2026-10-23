import {compactUI,uiIcon} from './mobile-ui.js?v=walk20261024';

const $=s=>document.querySelector(s),body=document.body,sidebar=$('.sidebar'),stage=$('.stage'),nav=$('.topbar nav');
sidebar.id='studio-sidebar';
const decorate=(el,icon,label)=>{if(!el)return;const original=el.querySelector(':scope>.studio-desktop-label')?.innerHTML||el.innerHTML;el.setAttribute('aria-label',label||el.textContent.trim());el.title=el.getAttribute('aria-label');el.innerHTML=uiIcon(icon)+'<span class="studio-desktop-label">'+original+'</span>'};
for(const [tab,icon,label] of [['space','overview','공간 둘러보기'],['edit','edit','공간 편집'],['furniture','controls','가구 선택'],['people','people','구성원'],['network','monitor','PC 연결']])decorate(nav.querySelector('[data-tab="'+tab+'"]'),icon,label);
decorate($('.home-return'),'door','방문 홈페이지로 돌아가기');
const controls=document.createElement('div');controls.id='studio-mobile-tools';controls.className='studio-mobile-only';
controls.innerHTML='<button id="studio-plan-toggle" aria-label="평면도 펼치기" aria-expanded="false" aria-controls="plan-panel">'+uiIcon('map')+'</button><button id="studio-sidebar-toggle" aria-label="선택·속성 패널 펼치기" aria-expanded="false" aria-controls="studio-sidebar">'+uiIcon('controls')+'</button><button id="studio-export-toggle" aria-label="저장 메뉴 펼치기" aria-expanded="false">'+uiIcon('download')+'</button>';
$('.topbar').append(controls);
const buttons={sidebar:$('#studio-sidebar-toggle'),plan:$('#studio-plan-toggle'),export:$('#studio-export-toggle')};
function setPanel(which,open){
 for(const name of Object.keys(buttons)){
  const active=name===which&&open;body.classList.toggle('studio-'+name+'-open',active);buttons[name].setAttribute('aria-expanded',String(active));
  const label={sidebar:'선택·속성 패널',plan:'평면도',export:'저장 메뉴'}[name];buttons[name].setAttribute('aria-label',label+(active?' 접기':' 펼치기'));
 }
}
for(const [which,button] of Object.entries(buttons))button.onclick=()=>setPanel(which,!body.classList.contains('studio-'+which+'-open'));
sidebar.addEventListener('click',e=>{if(compactUI()&&e.target.closest('.object-item,.person-item'))setPanel('sidebar',false)});
const sidebarClose=document.createElement('button');sidebarClose.id='studio-sidebar-close';sidebarClose.className='studio-mobile-only';sidebarClose.setAttribute('aria-label','선택·속성 패널 접기');sidebarClose.innerHTML=uiIcon('chevron');sidebar.prepend(sidebarClose);sidebarClose.onclick=()=>setPanel('sidebar',false);
const planClose=document.createElement('button');planClose.id='studio-plan-close';planClose.className='studio-mobile-only';planClose.setAttribute('aria-label','평면도 접기');planClose.innerHTML=uiIcon('chevron');$('.plan-head>div').append(planClose);planClose.onclick=()=>setPanel('plan',false);
decorate($('#plan-fit'),'overview','평면도 전체 맞춤');decorate($('#plan-expand'),'expand','평면도 확대');
new MutationObserver(()=>{const button=$('#plan-expand');if(!button.querySelector(':scope>.ui-icon'))decorate(button,'expand',stage.classList.contains('plan-expanded')?'3D 화면 함께 보기':'평면도 확대')}).observe($('#plan-expand'),{childList:true});
const toolLabels={select:'선택',boundary:'경계',room:'방',wall:'벽'};
for(const b of document.querySelectorAll('[data-plan-tool]')){const original=b.textContent;b.dataset.compactLabel=toolLabels[b.dataset.planTool];b.setAttribute('aria-label',original);b.innerHTML='<span class="studio-desktop-label">'+original+'</span><span class="studio-mobile-only">'+toolLabels[b.dataset.planTool]+'</span>'}
for(const [id,label] of [['add-door','문'],['add-window','창']]){const b=document.getElementById(id);b.setAttribute('aria-label',b.textContent);b.innerHTML='<span class="studio-desktop-label">'+b.textContent+'</span><span class="studio-mobile-only">'+label+'</span>'}

let detailFolded=false;
function syncDetail(){
 const detail=$('#detail');if(detail.hidden||!detail.querySelector('.detail-top'))return;
 let fold=detail.querySelector('.studio-detail-fold');
 if(!fold){fold=document.createElement('button');fold.className='studio-detail-fold studio-mobile-only';fold.innerHTML=uiIcon('chevron');detail.querySelector('.detail-top').append(fold);fold.onclick=()=>{detailFolded=!detailFolded;syncDetail()}}
 let caption=detail.querySelector('.studio-detail-caption');
 if(!caption){caption=document.createElement('b');caption.className='studio-detail-caption studio-mobile-only';detail.querySelector('.detail-top').prepend(caption)}
 const title=detail.querySelector('h2')?.textContent||'상세 보기';if(caption.textContent!==title)caption.textContent=title;
 detail.classList.toggle('is-collapsed',detailFolded);fold.setAttribute('aria-expanded',String(!detailFolded));fold.setAttribute('aria-label',detailFolded?'상세 설명 펼치기':'상세 설명 접기');
}
new MutationObserver(syncDetail).observe($('#detail'),{childList:true,subtree:true});
function syncTab(open=false){
 const tab=nav.querySelector('[data-tab].active')?.dataset.tab||'space';body.dataset.studioTab=tab;
 if(compactUI()&&open){if(tab==='edit')setPanel('plan',true);else if(['furniture','people','network'].includes(tab))setPanel('sidebar',true);else setPanel('sidebar',false)}
 syncDetail();
}
nav.addEventListener('click',e=>{if(e.target.closest('[data-tab]'))queueMicrotask(()=>syncTab(true))});
new MutationObserver(()=>syncTab(true)).observe(nav,{attributes:true,attributeFilter:['class'],subtree:true});
window.addEventListener('hashchange',()=>queueMicrotask(()=>syncTab(false)));
window.addEventListener('lab-device-change',()=>{setPanel('sidebar',false);syncTab(false)});
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&compactUI())setPanel('sidebar',false)});
syncTab(false);
