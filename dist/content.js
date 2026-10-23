export const official='https://conict.seoultech.ac.kr';
export const pageLinks={
 ...Object.fromEntries(['m1','m2','m3','m4','m5','m6','m7','m8'].map(id=>[id,null])),
 m1:'https://sebeen-yoon-research.paul020600.chatgpt.site/',
 m2:'https://sangmin9242.github.io/interactive.html?v=a85d4d2&lang=eng',
 m7:'https://kenny-0209.github.io/kyeongsoon-orbit/?v=20261018'
};
// Set a member's URL above when their authored personal page is ready.
export const albums=[
 {id:'space',name:'공간 스냅',subtitle:'사진으로 만나는 우리의 연구실',type:'photos'},
 {id:'conference',name:'현장·학회',subtitle:'연구실 밖에서 함께한 활동',type:'records'},
 {id:'highlights',name:'연구실 소식',subtitle:'공식 홈페이지에 남겨 둔 순간들',type:'records'},
 {id:'workshop',name:'워크숍·세미나',subtitle:'함께 배우고 이야기하는 시간',type:'records'}
];
const photoNames=['입구의 대형 TV','작은 주방','흰색 프레임의 자리','함께 일하는 연구실','노트북과 모니터','연구원의 책상','세 대의 모니터','함께 앉는 테이블','자리에서 바라본 연구실','연구원 공간 전경','창가의 연구원 자리','프린터와 창가 수납장','교수실의 이동식 TV','교수실·미팅 공간','교수실의 보조 테이블','교수실 입구','두 방을 잇는 문','연구실 앨범 TV','입구에서 본 연구실'];
export const photos=photoNames.map((title,i)=>({title,src:'./assets/room-'+String(i+1).padStart(2,'0')+'.jpg',caption:'제공해 주신 연구실 공간 사진 · 3D 모델의 참고 사진'}));
export const records=[
 {photoUrl:null,album:'workshop',date:'2025.08.25',title:'디지털 워크숍',url:official+'/subList/20000005923?nttSeq=21&pmode=detail'},
 {photoUrl:null,album:'workshop',date:'2025.09.22',title:'Lab Seminar',url:official+'/subList/20000005923?nttSeq=22&pmode=detail'},
 {photoUrl:null,album:'workshop',date:'2025.09.29',title:'Lab Seminar',url:official+'/subList/20000005923?nttSeq=23&pmode=detail'},
 {photoUrl:null,album:'conference',date:'2024.07.17',title:'스마트건설위원회 남양주 진접',url:official+'/subList/20000008503?nttSeq=59&pmode=detail'},
 {photoUrl:null,album:'conference',date:'2024.06.29 – 07.02',title:'Creative Construction Conference',url:official+'/subList/20000008503?nttSeq=58&pmode=detail'},
 {photoUrl:null,album:'conference',date:'2024.05.23',title:'시공학회 봄학술발표대회',url:official+'/subList/20000008503?nttSeq=57&pmode=detail'},
 {photoUrl:null,album:'highlights',date:'2025.08.20',title:'학위 수여식',url:official+'/subList/20000008502?nttSeq=39&pmode=detail'},
 {photoUrl:null,album:'highlights',date:'2025.06.10',title:'강민균 석사 논문 발표',url:official+'/subList/20000008502?nttSeq=38&pmode=detail'},
 {photoUrl:null,album:'highlights',date:'2025.08.28',title:'개인 과제 선정',url:official+'/subList/20000008502?nttSeq=40&pmode=detail'}
];
export const galleryFallback={workshop:official+'/subList/20000008501',conference:official+'/subList/20000008503',highlights:official+'/subList/20000008502'};
export const tourStops=[
 {id:'welcome',eyebrow:'01 · WELCOME',title:'연구실에 오신 걸 환영해요',description:'두 방을 잇는 작은 연구실입니다. 이곳에서 일하고, 함께 앉아 이야기하고, 새로운 생각을 나눕니다.',action:'손님으로 들어가기',type:'welcome',object:'d2'},
 {id:'desks',eyebrow:'02 · OUR SPACE',title:'생각이 자라는 자리',description:'일곱 개의 연구원 자리. 모니터, 책상과 익숙한 소품이 각자의 공간을 만듭니다. 컴퓨터를 누르면 그 자리의 주인을 만날 수 있어요.',action:'연구원 자리 둘러보기',type:'desks',object:'seat-s4'},
 {id:'people',eyebrow:'03 · SAY HELLO',title:'사람이 있는 연구실',description:'아바타에게 인사를 건네 보세요. 이름과 역할을 소개하고 자신의 자리로 안내합니다.',action:'구성원에게 인사하기',type:'people',object:'seat-s3'},
 {id:'tv',eyebrow:'04 · LAB ALBUM',title:'큰 화면 속 우리 이야기',description:'입구의 대형 TV는 연구실 앨범입니다. 실제 공간 사진과 공식 홈페이지에 남겨 둔 현장·학회, 연구실 소식을 볼 수 있어요.',action:'TV에서 앨범 열기',type:'album',album:'space',object:'f13'},
 {id:'coffee',eyebrow:'05 · COFFEE BREAK',title:'커피 한 잔, 함께한 시간',description:'3인 소파와 핸드드립 커피대가 있는 휴식 공간입니다. 일하는 구성원도 각자3분마다 커피나 휴식을 다녀온 뒤 자기 자리로 돌아갑니다. 워크숍·세미나 기록도 펼쳐 보세요.',action:'워크숍·세미나 보기',type:'album',album:'workshop',object:'coffee-cab'},
 {id:'professor',eyebrow:'06 · PROFESSOR',title:'교수님께 인사드리기',description:'연결된 문을 지나면 교수실과 미팅 공간이 나옵니다. 김태훈 교수님의 자리에서 연구실의 지도교수를 만나 보세요.',action:'김태훈 교수님께 인사하기',type:'person',object:'seat-s8'},
 {id:'meeting',eyebrow:'07 · TOGETHER',title:'함께 둘러앉는 공간',description:'목재 테이블과 의자가 모인 미팅 공간. 방문자도 연구실 구성원이 된 기분으로 둘러볼 수 있습니다.',action:'이곳에서 자유롭게 걷기',type:'walk',object:'f22'}
];
