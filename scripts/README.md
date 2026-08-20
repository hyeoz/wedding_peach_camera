# 웨피캠 릴리스 스크립트

터미널에 직접 붙어 있지 않아도 (에이전트가 대신 실행하더라도) 빌드·업로드가 되도록 만든 스크립트 모음.
모두 **비대화형**으로 동작하며, 실패하면 0이 아닌 코드로 종료한다.

경로는 두 가지다.

| | 로컬 빌드 (`local-release-ios.mjs`) | EAS 클라우드 (`release.mjs`) |
|---|---|---|
| 빌드 위치 | 이 맥 | Expo 서버 |
| 할당량 | 없음 | **계정당 월 iOS 15건** (Free) |
| 필요한 것 | Xcode + ASC API 키 | EAS 로그인 + 할당량 |
| 맥이 꺼져 있으면 | 못 함 | 됨 |

EAS 할당량은 **계정 단위**라 한 계정에서 앱을 여럿 굴리면 서로 잡아먹는다.
그래서 기본 경로는 로컬 빌드로 두고, EAS 쪽은 남겨만 둔다.

## 로컬 빌드 (EAS 없이)

```bash
npm run release:local:check   # 실행할 명령만 출력 (아무것도 안 바꿈)
npm run release:local         # 빌드 → 서명 → IPA → 업로드 → VALID 대기
```

옵션:

```bash
node scripts/local-release-ios.mjs --build-only          # IPA 까지만
node scripts/local-release-ios.mjs --upload-only --ipa <경로> --build-number 7
node scripts/local-release-ios.mjs --clean               # ios/ 를 지우고 prebuild
node scripts/local-release-ios.mjs --skip-prebuild       # 기존 ios/ 재사용 (빠름)
node scripts/local-release-ios.mjs --build-number 12     # 빌드 번호 직접 지정
```

하는 일:

1. `expo prebuild` → `pod install` (네이티브 프로젝트 생성)
2. ASC 에서 **최신 빌드 번호를 조회해 +1**, `Info.plist` 의 `CFBundleVersion` 에 기입
   (EAS 의 remote autoIncrement 를 대신한다)
3. `xcodebuild archive` — 서명은 Xcode 자동 서명 + `-allowProvisioningUpdates`
4. `xcodebuild -exportArchive` → IPA
5. `xcrun altool --upload-app` → App Store Connect
6. ASC 를 폴링해 **VALID** 까지 대기

인증서·프로비저닝 프로파일은 **ASC API 키로 xcodebuild 가 알아서 발급/갱신**한다
(`-authenticationKeyPath/-authenticationKeyID/-authenticationKeyIssuerID`).
Xcode 에 사람이 로그인해 둘 필요도, fastlane 도 필요 없다.

필요한 환경 변수는 `.env.release` 에 있는 것과 같다 (`ASC_KEY_ID` / `ASC_ISSUER_ID` /
`ASC_KEY_PATH`). 앱 식별 정보(`ASC_APP_ID`, `APPLE_TEAM_ID`)는 환경 변수로 주거나,
없으면 `eas.json` 의 `submit.production.ios` 에서 읽는다.

> **다른 앱으로 옮길 때**: `scripts/local-release-ios.mjs` 와 `.env.release` 만 복사하면 된다.
> 앱마다 다른 값은 위 환경 변수로 넘긴다. 스킴 이름은 `ios/*.xcworkspace` 에서 자동으로 찾는다.

**심사 제출은 하지 않는다.** 업로드까지가 끝이다 (아래 "스크립트가 하지 않는 것" 참고).

## EAS 클라우드 빌드 사용법

```bash
npm run preflight        # 읽기 전용 사전 검사 (아무것도 안 바꿈)
npm run build:ios        # 검사 → EAS 프로덕션 빌드 (완료까지 대기)
npm run submit:ios       # 최신 빌드를 App Store Connect에 업로드
npm run release:ios      # 위 세 개를 한 번에
npm run release:status   # 최근 빌드/제출 현황
```

옵션:

```bash
./scripts/build-ios.sh --profile preview   # 다른 빌드 프로필
./scripts/build-ios.sh --no-wait           # 큐에만 넣고 반환
./scripts/release-ios.sh --dry-run         # 실행될 명령만 출력
./scripts/release-ios.sh --build-only      # 업로드 없이 빌드만
```

## 필요한 환경변수

| 변수 | 용도 | 없으면 |
|---|---|---|
| `EXPO_TOKEN` | EAS 비대화형 인증 | 대화형 로그인 필요 → 에이전트가 못 돌림 |
| `EXPO_ASC_API_KEY_PATH` 등 | App Store Connect 인증 (권장) | 아래 대안 사용 |
| `EXPO_APPLE_APP_SPECIFIC_PASSWORD` | ASC 인증 대안 | 제출 단계에서 막힘 |

`EXPO_TOKEN`은 expo.dev → Account Settings → Access Tokens에서 발급.
ASC API 키는 App Store Connect → 사용자 및 액세스 → 통합 → App Store Connect API에서 `.p8` 발급 후
`eas.json`의 `submit.production.ios`에 `ascApiKeyPath` / `ascApiKeyId` / `ascApiKeyIssuerId`로 지정한다.

> `.p8` 키 파일은 **절대 커밋하지 말 것.** `.gitignore`에 `*.p8`이 이미 들어 있다.

## 최초 1회만 사람이 해야 하는 것

1. `npx eas init` — `app.json`에 `extra.eas.projectId` 기입
2. `npx eas credentials` (또는 첫 `eas build`를 대화형으로 1회) — 배포 인증서·프로비저닝 프로파일 생성.
   한 번 만들어두면 이후 EAS 서버에 보관되어 비대화형 빌드가 가능해진다.
3. `eas.json`의 `appleTeamId` 채우기

## 스크립트가 하지 않는 것

`eas submit`은 **빌드를 App Store Connect에 업로드**하는 데까지다. **"심사를 위해 제출"은 자동화하지 않았다.**

Apple이 그 시점에 수출규정·콘텐츠 권리·광고 식별자 사용 여부 등을 선언하게 하고, 잘못 제출하면
되돌리는 데 비용이 크기 때문이다. 업로드 후 ASC에서 빌드 선택 → 심사 제출 클릭 한 번이면 된다.

심사 제출까지 완전 자동화가 필요해지면 `fastlane deliver --submit_for_review`를 붙이면 된다
(메타데이터·스크린샷 업로드까지 함께 처리 가능).
