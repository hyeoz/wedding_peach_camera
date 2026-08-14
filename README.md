# Wedding Peach Camera 🍑📷

프레임/스티커를 골라 사진 위에 합성하고 저장하는 **초단순 카메라 앱** (React Native + Expo).

> UI 디자인은 추후 전달 예정. 현재는 기능 뼈대(플로우 + 로직) 중심의 초기 세팅입니다.

## 기능

1. **모드 선택** — 프레임(사진이 중앙에 들어감) 또는 스티커(사진 위에 붙임)
2. **오버레이 선택** — 프레임/스티커 이미지를 **갤러리** 또는 **파일**에서 불러오기
3. **즐겨찾기** — 자주 쓰는 프레임/스티커를 저장해 바로 선택
4. **촬영 / 불러오기** — 카메라로 촬영하거나 갤러리에서 사진 선택
5. **합성 & 저장** — 프레임+사진 / 사진+스티커 결과물을 갤러리에 저장
   - 스티커는 드래그·핀치·회전으로 위치/크기/각도 조정 가능

## 화면 플로우

```
Home (모드 선택)
  └─> SelectOverlay (프레임/스티커 선택 · 즐겨찾기)
        └─> Capture (촬영 or 갤러리)
              └─> Editor (합성 미리보기 · 저장)
```

## 기술 스택

- **Expo SDK 52** (managed workflow) + **TypeScript**
- **expo-camera** — 촬영
- **expo-image-picker** — 갤러리 불러오기
- **expo-document-picker** — 파일 불러오기
- **expo-media-library** — 결과물 저장
- **react-native-view-shot** — 사진+오버레이 합성 캡처
- **react-native-gesture-handler / reanimated** — 스티커 조작
- **@react-native-async-storage/async-storage** — 즐겨찾기 영속화
- **@react-navigation/native-stack** — 화면 이동

## 시작하기

```bash
# 1. 의존성 설치
npm install

# 2. Expo가 SDK에 맞는 정확한 네이티브 버전으로 정렬 (권장)
npx expo install --fix

# 3. 실행
npm start          # Expo Dev Server (QR 코드)
npm run android    # Android
npm run ios        # iOS (macOS 필요)
```

> 카메라·미디어 라이브러리는 네이티브 모듈이라 **Expo Go**에서 대부분 동작하지만,
> 안정적인 테스트는 [development build](https://docs.expo.dev/develop/development-builds/introduction/)를 권장합니다.
>
> ```bash
> npx expo run:android   # 또는 npx expo run:ios
> ```

## 디렉터리 구조

```
src/
├── components/       # 재사용 UI (Button, OverlayThumbnail, DraggableSticker, CompositeCanvas)
├── context/          # SessionContext (플로우 상태 공유)
├── navigation/       # RootNavigator + 스택 타입
├── screens/          # Home / SelectOverlay / Capture / Editor
├── storage/          # 즐겨찾기 AsyncStorage 계층
├── theme/            # 임시 테마 토큰 (디자인 확정 후 교체)
├── types/            # 공용 타입
└── utils/            # media(불러오기·복사·저장), id 생성
```

## 다음 단계 (TODO)

- [ ] 실제 UI 디자인 반영 (theme 토큰 교체)
- [ ] 프레임 모드에서 사진 위치/줌 조정 기능
- [ ] 앱 아이콘 / 스플래시 이미지 추가 (`assets/`)
- [ ] 결과물 해상도/화질 옵션
- [ ] 즐겨찾기 이미지 정리(삭제 시 파일 삭제) 로직 보강
