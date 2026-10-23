# 배포 워크플로

pages.yml은 codex/site-upload 브랜치의 dist/ 파일이 변경되거나 수동 실행을 요청했을 때 GitHub Pages로 3D 사이트를 배포합니다. actions/checkout, configure-pages, upload-pages-artifact, deploy-pages를 사용하며 GitHub의 github-pages 환경에 배포합니다. 이 폴더는 소스 저장소에서만 관리하고 공개 웹사이트 콘텐츠에는 포함하지 않습니다.
