#!/usr/bin/env bash
# 빌드/제출 전에 막힐 만한 것들을 미리 잡는다. 아무것도 바꾸지 않는 읽기 전용 검사.
#
#   ./scripts/preflight.sh            # 빌드용 검사
#   ./scripts/preflight.sh --submit   # 제출까지 하려면 필요한 것도 함께 검사
#
# exit 0 = 통과, 1 = 하나 이상 실패

source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
cd_root

WANT_SUBMIT=0
[ "${1:-}" = "--submit" ] && WANT_SUBMIT=1

ERRORS=0
err() { fail "$*"; ERRORS=$((ERRORS+1)); }

step "1. 필수 명령"
for c in node npm npx git; do
  if command -v "$c" >/dev/null 2>&1; then ok "$c ($(command -v "$c"))"; else err "$c 없음"; fi
done
info "node $(node -v 2>/dev/null || echo '?')  npm $(npm -v 2>/dev/null || echo '?')"

step "2. 의존성 설치 상태"
if [ -d node_modules/expo ]; then
  INSTALLED="$(node -p "require('./node_modules/expo/package.json').version")"
  DECLARED="$(json_get ./package.json dependencies.expo)"
  ok "expo $INSTALLED 설치됨 (package.json: $DECLARED)"
else
  err "node_modules가 없습니다. 'npm install'을 먼저 실행하세요."
fi
[ -d node_modules/expo-modules-jsi ] && \
  warn "expo-modules-jsi가 설치돼 있습니다. SDK 54에는 없어야 정상입니다 (Xcode 26 빌드 실패 원인)."

step "3. 앱 식별 정보"
NAME="$(json_get ./app.json expo.name)"
SLUG="$(json_get ./app.json expo.slug)"
VERSION="$(json_get ./app.json expo.version)"
BUNDLE="$(json_get ./app.json expo.ios.bundleIdentifier)"
PROJECT_ID="$(json_get ./app.json expo.extra.eas.projectId)"
info "name=$NAME  slug=$SLUG  version=$VERSION"
[ -n "$BUNDLE" ] && ok "bundleIdentifier: $BUNDLE" || err "ios.bundleIdentifier가 비어 있습니다."
if [ -n "$PROJECT_ID" ] && [[ "$PROJECT_ID" =~ ^[0-9a-fA-F-]{36}$ ]]; then
  ok "EAS projectId: $PROJECT_ID"
else
  err "app.json에 유효한 extra.eas.projectId가 없습니다. 'npx eas init'을 먼저 실행하세요."
fi

step "4. 에셋"
ICON="$(json_get ./app.json expo.icon)"
if [ -z "$ICON" ]; then
  err "app.json에 expo.icon이 없습니다."
elif [ -f "$ICON" ]; then
  ok "아이콘: $ICON"
else
  err "아이콘 파일 없음: $ICON"
fi
SPLASH="$(node -p "try{const p=require('./app.json').expo.plugins||[];const s=p.find(x=>Array.isArray(x)&&x[0]==='expo-splash-screen');s&&s[1]&&s[1].image||''}catch(e){''}")"
if [ -n "$SPLASH" ]; then
  [ -f "$SPLASH" ] && ok "스플래시: $SPLASH" || err "스플래시 파일 없음: $SPLASH"
fi

step "5. 타입체크"
if npm run --silent typecheck >/tmp/wepicam-typecheck.log 2>&1; then
  ok "tsc --noEmit 통과"
else
  err "타입 에러:"; sed 's/^/      /' /tmp/wepicam-typecheck.log | head -20
fi

step "6. Git 상태"
if git rev-parse --git-dir >/dev/null 2>&1; then
  BRANCH="$(git symbolic-ref --short -q HEAD || echo '(브랜치 없음/detached)')"
  DIRTY="$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')"
  ok "브랜치 $BRANCH"
  if [ "${DIRTY:-0}" -gt 0 ]; then
    warn "커밋되지 않은 변경 ${DIRTY}건 — EAS는 작업 디렉터리 상태 그대로 빌드합니다."
  fi
else
  warn "git 저장소가 아닙니다."
fi

step "7. EAS 인증"
if [ -n "${EXPO_TOKEN:-}" ]; then
  ok "EXPO_TOKEN 설정됨 (비대화형 실행 가능)"
elif eas_run whoami >/dev/null 2>&1; then
  ok "EAS 로그인됨: $(eas_run whoami 2>/dev/null | tail -1)"
else
  err "EAS 인증 없음. 'npx eas login' 하거나 EXPO_TOKEN 환경변수를 설정하세요."
fi

if [ "$WANT_SUBMIT" = 1 ]; then
  step "8. App Store Connect 제출 설정"
  ASC_APP_ID="$(json_get ./eas.json submit.production.ios.ascAppId)"
  TEAM_ID="$(json_get ./eas.json submit.production.ios.appleTeamId)"
  APPLE_ID="$(json_get ./eas.json submit.production.ios.appleId)"
  KEY_PATH="$(json_get ./eas.json submit.production.ios.ascApiKeyPath)"

  case "$ASC_APP_ID" in ""|*REPLACE_WITH*) err "eas.json의 ascAppId가 비어 있습니다.";; *) ok "ascAppId: $ASC_APP_ID";; esac
  case "$TEAM_ID"    in ""|*REPLACE_WITH*) err "eas.json의 appleTeamId가 비어 있습니다. developer.apple.com > Membership details에서 확인.";; *) ok "appleTeamId: $TEAM_ID";; esac

  if [ -n "$KEY_PATH" ]; then
    [ -f "$KEY_PATH" ] && ok "ASC API 키: $KEY_PATH" || err "ascApiKeyPath 파일이 없습니다: $KEY_PATH"
  elif [ -n "${EXPO_ASC_API_KEY_PATH:-}" ]; then
    ok "ASC API 키(환경변수): $EXPO_ASC_API_KEY_PATH"
  elif [ -n "${EXPO_APPLE_APP_SPECIFIC_PASSWORD:-}" ]; then
    ok "앱 암호 방식 (appleId: $APPLE_ID)"
  else
    err "Apple 인증 수단이 없습니다. ASC API 키(권장) 또는 EXPO_APPLE_APP_SPECIFIC_PASSWORD가 필요합니다."
  fi
fi

echo
if [ "$ERRORS" -eq 0 ]; then
  printf '%s모든 검사 통과%s\n' "$C_GRN$C_B" "$C_0"; exit 0
else
  printf '%s%d개 항목 실패 — 위 내용을 해결한 뒤 다시 실행하세요.%s\n' "$C_RED$C_B" "$ERRORS" "$C_0"; exit 1
fi
