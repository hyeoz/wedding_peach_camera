# Wedding Peach Camera 🍑📷

프레임 · 스티커 · 텍스트로 사진을 꾸며 저장/공유하는 **초단순 카메라 앱** (React Native + Expo).
디자인 핸드오프(`design_handoff_camera_app`)의 핑크·라벤더 감성 UI를 적용했습니다.

## 기능

1. **프로필(계정) + 이모지 테마** — 닉네임 + 이모지 아바타를 로컬에 저장해 계정처럼 사용.
   고른 이모지의 대표 색으로 **앱 전체 테마 색이 바뀜** (🍑 피치 / ⭐👑 골드 / 🐻 브라운 / 🐧 블루 / 🦄 퍼플 …)
2. **3가지 모드**
   - **프레임** — 사진이 프레임 중앙 영역에 들어감 (단일 선택)
   - **스티커** — 사진 위에 이미지 스티커를 자유 배치 (다중 선택)
   - **텍스트** — JSON 템플릿 기반 다이어리 텍스트 카드 (다중 선택)
3. **즐겨찾기** — 자주 쓰는 항목을 저장, 탭하면 선택을 건너뛰고 바로 촬영/갤러리로 (숏컷)
4. **촬영 / 갤러리** — 카메라 촬영 또는 인앱 갤러리 그리드에서 사진 선택
5. **편집** — 프레임 오버레이 확인 / 스티커·텍스트 카드 드래그·회전·크기조절·삭제
6. **저장 · 공유** — 합성 결과를 갤러리에 저장하거나 시스템 공유 시트로 공유

### 텍스트 카드 (JSON 템플릿)

`src/data/textTemplates.ts`에 JSON으로 정의합니다. 예) "데일리 체크":

```
📔 OOO님의 2026.08.14
───────────────
✓ 식단 : good / bad
✓ 운동 : good / bad
✓ 특이사항 : (탭해서 입력)
```

- 헤더의 `{nickname}` → 프로필 닉네임, `{date}` → 오늘 날짜로 치환
- `good / bad` 등 선택지는 탭으로 토글, `특이사항`은 탭 → 모달 입력
- 새 템플릿은 JSON 객체만 배열에 추가하면 됨
- 귀여운 손글씨 폰트(`Gaegu`) 적용

## 화면 플로우

```
Home (프로필 + 모드 선택)
  └─> Select (프레임/스티커/텍스트 선택 · 즐겨찾기)
        └─> Source (촬영 or 갤러리)
              ├─> Capture (카메라)  ─┐
              └─> Gallery (사진 선택) ┘
                    └─> Edit (합성 편집)
                          └─> Result (저장 · 공유)
```

## 기술 스택

- **Expo SDK 52** (managed) + **TypeScript**
- **expo-camera** / **expo-image-picker** / **expo-media-library** / **expo-sharing** — 촬영·불러오기·저장·공유
- **react-native-view-shot** — 사진 + 오버레이 합성 캡처
- **react-native-gesture-handler / reanimated** — 스티커·텍스트 카드 드래그/회전/크기조절
- **react-native-svg** — 아이콘
- **expo-linear-gradient** — 배경 그라디언트
- **@react-native-async-storage/async-storage** — 프로필·즐겨찾기 영속화
- **@react-navigation/native-stack** — 화면 이동
- 폰트: **Jua**(제목·버튼), **Gaegu**(다이어리 카드), **Poppins**(본문/숫자) — `expo-font`

## 시작하기

```bash
npm install
npx expo start          # Expo Dev Server (QR)
npm run ios / android   # 시뮬레이터/에뮬레이터
```

> 카메라·미디어는 네이티브 모듈이라 안정적 테스트는 development build를 권장합니다.
>
> ```bash
> npx expo run:ios      # 또는 npx expo run:android
> ```

빌드 검증: `npm run typecheck` (타입) / `npx expo export -p ios` (번들) 통과 확인됨.

## 디렉터리 구조

```
src/
├── components/   # GradientBackground, TopBar, PillButton, Thumb, Icons,
│                 # FrameOverlay, TextCard, PlacedItemView
├── context/      # SessionContext(편집 플로우) · ProfileContext(계정)
├── data/         # library(프레임/스티커) · textTemplates(JSON 텍스트 카드)
├── navigation/   # RootNavigator + 스택 타입
├── screens/      # Home / Profile / Select / Source / Capture / Gallery / Edit / Result
├── storage/      # 즐겨찾기 AsyncStorage
├── theme/        # 디자인 토큰(spacing/radius/shadow) · fonts · palettes(이모지별) · ThemeContext
├── types/        # 공용 타입 · 에셋 모듈 선언
└── utils/        # media(불러오기·저장·공유) · date
```

## 에셋 (플레이스홀더)

프레임/스티커 이미지는 아직 **플레이스홀더**(이모지 타일)입니다.
실제 투명 PNG를 준비해 `assets/frames/`, `assets/stickers/`에 넣고
`src/data/library.ts` 각 항목의 `source: require(...)`를 채우면 자동 반영됩니다.
프레임은 현재 디자인의 핑크 보더로 렌더되며, 실제 프레임 PNG가 있으면 이미지로 대체됩니다.

## 다음 단계 (TODO)

- [ ] 실제 프레임/스티커 PNG 에셋 추가
- [ ] 앱 아이콘 / 스플래시 이미지 (`assets/`)
- [ ] 프레임 모드에서 사진 위치/줌 조정
- [ ] 텍스트 카드 템플릿 추가 및 색상 커스터마이즈
