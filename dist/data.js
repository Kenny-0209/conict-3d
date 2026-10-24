export const members = [
  {id:'m1',name:'윤세빈',en:'Sebeen Yoon',role:'박사과정',image:'member-01.jpg',shirt:'#abc3e2',pants:'#253347',hair:'part',glasses:false,skin:'#e8bb9b',suit:false,striped:true},
  {id:'m2',name:'이상민',en:'Sangmin Lee',role:'석사과정',image:'member-02.jpg',shirt:'#25282c',pants:'#30353b',hair:'short',glasses:'round',skin:'#d9b08b',face:1.08},
  {id:'m3',name:'배강민',en:'Kangmin Bae',role:'석사과정',image:'member-03.jpg',shirt:'#62624c',pants:'#292d31',hair:'fringe',glasses:'square',skin:'#d7ad89',face:1.06,jacket:true},
  {id:'m4',name:'차민승',en:'MinSeung Cha',role:'석사과정',image:'member-04.jpg',shirt:'#24262b',pants:'#63676d',hair:'fringe',glasses:false,skin:'#e3bc9c',face:0.94},
  {id:'m5',name:'위삼',en:'Wesam Hashim',role:'석사과정',image:'member-05.jpg',shirt:'#e3c7d0',pants:'#30303d',hair:'scarf',glasses:false,skin:'#b98769',face:0.96,tunic:true,heightMeters:1.60},
  {id:'m6',name:'아브로벡',en:'Akramov Abrorbek',role:'석사과정',image:'member-06.jpg',shirt:'#2b303e',pants:'#282e3c',hair:'part',glasses:false,skin:'#d8ad96',suit:true,tie:true},
  {id:'m7',name:'김경순',en:'Kyeongsoon Kim',role:'학부연구생',image:'member-07.jpg',shirt:'#4d5260',pants:'#303441',hair:'part',glasses:false,skin:'#e2b797',suit:true},
  {id:'m8',name:'김태훈',en:'Taehoon Kim',role:'지도교수',image:'profile-08.webp',shirt:'#303943',pants:'#464b53',hair:'swept',glasses:false,skin:'#dbb398',suit:true,professor:true}
];
export const SEAT_REVISION='2026-10-15-seat-map';
export const seats=[
  {id:'s1',label:'좌석 01',member:'m3',x:-3.2,z:-1.75,rotation:0,photo:11,chair:'white',description:'세로 모니터 + 가로 모니터 2대 · 민트 좌판'},
  {id:'s2',label:'좌석 02',member:'m7',x:-1.3,z:-1.75,rotation:0,photo:4,chair:'black',description:'3대 모니터 · 우측 PC 타워'},
  {id:'s3',label:'좌석 03',member:'m1',x:0.6,z:-1.75,rotation:0,photo:7,chair:'black',description:'3대 모니터 · 검정 데스크매트'},
  {id:'s4',label:'좌석 04',member:'m2',x:2.5,z:-1.75,rotation:0,photo:9,chair:'black',description:'우측 세로 모니터 · 검정 헤드레스트'},
  {id:'s5',label:'좌석 05',member:'m4',x:-3.2,z:0.05,rotation:Math.PI,photo:6,chair:'black',description:'좌측 세로 모니터 · 헤드폰 · 커피'},
  {id:'s6',label:'좌석 06',member:'m6',x:-1.3,z:0.05,rotation:Math.PI,photo:5,chair:'white',description:'3대 모니터 + 노트북 · 청록 좌판'},
  {id:'s7',label:'좌석 07',member:'m5',x:0.6,z:0.05,rotation:Math.PI,photo:3,chair:'white',description:'우측 세로 모니터 · 흰색 프레임 의자'},
  {id:'s8',label:'교수님 자리',member:'m8',x:0.75,z:5.95,rotation:Math.PI,photo:14,chair:'black',professor:true,description:'교수실 책상 · 듀얼 모니터 · 화분'}
];
export const furniture=[
  {id:'sofa-3',name:'3인 휴식 소파',en:'Three-seat lounge sofa',photo:10,detail:'세 개의 독립 좌방석, 세이지색 패브릭 등받이, 낮은 팔걸이와 목재 다리. 커피대 옆에서 세 명까지 앉아 쉬거나 커피를 마십니다.',size:'휴식 공간 시안 216 × 94 × 86 cm · 3인용'},
  {id:'desk',name:'높이 조절 책상',en:'Standing desk',photo:3,detail:'흰색 상판, 둥근 앞 모서리, 두 개의 전동 다리와 T자 발, 우측 조작 패널.',size:'실측 가로 160 cm · 깊이 80 / 높이 74 cm는 시안'},
  {id:'chair-black',name:'검정 메쉬 의자',en:'Ergonomic chair',photo:6,detail:'굴곡진 메쉬 등판과 헤드레스트, 좌판, 두 팔걸이, 5발 바퀴 베이스.',size:'시안 65 × 65 × 118 cm'},
  {id:'chair-white',name:'흰색 프레임 의자',en:'White-frame chair',photo:3,detail:'곡선형 흰색 프레임, 연회색 메쉬 등판, 민트색 좌판과 5발 바퀴.',size:'시안 65 × 65 × 110 cm'},
  {id:'monitors',name:'3대 모니터',en:'Triple monitor setup',photo:11,detail:'가로 화면 2대와 세로 화면 1대. 모니터 암, 받침대, 상단 조명과 웹캠.',size:'시안 가로 155 cm'},
  {id:'tower',name:'컴퓨터 본체',en:'PC tower',photo:5,detail:'검정 타워 케이스, 전면 통풍구, 상단 버튼과 세 개의 팬.',size:'시안 24 × 45 × 48 cm'},
  {id:'partition',name:'회색 파티션',en:'Desk partition',photo:10,detail:'회색 패브릭 표면, 둥근 모서리, 흰색 고정 브래킷과 메모지.',size:'시안 160 × 4 × 58 cm'},
  {id:'meeting',name:'연구실 회의 테이블',en:'Shared table',photo:8,detail:'밝은 목재 상판, 둥근 모서리, 흰색 다리와 간식 접시. 의자 팔걸이와 겹치지 않도록 상판을 높였습니다.',size:'실측 상판 200 × 95 cm · 상판 높이 약 89 cm는 시안'},
  {id:'tv',name:'이동식 대형 TV',en:'Mobile display',photo:13,detail:'검정 얇은 테두리, 후면 이중 지지대, 가로 트레이와 네 개의 바퀴.',size:'시안 화면 폭 190 cm'},
  {id:'bookshelf',name:'목재 책장',en:'Bookcase',photo:14,detail:'따뜻한 오크색 칸막이, 책·파일과 닫힌 수납칸.',size:'시안 150 × 36 × 195 cm'},
  {id:'cabinet',name:'흰색 수납장',en:'Low cabinet',photo:1,detail:'다섯 개의 세로 도어와 얇은 흰색 상판. 대형 TV 하부 수납장.',size:'시안 220 × 35 × 80 cm'},
  {id:'kitchen',name:'싱크대와 냉장고',en:'Kitchenette',photo:2,detail:'스테인리스 싱크와 수도꼭지, 흰색 하부장, 2도어 냉장고.',size:'시안 총 폭 190 cm'},
  {id:'shelf',name:'가전 수납 선반',en:'Appliance shelf',photo:8,detail:'흰색 개방형 선반, 전자레인지, 에어프라이어와 주전자.',size:'시안 85 × 42 × 185 cm'},
  {id:'purifier',name:'교수실 공기청정기',en:'Professor-room air purifier',photo:15,detail:'위아래 두 단 원통형 바디, 수직 통풍 슬릿과 파란색 상단 링.',size:'시안 지름 38 × 높이 98 cm'},
  {id:'purifier-lab',name:'연구원 공간 공기청정기',en:'Research-room air purifier',photo:8,detail:'흰색 단일 몸체, 넓은 상단 송풍 헤드와 투명한 테두리, 파란 LED 링. 교수실의 두 단 원통형과 구분됩니다.',size:'시안 지름 54 × 높이 91 cm'},
  {id:'wood-cabinet',name:'프린터 수납장',en:'Printer storage module',photo:12,detail:'창가의 밝은 목재색 하부 수납장. 세로 도어, 둥근 흰색 손잡이와 공용 상판을 가진 모듈 3개를 각각 배치합니다.',size:'모듈당 시안 62 × 43 × 77 cm · 3개'},
  {id:'coffee-cabinet',name:'검정 커피 수납장',en:'Coffee storage cabinet',photo:10,detail:'싱크대 맞은편의 검정 하부 수납장. 서랍과 도어, 얇은 상판 위에 커피 도구를 배치합니다. 사진에서 가려진 부분은 시안으로 보완했습니다.',size:'시안 115 × 48 × 78 cm'},
  {id:'coffee-tools',name:'핸드드립 커피 도구',en:'Pour-over coffee tools',photo:10,detail:'가느다란 주둥이의 주전자, 드리퍼와 종이 필터, 유리 서버 및 컵. 가려진 도구는 핸드드립 형태로 해석한 시안이며 제품 모델은 미확정입니다.',size:'시안 배치 폭 110 × 깊이 42 cm'},
  {id:'rack',name:'옷걸이와 우산꽂이',en:'Coat rack',photo:18,detail:'흰색 이동식 프레임, 옷걸이, 걸린 겉옷과 회색 우산꽂이.',size:'시안 80 × 40 × 160 cm'},
  {id:'media-tv',name:'연구실 앨범 TV',en:'Lab album display',photo:1,detail:'흰색 테두리의 대형 TV. 사진 속 고양이는 화면에 표시된 이미지이며, 홈페이지에서는 연구실 앨범을 여는 화면으로 사용합니다.',size:'시안 216 × 7 × 121 cm'},
  {id:'lamp',name:'스탠드 조명',en:'Floor lamp',photo:12,detail:'가느다란 검정 기둥, 원형 베이스, 위로 열린 흰색 갓.',size:'시안 높이 165 cm'},
  {id:'printer',name:'프린터',en:'Printer',photo:12,detail:'흰색 바디, 검정 용지 출력부, 상단 스캔 덮개와 작은 화면.',size:'시안 45 × 40 × 35 cm'},
  {id:'prof-table',name:'교수실 회의 테이블',en:'Professor meeting table',photo:14,detail:'꿀빛 목재의 긴 상판과 은색 다리, 파란 좌판의 회의용 의자.',size:'시안 210 × 85 × 74 cm'},
  {id:'side-table',name:'교수실 보조 테이블',en:'Professor-room side table',photo:15,detail:'모니터 기준 오른쪽 벽, 냉장고와 책장 사이의 보조 테이블. 한쪽 끝이 둥근 목재 상판, 짙은 테두리, 검정 원통 다리와 회색 수납 받침. 화분과 간식 바구니도 반영했습니다.',size:'사진 기반 시안 130 × 65 × 75 cm · 실측 전'},
  {id:'wall-table',name:'교수실 벽면 탁자',en:'Professor wall-side table',photo:14,detail:'교수님 책상에서 모니터를 바라볼 때 오른쪽 벽, 책장 끝과 스탠드 사이에 놓인 직사각형 목재 상판 탁자. 전경 사진에서 외투에 일부 가려져 있는 가구입니다. 가려진 하부는 짙은 프레임 형태의 시안으로 보완했습니다.',size:'사진 기반 시안 140 × 60 × 74 cm · 실측 전'},
  {id:'sink',name:'교수실 세면대',en:'Pedestal sink',photo:15,detail:'흰색 타원형 볼과 긴 받침, 수도꼭지와 벽 거울.',size:'시안 50 × 45 × 82 cm'},
  {id:'fridge',name:'교수실 냉장고',en:'Compact fridge',photo:15,detail:'흰색 위·아래 2도어와 작은 손잡이.',size:'시안 50 × 54 × 125 cm'}
];
export const demoStates={s1:'online',s2:'online',s3:'no-response',s4:'online',s5:'no-response',s6:'online',s7:'online',s8:'online'};
