# 웨피캠 릴리스 스크립트

터미널에 직접 붙어 있지 않아도 (에이전트가 대신 실행하더라도) 빌드·업로드가 되도록 만든 스크립트 모음.
모두 **비대화형**으로 동작하며, 실패하면 0이 아닌 코드로 종료한다.

## 사용법

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
