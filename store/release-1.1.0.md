# 웨피캠 1.1.0 App Store 심사

- 대상: iOS 1.1.0 (빌드 9)
- 준비일: 2026-09-17
- 출시 설정: 심사 승인 후 자동 출시 (기존 설정 유지)

## 새로운 기능

무음 동영상 촬영 기능이 추가되었어요!

• 홈에서 무음 동영상 촬영을 바로 시작할 수 있어요.
• 두 손가락으로 화면을 확대하거나 축소할 수 있어요.
• 촬영 전에 전면·후면 카메라를 전환할 수 있어요.
• 촬영을 마치면 원본 동영상이 사진 앨범에 저장돼요.

동영상에는 소리가 녹음되지 않으며, 마이크 권한을 요청하지 않아요.

## 심사 안내

· 로그인/회원가입이 없어 심사용 테스트 계정이 필요하지 않습니다.

· 권한 사용 목적
  - 카메라: 사진 및 무음 동영상 촬영에 사용합니다.
  - 사진 라이브러리(읽기): 꾸밀 사진 선택, 사용자가 직접 등록하는 프레임·스티커
    이미지 선택에 사용합니다.
  - 사진 라이브러리(추가): 완성한 사진과 촬영한 동영상을 기기 앨범에 저장할 때 사용합니다.

· 사용자의 사진과 편집 데이터는 기기 안에서만 처리되며 외부 서버로 전송되지 않습니다.
  계정, 광고, 분석 SDK, 인앱 결제가 모두 없습니다.

· 앱에 기본 제공되는 프레임·스티커 이미지는 없습니다. 사용자가 사진 앱에서 이미지를
  직접 골라 이름을 붙여 등록하는 구조입니다.
  확인 경로: 홈 → 프레임(또는 스티커) → 우측 상단 '+ 등록' → 이미지 선택 → 이름 입력
  삭제는 목록에서 항목 좌상단의 삭제 버튼을 누르면 됩니다.

· 텍스트 카드에 표시되는 날짜·시각은 선택한 사진의 EXIF 촬영 일시에서 읽습니다.
  EXIF 가 없는 사진(스크린샷, 메신저로 받은 이미지 등)은 앨범 등록 시각을,
  그마저 없으면 현재 시각을 사용합니다.
  EXIF 에서 촬영 일시만 읽으며 위치(GPS) 정보는 읽지 않습니다.
  읽어 들인 값은 기기 안에서만 쓰이고 어디에도 전송되지 않습니다.

· 기본 사용 흐름
  홈에서 모드(프레임/스티커/텍스트) 선택 → 촬영 또는 갤러리에서 사진 선택 →
  편집 화면에서 배치·크기·회전 조정 → 완료 → 저장 또는 공유

· iPhone과 iPad를 모두 지원합니다.

Version 1.1.0 — Silent video capture
No login or test account is required. On the Home screen, tap "무음 동영상" to open video capture. Grant camera access, then tap the red record button to start and tap it again to stop. Grant photo library add permission to save the recorded video. Pinch to zoom. Use "전환" before recording to switch between front and rear cameras. Video capture intentionally excludes audio and does not request microphone permission. The original recorded file is saved locally without post-recording re-encoding. No video editing, overlays, or server uploads are provided.

## 검증

- App Store Connect 빌드 상태: VALID
- iPhone / iPad 스크린샷: 각 5장, 모두 COMPLETE
- TypeScript 검사 통과
- Node 24에서 테스트 88개 통과
- 개인정보처리방침 / 지원 URL: HTTP 200

## 제출 결과

- 제출 시각: 2026-09-17 21:56 KST
- 버전 상태: WAITING_FOR_REVIEW
- 심사 상태: WAITING_FOR_REVIEW
- App Store Connect: https://appstoreconnect.apple.com/apps/6802001222/distribution/ios/version/1.1.0
