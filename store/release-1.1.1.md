# 웨피캠 1.1.1

- 변경: 전·후면 카메라 전환 후 녹화 버튼이 비활성 상태로 남는 문제 수정.
- 원인: iOS expo-camera 17.0.10은 facing 변경 시 onCameraReady를 재발행하지 않음.
- 수정: facing별 CameraView key로 새 세션을 마운트하고 준비 완료까지 녹화·전환을 차단.
- 단축어: `wepicam://video`를 URL 열기로 실행하면 동영상 화면으로 진입.
- 시작 화면 아래에 Home을 유지해 뒤로가기 지원. URL로 자동 녹화를 시작하지 않음.
- 설정: 단축어 앱 → URL (`wepicam://video`) → URL 열기. 설정 → 동작 버튼 → 단축어에서 선택.
- 출시 설정: 심사 승인 후 자동 출시 (이전 버전과 동일).

## 검증

- TypeScript 통과.
- 테스트 91개 통과: 전·후면 왕복 전환/새 마운트 ready 이벤트 계약, 단축어 경로 포함.
- Expo Doctor 18/18 통과.
- 연결 가능한 실기기가 없어 전·후면 실제 영상 녹화 검증은 수행하지 못함.
- App Store iPhone/iPad 스크린샷 각 5장 COMPLETE 확인.
- iOS Release 시뮬레이터 빌드 성공.
- 시뮬레이터에서 콜드/웜 URL 진입, 홈 복귀, 중복 URL 실행 후 단일 화면 유지 확인.
- iOS 배포 아카이브/IPA 생성 성공: 1.1.1 (10).

## 제출 결과

- 2026-09-18 14:58 KST, 빌드 10 VALID 확인 및 버전에 연결.
- 버전 상태: WAITING_FOR_REVIEW.
- 심사 제출 상태: WAITING_FOR_REVIEW.
- 심사 제출 ID: f78bdb61-a6f1-456d-91b0-de96c5f5be73.
- App Store Connect: https://appstoreconnect.apple.com/apps/6802001222/distribution/ios/version/1.1.1
