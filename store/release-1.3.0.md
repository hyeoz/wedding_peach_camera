# 웨피캠 1.3.0

- 추가: 식단공유#1 에 게시글 4:5(1080×1350) 비율. 편집 화면 위에서 스토리 9:16 / 게시글 4:5 선택.
- 게시글은 끼니 사진 정방형, 맨 아래 한 문장 칸. 스토리는 1.2.0 그대로.
- 단축어: `wepicam://diet?format=feed` 로 게시글 비율로 바로 연다.

## 검증

- TypeScript 통과, 테스트 108개 통과.
- iOS 27.2 시뮬레이터 Release 빌드에서 게시글 비율 레이아웃(정방형 사진 칸·한 문장 칸) 확인. 사진을 채운 상태는 실기기 TestFlight 로 확인.

## 빌드

- 2026-11-13 Xcode 27.2 로 아카이브(Pods 최소 버전 15.1), `local-release-ios.mjs --skip-archive --build-number 12` 로 업로드.
- 빌드 12 VALID, 내부 그룹 `tester` IN_BETA_TESTING. 외부 그룹·심사 제출 없음.
