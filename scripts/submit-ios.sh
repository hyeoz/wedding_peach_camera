#!/usr/bin/env bash
# 최신(또는 지정한) iOS 빌드를 App Store Connect에 업로드한다.
# 업로드까지가 이 스크립트의 범위이며, "심사 제출"은 ASC에서 별도로 눌러야 한다 (아래 안내 참고).
#
#   ./scripts/submit-ios.sh                  # 최신 production 빌드 업로드
#   ./scripts/submit-ios.sh --id <buildId>   # 특정 빌드 지정
#   ./scripts/submit-ios.sh --dry-run

source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
cd_root

BUILD_ID=""
DRY=0
while [ $# -gt 0 ]; do
  case "$1" in
    --id) BUILD_ID="$2"; shift 2;;
    --dry-run) DRY=1; shift;;
    -h|--help) sed -n '2,10p' "$0"; exit 0;;
    *) die "알 수 없는 옵션: $1";;
  esac
done

step "사전 검사 (제출 항목 포함)"
"$ROOT/scripts/preflight.sh" --submit || die "preflight 실패 — 제출을 시작하지 않습니다."

ARGS=(submit --platform ios --profile production --non-interactive)
if [ -n "$BUILD_ID" ]; then ARGS+=(--id "$BUILD_ID"); else ARGS+=(--latest); fi

step "App Store Connect 업로드"
info "eas ${ARGS[*]}"
if [ "$DRY" = 1 ]; then ok "dry-run — 실제 실행하지 않음"; exit 0; fi

eas_run "${ARGS[@]}" || die "업로드 실패"

ok "업로드 완료"
cat <<'EOS'

  다음은 사람이 직접 해야 합니다 (Apple이 이 단계에서 선언 항목 확인을 요구함):

    App Store Connect > 나의 앱 > 웨피캠 > 배포
      1. 처리 완료된 빌드 선택 (보통 10~15분 소요)
      2. 스크린샷 · 설명 · 키워드 · 지원 URL 확인
      3. "심사를 위해 제출" 클릭

  eas submit은 빌드 업로드까지만 수행합니다. 심사 제출 자동화까지 원하면
  fastlane deliver 연동을 추가할 수 있습니다.
EOS
