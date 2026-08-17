#!/usr/bin/env bash
# EAS로 iOS 빌드를 만든다.
#
#   ./scripts/build-ios.sh                    # production 프로필, 완료까지 대기
#   ./scripts/build-ios.sh --profile preview  # 다른 프로필
#   ./scripts/build-ios.sh --no-wait          # 큐에만 넣고 즉시 반환
#   ./scripts/build-ios.sh --dry-run          # 실행할 명령만 출력
#
# 성공 시 마지막 줄에 빌드 URL을 출력한다.

source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
cd_root

PROFILE=production
WAIT=1
DRY=0
while [ $# -gt 0 ]; do
  case "$1" in
    --profile) PROFILE="$2"; shift 2;;
    --no-wait) WAIT=0; shift;;
    --dry-run) DRY=1; shift;;
    -h|--help) sed -n '2,12p' "$0"; exit 0;;
    *) die "알 수 없는 옵션: $1";;
  esac
done

step "사전 검사"
"$ROOT/scripts/preflight.sh" || die "preflight 실패 — 빌드를 시작하지 않습니다."

ARGS=(build --platform ios --profile "$PROFILE" --non-interactive)
[ "$WAIT" = 1 ] && ARGS+=(--wait) || ARGS+=(--no-wait)

step "EAS 빌드 시작 (프로필: $PROFILE)"
info "eas ${ARGS[*]}"
if [ "$DRY" = 1 ]; then ok "dry-run — 실제 실행하지 않음"; exit 0; fi

# --json은 --wait와 함께 쓰면 완료 후 빌드 객체를 준다
if [ "$WAIT" = 1 ]; then
  OUT="$(eas_run "${ARGS[@]}" --json 2>/tmp/wepicam-build.err)" || {
    fail "빌드 실패"; sed 's/^/      /' /tmp/wepicam-build.err | tail -30; exit 1; }
  echo "$OUT" > /tmp/wepicam-build.json
  STATUS="$(node -p "try{const b=require('/tmp/wepicam-build.json');(Array.isArray(b)?b[0]:b).status||''}catch(e){''}")"
  URL="$(node -p    "try{const b=require('/tmp/wepicam-build.json');(Array.isArray(b)?b[0]:b).buildUrl||''}catch(e){''}")"
  ID="$(node -p     "try{const b=require('/tmp/wepicam-build.json');(Array.isArray(b)?b[0]:b).id||''}catch(e){''}")"
  if [ "$STATUS" = "FINISHED" ]; then
    ok "빌드 완료"; info "id:  $ID"; echo "$URL"
  else
    die "빌드 상태가 FINISHED가 아닙니다: ${STATUS:-알수없음}  ($URL)"
  fi
else
  eas_run "${ARGS[@]}" || die "빌드 큐 등록 실패"
  ok "큐에 등록했습니다. 'npx eas build:list --platform ios --limit 1'로 확인하세요."
fi
