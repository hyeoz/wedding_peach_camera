#!/usr/bin/env bash
#
# 웨피캠(Wepicam) iOS 릴리스 스크립트
# =====================================================================
# 이 프로젝트는 Expo (SDK 54 / CNG: ios·android 디렉터리는 gitignore) 기반이라
# 빌드·업로드는 EAS Build / EAS Submit 으로 처리한다.
#
#   프리플라이트 검사 → eas build (production) → eas submit (App Store Connect 업로드)
#
# ⚠️ 중요: `eas submit` 은 IPA 를 App Store Connect(=TestFlight) 에 "업로드" 까지만 한다.
#    실제 **심사 제출(Submit for Review)** 은 App Store Connect 웹에서
#    버전 정보·스크린샷·App Privacy 를 채운 뒤 사람이 눌러야 한다.
#    이 스크립트는 거기까지 자동화하지 않는다(의도적).
#
# ---------------------------------------------------------------------
# 사용법
# ---------------------------------------------------------------------
#   ./scripts/release-ios.sh --dry-run          # 실행할 명령만 출력 (아무것도 안 함) ← 먼저 이걸로 확인
#   ./scripts/release-ios.sh --preflight-only   # 검사만 하고 종료
#   ./scripts/release-ios.sh --build-only       # 빌드까지만
#   ./scripts/release-ios.sh                    # 빌드 + ASC 업로드
#   ./scripts/release-ios.sh --submit-only --latest        # 이미 성공한 최신 빌드를 업로드
#   ./scripts/release-ios.sh --submit-only --build-id <id> # 특정 빌드를 업로드
#   ./scripts/release-ios.sh --profile preview --build-only  # 내부 테스트용 빌드
#
# 옵션
#   --profile <name>   EAS 빌드 프로필 (기본: production)
#   --dry-run          명령을 실행하지 않고 출력만 한다
#   --preflight-only   사전 점검만 수행
#   --build-only       빌드만 (업로드 생략)
#   --submit-only      빌드 생략, 업로드만
#   --build-id <id>    --submit-only 와 함께 업로드할 빌드 지정
#   --latest           --submit-only 와 함께 최신 성공 빌드 사용
#   --local            EAS 클라우드 대신 로컬 머신에서 빌드 (Xcode 필요)
#   --no-wait          빌드 완료를 기다리지 않는다 (업로드는 자동 생략됨)
#   --allow-dirty      커밋되지 않은 변경이 있어도 진행 (권장하지 않음)
#   --skip-checks      타입체크/expo-doctor 생략 (긴급용)
#   -h, --help         도움말
#
# ---------------------------------------------------------------------
# 환경변수 (시크릿은 절대 이 파일에 적지 말 것)
# ---------------------------------------------------------------------
# 로그인
#   EXPO_TOKEN                     Expo 액세스 토큰. CI/비대화형 실행에 필요.
#                                  (없으면 `eas login` 으로 로그인된 세션을 사용)
#
# App Store Connect 인증 — 아래 A 또는 B 중 하나. A(API 키) 권장.
#   A) ASC API Key (권장, 2FA 불필요)
#      EXPO_ASC_API_KEY_PATH       AuthKey_XXXXXXXX.p8 파일 경로
#      EXPO_ASC_KEY_ID             키 ID
#      EXPO_ASC_ISSUER_ID          Issuer ID
#   B) Apple ID + 앱 암호
#      EXPO_APPLE_ID                     Apple 계정 이메일 (미설정 시 eas.json 의 appleId 사용)
#      EXPO_APPLE_APP_SPECIFIC_PASSWORD  appleid.apple.com 에서 발급한 앱 전용 암호
#
# 예시 (.p8 키와 토큰은 저장소 밖에 두고, 쉘에서만 export 한다):
#   export EXPO_TOKEN="..."
#   export EXPO_ASC_API_KEY_PATH="$HOME/.private_keys/AuthKey_ABC123.p8"
#   export EXPO_ASC_KEY_ID="ABC123"
#   export EXPO_ASC_ISSUER_ID="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
#   ./scripts/release-ios.sh --dry-run
#
# ---------------------------------------------------------------------
# 빌드 프로필 (eas.json)
# ---------------------------------------------------------------------
#   development  시뮬레이터용 개발 클라이언트 빌드
#   device       실기기에 설치하는 개발 클라이언트 빌드
#                (simulator 빌드는 실기기에 설치할 수 없어 프로필을 분리함)
#   preview      TestFlight 전, 테스터에게 배포하는 릴리스 구성 빌드
#   production   스토어 배포용. distribution=store, autoIncrement=true
#                appVersionSource=remote 라서 buildNumber 는 EAS 서버가 자동 증가시킨다.
#                마케팅 버전(1.0.0)은 app.json 의 version 필드를 직접 올린다.
# =====================================================================

set -euo pipefail

# ── 설정 ────────────────────────────────────────────────────────────
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PLATFORM="ios"
PROFILE="production"
# eas-cli 실행 방식. 전역 설치본을 쓰려면 EAS_CLI_CMD="eas" 로 덮어쓴다.
EAS="${EAS_CLI_CMD:-npx --yes eas-cli@latest}"

DRY_RUN=0
PREFLIGHT_ONLY=0
BUILD_ONLY=0
SUBMIT_ONLY=0
LOCAL_BUILD=0
NO_WAIT=0
ALLOW_DIRTY=0
SKIP_CHECKS=0
BUILD_ID=""
USE_LATEST=0

# ── 출력 헬퍼 ───────────────────────────────────────────────────────
if [ -t 1 ]; then
  C_RESET='\033[0m'; C_BLUE='\033[1;34m'; C_GREEN='\033[1;32m'
  C_YELLOW='\033[1;33m'; C_RED='\033[1;31m'; C_DIM='\033[2m'
else
  C_RESET=''; C_BLUE=''; C_GREEN=''; C_YELLOW=''; C_RED=''; C_DIM=''
fi

step() { printf "\n${C_BLUE}▶ %s${C_RESET}\n" "$*"; }
ok()   { printf "  ${C_GREEN}✓${C_RESET} %s\n" "$*"; }
warn() { printf "  ${C_YELLOW}!${C_RESET} %s\n" "$*"; WARNINGS=$((WARNINGS + 1)); }
fail() { printf "  ${C_RED}✗${C_RESET} %s\n" "$*" >&2; exit 1; }
note() { printf "  ${C_DIM}%s${C_RESET}\n" "$*"; }

WARNINGS=0

# 실제로 명령을 실행하거나, --dry-run 이면 출력만 한다.
run() {
  if [ "$DRY_RUN" -eq 1 ]; then
    printf "  ${C_DIM}[dry-run]${C_RESET} %s\n" "$*"
    return 0
  fi
  printf "  ${C_DIM}$ %s${C_RESET}\n" "$*"
  "$@"
}

usage() { sed -n '2,80p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0; }

# ── 인자 파싱 ───────────────────────────────────────────────────────
while [ $# -gt 0 ]; do
  case "$1" in
    --profile)        PROFILE="${2:?--profile 에 값이 필요합니다}"; shift 2 ;;
    --dry-run)        DRY_RUN=1; shift ;;
    --preflight-only) PREFLIGHT_ONLY=1; shift ;;
    --build-only)     BUILD_ONLY=1; shift ;;
    --submit-only)    SUBMIT_ONLY=1; shift ;;
    --build-id)       BUILD_ID="${2:?--build-id 에 값이 필요합니다}"; shift 2 ;;
    --latest)         USE_LATEST=1; shift ;;
    --local)          LOCAL_BUILD=1; shift ;;
    --no-wait)        NO_WAIT=1; shift ;;
    --allow-dirty)    ALLOW_DIRTY=1; shift ;;
    --skip-checks)    SKIP_CHECKS=1; shift ;;
    -h|--help)        usage ;;
    *)                fail "알 수 없는 옵션: $1  (--help 참고)" ;;
  esac
done

[ "$BUILD_ONLY" -eq 1 ] && [ "$SUBMIT_ONLY" -eq 1 ] && fail "--build-only 와 --submit-only 는 함께 쓸 수 없습니다."
[ "$SUBMIT_ONLY" -eq 1 ] && [ -z "$BUILD_ID" ] && [ "$USE_LATEST" -eq 0 ] && \
  fail "--submit-only 에는 --latest 또는 --build-id <id> 가 필요합니다."

cd "$PROJECT_ROOT"

printf "${C_BLUE}웨피캠 iOS 릴리스${C_RESET}  profile=%s  platform=%s%s\n" \
  "$PROFILE" "$PLATFORM" "$([ "$DRY_RUN" -eq 1 ] && echo '  [DRY-RUN]')"

# ── 1. 프리플라이트 ─────────────────────────────────────────────────
step "1/4 · 사전 점검"

command -v node >/dev/null 2>&1 || fail "node 가 필요합니다."
command -v git  >/dev/null 2>&1 || fail "git 이 필요합니다."
ok "node $(node --version)"

# EAS 로그인 상태
if [ -n "${EXPO_TOKEN:-}" ]; then
  ok "EXPO_TOKEN 환경변수로 인증 (비대화형)"
else
  # whoami 출력 형식은 CLI 버전마다 다르므로(단일 계정명 vs 'Accounts:' 목록) 파싱하지 않고
  # 성공 여부만 보고 그대로 보여준다.
  if EAS_WHOAMI="$($EAS whoami 2>/dev/null)" && [ -n "$EAS_WHOAMI" ]; then
    ok "EAS 로그인 확인됨"
    printf '%s\n' "$EAS_WHOAMI" | grep -v '^\s*$' | sed 's/^/      /'
  else
    fail "EAS 에 로그인되어 있지 않습니다. 'npx eas-cli login' 또는 EXPO_TOKEN 을 설정하세요."
  fi
fi

# EAS 프로젝트 연결 (app.json 의 extra.eas.projectId)
if node -e "
  const c = require('./app.json');
  process.exit(c?.expo?.extra?.eas?.projectId ? 0 : 1);
" 2>/dev/null; then
  ok "EAS projectId 연결됨"
else
  fail "app.json 에 extra.eas.projectId 가 없습니다. 먼저 'npx eas-cli init' 을 한 번 실행하세요."
fi

# eas.json 스키마 유효성 — 잘못되면 build/submit 이 즉시 실패한다
if $EAS config --platform "$PLATFORM" --profile "$PROFILE" --non-interactive >/dev/null 2>&1; then
  ok "eas.json 유효 · '$PROFILE' 프로필 확인"
else
  fail "eas.json 이 유효하지 않거나 '$PROFILE' 프로필이 없습니다. 'npx eas-cli config --platform ios --profile $PROFILE' 로 확인하세요."
fi

# 앱 메타 정보 출력
node -e "
  const c = require('./app.json').expo;
  console.log('  · name        :', c.name);
  console.log('  · version     :', c.version, '(마케팅 버전 · app.json 에서 직접 관리)');
  console.log('  · bundleId    :', c.ios?.bundleIdentifier);
  console.log('  · buildNumber : EAS 서버에서 자동 증가 (appVersionSource=remote)');
  console.log('  · icon        :', c.icon);
"

# 작업 트리 청결도 — EAS 클라우드 빌드는 git 커밋 기준으로 소스를 올린다
if [ -n "$(git status --porcelain)" ]; then
  if [ "$ALLOW_DIRTY" -eq 1 ]; then
    warn "커밋되지 않은 변경이 있습니다 (--allow-dirty 로 진행)."
  elif [ "$SUBMIT_ONLY" -eq 1 ]; then
    warn "커밋되지 않은 변경이 있지만 업로드 전용 모드라 무시합니다."
  else
    git status --short | sed 's/^/      /'
    fail "커밋되지 않은 변경이 있습니다. EAS 클라우드 빌드는 커밋된 내용만 올라갑니다. 커밋하거나 --allow-dirty 를 쓰세요."
  fi
else
  ok "작업 트리 깨끗함"
fi

# 앱 아이콘 규격 (1024x1024 · 알파 채널 없음 — 알파가 있으면 ASC 업로드가 거부된다)
ICON_PATH="$(node -e "console.log(require('./app.json').expo.icon || '')")"
if [ -n "$ICON_PATH" ] && [ -f "$ICON_PATH" ]; then
  if command -v sips >/dev/null 2>&1; then
    ICON_W="$(sips -g pixelWidth  "$ICON_PATH" | awk '/pixelWidth/{print $2}')"
    ICON_H="$(sips -g pixelHeight "$ICON_PATH" | awk '/pixelHeight/{print $2}')"
    ICON_A="$(sips -g hasAlpha    "$ICON_PATH" | awk '/hasAlpha/{print $2}')"
    [ "$ICON_W" = "1024" ] && [ "$ICON_H" = "1024" ] \
      && ok "아이콘 1024x1024" || warn "아이콘이 1024x1024 가 아닙니다 (${ICON_W}x${ICON_H})"
    [ "$ICON_A" = "no" ] \
      && ok "아이콘 알파 채널 없음" || warn "아이콘에 알파 채널이 있습니다 — App Store 업로드가 거부될 수 있습니다."
  fi
else
  warn "app.json 의 icon 파일을 찾을 수 없습니다: $ICON_PATH"
fi

if [ "$SKIP_CHECKS" -eq 1 ]; then
  warn "타입체크 / expo-doctor 생략 (--skip-checks)"
else
  if npx tsc --noEmit >/dev/null 2>&1; then ok "타입체크 통과"; else fail "타입체크 실패. 'npx tsc --noEmit' 로 확인하세요."; fi
  if npx --yes expo-doctor >/dev/null 2>&1; then ok "expo-doctor 통과"; else warn "expo-doctor 경고가 있습니다. 'npx expo-doctor' 로 확인하세요."; fi
fi

# 업로드 인증 수단 확인
NEED_SUBMIT=0
{ [ "$BUILD_ONLY" -eq 0 ] && [ "$PREFLIGHT_ONLY" -eq 0 ] && [ "$NO_WAIT" -eq 0 ]; } && NEED_SUBMIT=1
if [ "$NEED_SUBMIT" -eq 1 ]; then
  if [ -n "${EXPO_ASC_API_KEY_PATH:-}" ] && [ -n "${EXPO_ASC_KEY_ID:-}" ] && [ -n "${EXPO_ASC_ISSUER_ID:-}" ]; then
    [ -f "$EXPO_ASC_API_KEY_PATH" ] || fail "EXPO_ASC_API_KEY_PATH 파일이 없습니다: $EXPO_ASC_API_KEY_PATH"
    ok "App Store Connect API 키로 업로드"
  elif [ -n "${EXPO_APPLE_APP_SPECIFIC_PASSWORD:-}" ]; then
    ok "Apple ID + 앱 전용 암호로 업로드"
  else
    warn "ASC 인증 환경변수가 없습니다. eas submit 이 대화형으로 자격증명을 물어봅니다 (CI 에서는 실패)."
  fi
  # 비대화형 submit 은 appleTeamId 가 필요할 수 있다
  if ! grep -q '"appleTeamId"' eas.json 2>/dev/null; then
    note "eas.json 의 submit.production.ios 에 appleTeamId 가 없습니다 — 대화형으로 물어볼 수 있습니다."
    note "Apple Developer > Membership details 에서 Team ID 를 확인해 채워두면 조용히 지나갑니다."
  fi
fi

printf "\n  경고 %d건\n" "$WARNINGS"

if [ "$PREFLIGHT_ONLY" -eq 1 ]; then
  step "사전 점검만 수행하고 종료합니다."
  exit 0
fi

# ── 2. 빌드 ────────────────────────────────────────────────────────
if [ "$SUBMIT_ONLY" -eq 1 ]; then
  step "2/4 · 빌드 생략 (--submit-only)"
else
  step "2/4 · EAS 빌드 (프로필: $PROFILE)"
  BUILD_CMD=($EAS build --platform "$PLATFORM" --profile "$PROFILE" --non-interactive)
  [ "$LOCAL_BUILD" -eq 1 ] && BUILD_CMD+=(--local)
  if [ "$NO_WAIT" -eq 1 ]; then
    BUILD_CMD+=(--no-wait)
  else
    BUILD_CMD+=(--wait)
  fi
  run "${BUILD_CMD[@]}"

  if [ "$NO_WAIT" -eq 1 ]; then
    step "빌드를 기다리지 않으므로 업로드를 건너뜁니다."
    note "빌드 완료 후: ./scripts/release-ios.sh --submit-only --latest"
    exit 0
  fi
fi

# ── 3. App Store Connect 업로드 ────────────────────────────────────
if [ "$BUILD_ONLY" -eq 1 ]; then
  step "3/4 · 업로드 생략 (--build-only)"
  note "업로드하려면: ./scripts/release-ios.sh --submit-only --latest"
else
  step "3/4 · App Store Connect 업로드 (eas submit)"
  SUBMIT_CMD=($EAS submit --platform "$PLATFORM" --profile "$PROFILE" --non-interactive)
  if [ -n "$BUILD_ID" ]; then
    SUBMIT_CMD+=(--id "$BUILD_ID")
  else
    SUBMIT_CMD+=(--latest)
  fi
  run "${SUBMIT_CMD[@]}"
  if [ "$DRY_RUN" -eq 0 ]; then
    ok "App Store Connect 업로드 요청 완료 (처리·TestFlight 반영까지 수 분 소요)"
  fi
fi

# ── 4. 사람이 해야 하는 마무리 ─────────────────────────────────────
step "4/4 · 여기서부터는 App Store Connect 웹에서 직접 (자동화하지 않음)"
cat <<'EOS'
  1) TestFlight 에서 빌드 처리 완료 확인 · 수출 규정(암호화) 문항 응답
     → app.json 에 usesNonExemptEncryption=false 가 설정되어 있어 보통 자동 처리됨
  2) App Store > 새 버전에 빌드 연결
  3) 스크린샷(iPhone 6.9"/6.5" · iPad 13" — supportsTablet=true 이므로 iPad 필수) 업로드
  4) 앱 설명 · 부제 · 키워드 · 지원 URL · 개인정보처리방침 URL 입력
  5) App Privacy(수집 데이터) 설문 작성
  6) 연령 등급 설문 · 심사 메모(로그인 불필요) 작성
  7) "심사를 위해 제출" 버튼 클릭  ← 사람이 최종 확인 후 직접
EOS

printf "\n${C_GREEN}완료${C_RESET}\n"
