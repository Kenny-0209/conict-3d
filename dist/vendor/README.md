# 3D 라이브러리

인터넷 CDN의 가용성에 의존하지 않도록 Three.js 0.180.0과 필요한 모듈을 이 폴더에 저장했습니다. 예제 보조 모듈의 import 경로만 이 정적 폴더 구조에 맞췄습니다.

`three.module.js`, `three.core.js`, `OrbitControls.js`, `RoundedBoxGeometry.js`, `GLTFExporter.js`, `BufferGeometryUtils.js`를 사용합니다. 원문 라이선스는 `LICENSE.txt`입니다. 별도 npm 설치 없이 import map으로 연결됩니다.

2026-10-16 `GLTFLoader.js`를 추가했습니다. 동일한 Three.js 0.180.0의 MIT 라이선스 예제 로더이며 기존 `2026-10-16/복셀8인/GLTFLoader.js` 사본을 재사용했습니다. `three` import map과 이 폴더의 `BufferGeometryUtils.js`를 사용하여 윤세빈 GLB의 스킨·애니메이션·내장 텍스처를 읽습니다.
