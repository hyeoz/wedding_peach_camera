# 웨피캠 (Wepicam) 🍑📷

프레임 · 스티커 · 텍스트로 사진을 꾸며 저장/공유하는 **초단순 카메라 앱** (React Native + Expo).
디자인 핸드오프(`design_handoff_camera_app`)의 핑크·라벤더 감성 UI를 적용했습니다.

## 기능

1. **프로필(계정) + 이모지 테마** — 닉네임 + 이모지 아바타를 로컬에 저장해 계정처럼 사용.
   고른 이모지의 대표 색으로 **앱 전체 테마 색이 바뀜** (🍑 피치 / ⭐👑 골드 / 🐻 브라운 / 🐧 블루 / 🦄 퍼플 …)
2. **3가지 모드**
   - **프레임** — 사용자가 이미지와 이름을 직접 등록, 사진 위에 프레임으로 적용 (단일 선택)
   - **스티커** — 사용자가 이미지와 이름을 직접 등록, 사진 위에 자유 배치 (다중 선택)
   - **텍스트** — JSON 템플릿 기반 다이어리 텍스트 카드 (다중 선택)
   - 등록한 프레임·스티커의 이미지는 앱 문서 폴더에, 목록은 AsyncStorage에 저장되며 삭제 가능
3. **즐겨찾기** — 자주 쓰는 항목을 저장, 탭하면 선택을 건너뛰고 바로 촬영/갤러리로 (숏컷)
4. **촬영 / 갤러리** — 카메라 촬영 또는 인앱 갤러리 그리드에서 사진 선택
5. **편집** — 프레임 오버레이 확인 / 스티커·텍스트 카드 드래그·회전·크기조절·삭제
6. **저장 · 공유** — 합성 결과를 갤러리에 저장하거나 시스템 공유 시트로 공유
7. **브랜드 스플래시** — 쇼조풍 피치 카메라 아이콘과 핑크·보라 노을 스플래시, 줌아웃·별빛 애니메이션

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
├── context/      # SessionContext(편집 플로우) · ProfileContext(계정) · UserLibraryContext
├── data/         # library(공통 타입/텍스트 연결) · textTemplates(JSON 텍스트 카드)
├── navigation/   # RootNavigator + 스택 타입
├── screens/      # Home / Profile / Select / Source / Capture / Gallery / Edit / Result
├── storage/      # 즐겨찾기 · 사용자 라이브러리 AsyncStorage/파일 영속화
├── theme/        # 디자인 토큰(spacing/radius/shadow) · fonts · palettes(이모지별) · ThemeContext
├── types/        # 공용 타입 · 에셋 모듈 선언
└── utils/        # media(불러오기·저장·공유) · date
```

## 내 프레임·스티커 등록

프레임/스티커 선택 화면에서 **등록** 버튼을 누르면 기기 사진 앱의 이미지를 고르고 이름을 입력할 수 있습니다.
프레임은 사진 위를 덮는 방식이므로 투명 배경 PNG 사용을 권장합니다. 등록 이미지와 이름은 앱을
재실행해도 유지되며, 목록 좌상단의 삭제 버튼으로 함께 제거할 수 있습니다.

## 다음 단계 (TODO)

- [ ] 프레임 모드에서 사진 위치/줌 조정
- [ ] 텍스트 카드 템플릿 추가 및 색상 커스터마이즈
