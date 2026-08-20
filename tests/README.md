# 테스트

```bash
npm test
```

Node 내장 러너(`node:test`)를 `tsx` 로 돌린다. Jest 도, 별도 설정 파일도 없다.
`tsconfig.json` 의 `@/` 경로 별칭은 tsx 가 그대로 해석한다.

한 파일만 돌리려면:

```bash
node --import tsx --test tests/libraryPaths.test.ts
```

## 여기서 다루는 것

React Native 없이 돌아가는 **순수 로직**만 담는다. 시뮬레이터도 네이티브 모듈도
필요 없어서 빠르고, 빌드 전에 부담 없이 돌릴 수 있다.

| 파일 | 대상 | 왜 |
|---|---|---|
| `libraryPaths.test.ts` | `src/storage/libraryPaths.ts` | 앱 업데이트 시 등록 프레임·스티커가 사라지던 버그의 재발 방지 |
| `libraryRecords.test.ts` | `src/storage/libraryRecords.ts` | 저장 레코드 ↔ 화면 항목 변환. 저장값에 앱 컨테이너 경로가 새지 않는지 |
| `layout.test.ts` | `src/utils/layout.ts` | 편집 캔버스가 사진 비율을 지키고 프레임이 캔버스를 덮는 계산 |
| `textTemplateParser.test.ts` | `src/data/textTemplateParser.ts` | 사용자가 쓴 텍스트 카드 DSL 컴파일 |
| `exif.test.ts` | `src/utils/exif.ts` | 촬영 일시 해석과 타임스탬프 각인 포맷 |
| `palettes.test.ts` | `src/theme/palettes.ts` | 프로필 이모지 ↔ 테마 팔레트 매핑 누락 |

## 여기서 다루지 않는 것

컴포넌트 렌더, 제스처, `expo-file-system`·`AsyncStorage` 같은 네이티브 모듈은
다루지 않는다. 그래서 스토리지 계층(`userLibrary.ts`)은 경로 계산과 레코드 변환을
`libraryPaths.ts` / `libraryRecords.ts` 로 떼어 두고 그쪽을 테스트한다 —
버그가 살던 곳도 거기다. `userLibrary.ts` 에 남은 건 AsyncStorage·파일 시스템
호출뿐이라 검사할 판단 로직이 거의 없다.

화면 동작은 실기기/시뮬레이터에서 확인한다.
