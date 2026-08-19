# 웨피캠 (Wepicam) 🍑📷

프레임 · 스티커 · 텍스트로 사진을 꾸며 저장/공유하는 **초단순 카메라 앱** (React Native + Expo).
디자인 핸드오프(`design_handoff_camera_app`)의 핑크·라벤더 감성 UI를 적용했습니다.

## 기능

1. **프로필(계정) + 이모지 테마** — 닉네임 + 이모지 아바타를 로컬에 저장해 계정처럼 사용.
   고른 이모지의 대표 색으로 **앱 전체 테마 색이 바뀜** (🍑 피치 / ⭐👑 골드 / 🐻 브라운 / 🐧 블루 / 🦄 퍼플 …)
2. **3가지 모드**
   - **프레임** — 사용자가 이미지와 이름을 직접 등록, 사진 위에 프레임으로 적용 (단일 선택)
   - **스티커** — 사용자가 이미지와 이름을 직접 등록, 사진 위에 자유 배치 (다중 선택)
   - **텍스트** — 다이어리 텍스트 카드. 기본 제공 3종 + 사용자가 직접 등록 (다중 선택)
   - 등록한 프레임·스티커의 이미지는 앱 문서 폴더에, 목록은 AsyncStorage에 저장되며 삭제 가능
3. **즐겨찾기** — 자주 쓰는 항목을 저장, 탭하면 선택을 건너뛰고 바로 촬영/갤러리로 (숏컷)
4. **촬영 / 갤러리** — 카메라 촬영 또는 인앱 갤러리 그리드에서 사진 선택
5. **편집** — 프레임 오버레이 확인 / 스티커·텍스트 카드 드래그·회전·크기조절·삭제
6. **저장 · 공유** — 합성 결과를 갤러리에 저장하거나 시스템 공유 시트로 공유
7. **브랜드 스플래시** — 쇼조풍 피치 카메라 아이콘과 핑크·보라 노을 스플래시, 줌아웃·별빛 애니메이션

### 텍스트 카드

기본 제공 템플릿은 `src/data/textTemplates.ts`에 정의되어 있고, **사용자가 직접
템플릿을 만들어 등록**할 수도 있습니다. 예) "데일리 체크":

```
📔 OOO님의 2026.08.14
───────────────
✓ 식단 : good / bad
✓ 운동 : good / bad
✓ 특이사항 : (탭해서 입력)
```

- 선택지는 탭으로 토글, `특이사항`은 탭 → 모달 입력
- 귀여운 손글씨 폰트(`Gaegu`) 적용

#### 내 텍스트 만들기 (템플릿 문법)

텍스트 선택 화면의 **등록** 버튼을 누르면 아래 문법으로 카드를 직접 만들 수 있습니다.

```
{{nickname}}님의 {{date}}
식단 good // bad
운동 good // bad
특이사항 {{input}}
```

| 문법 | 의미 |
|---|---|
| 첫 줄 | 카드 제목 |
| `{{nickname}}` | 프로필 닉네임으로 치환 |
| `{{date}}` | **오늘** 날짜 (카드를 만든 날) |
| `{{shotDate}}` | **사진이 찍힌** 날짜 · `2026.08.19` |
| `{{shotTime}}` | 사진이 찍힌 시각 · `14:23:05` |
| `{{shotDateTime}}` | 촬영 일시 전체 · `2026.08.19 14:23:05` |
| `{{shotFilm}}` | 필름 각인풍 · `'26 8 19` |
| `라벨 a // b` | 선택지 중 택1 (탭으로 토글) |
| `라벨 {{input}}` | 자유 입력 칸 (탭 → 모달 입력) |

`{{date}}`와 `{{shot*}}`은 다릅니다 — 앞은 **작성일**, 뒤는 **촬영일**입니다.

### 타임스탬프 (필름 날짜 각인)

사진의 **EXIF 촬영 일시**를 읽어 옛날 필름 카메라처럼 날짜를 각인합니다.
기본 제공 템플릿 **`타임스탬프`(📷)** 와 **`필름 날짜`(🎞️)** 를 바로 쓸 수 있고,
직접 등록할 때 종류를 `타임스탬프`로 고르면 배경 없이 글자만 얹는 형태로 만들어집니다
(글자색 주황·노랑·흰색). 다른 텍스트 카드와 똑같이 드래그·회전·크기조절이 됩니다.

촬영 일시는 `EXIF → 앨범 등록 시각 → 현재 시각` 순으로 확정합니다. 스크린샷이나
메신저로 받은 사진처럼 EXIF가 없는 경우에도 값이 비지 않습니다.

선택지 구분자는 슬래시 **두 개(`//`)** 입니다. 단일 `/`는 일반 텍스트로 취급하므로
`촬영일 10/20` 같은 줄을 그대로 쓸 수 있습니다. 등록할 때 **카드 머리글 이모지와
배경색**도 고를 수 있고, 등록한 템플릿은 앱을 다시 열어도 유지되며 목록에서 삭제할
수 있습니다. (기본 제공 템플릿 3종은 삭제되지 않습니다.)

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
- [x] 텍스트 카드 템플릿 추가 및 색상 커스터마이즈
- [ ] 등록한 텍스트 템플릿 수정 (현재는 추가/삭제만)
