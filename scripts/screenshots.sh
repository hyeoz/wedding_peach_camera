#!/usr/bin/env bash
#
# 웨피캠 App Store 스크린샷 캡처 도우미
# =====================================================================
# App Store Connect 에 올릴 규격 스크린샷을 iOS 시뮬레이터에서 캡처한다.
#
# 완전 자동은 아니다. 화면 전환은 사람이 시뮬레이터에서 직접 하고,
# 이 스크립트는 "지금 화면을 찍어라" 를 맡는다. 이유는 아래 참고 참조.
#
#   시뮬레이터 부팅 → 상태바 고정(9:41) → 화면별로 Enter 누르며 캡처
#   → 해상도 검증 → store/screenshots/<device>/NN-이름.png 로 저장
#
# ---------------------------------------------------------------------
# 필요한 규격 (2026-08 기준, 세로 방향 · app.json orientation=portrait)
# ---------------------------------------------------------------------
#   iPhone 6.9"  1320 x 2868   ← iPhone 17 Pro Max / 16 Pro Max
#   iPad   13"   2064 x 2752   ← iPad Pro 13-inch (M4)
#
#   app.json 의 ios.supportsTablet=true 이므로 iPad 스크린샷은 필수다.
#   iPad 를 빼려면 supportsTablet 을 false 로 바꿔 iPhone 전용으로 내야 한다.
#   각 사이즈당 최소 1장, 최대 10장. 3~5장을 권장한다.
#
#   ※ 요구 규격은 Apple 이 종종 바꾼다. 업로드 직전 App Store Connect 의
#     미디어 관리자 화면에 표시되는 규격을 최종 기준으로 삼을 것.
#
# ---------------------------------------------------------------------
# 사전 준비: 시뮬레이터용 빌드
# ---------------------------------------------------------------------
# EAS production 빌드는 실기기 전용이라 시뮬레이터에 설치할 수 없다.
# 개발 클라이언트 UI 가 없는 깨끗한 화면이 필요하므로 Release 로 로컬 빌드한다.
#
#   npx expo run:ios --configuration Release --device "iPhone 17 Pro Max"
#
# 이렇게 하면 앱이 시뮬레이터에 설치된 채로 실행된다. 그 상태에서
# 이 스크립트를 --no-install 로 돌리면 된다.
#
# ---------------------------------------------------------------------
# 사용법
# ---------------------------------------------------------------------
#   ./scripts/screenshots.sh --list                 # 대상 기기·촬영 목록만 출력
#   ./scripts/screenshots.sh --dry-run              # 실행할 명령만 출력
#   ./scripts/screenshots.sh --device iphone        # 6.9" 만
#   ./scripts/screenshots.sh --device ipad          # 13" 만
#   ./scripts/screenshots.sh                        # 둘 다
#   ./scripts/screenshots.sh --add-media ./samples  # 샘플 사진을 사진 앱에 넣고 시작
#
# 옵션
#   --device <iphone|ipad|both>  캡처할 기기 (기본: both)
#   --app <path/to/App.app>      캡처 전에 이 앱을 설치한다
#   --bundle-id <id>             실행할 번들 ID (기본: app.json 에서 읽음)
#   --add-media <dir>            해당 폴더의 이미지를 시뮬레이터 사진 앱에 추가
#   --out <dir>                  저장 위치 (기본: store/screenshots)
#   --no-install                 이미 설치·실행된 앱을 그대로 쓴다
#   --no-status-bar              상태바 고정(9:41)을 하지 않는다
#   --keep-booted                끝나고 시뮬레이터를 종료하지 않는다
#   --dry-run                    아무것도 하지 않고 명령만 출력
#   --list                       기기와 촬영 목록만 출력
#   -h, --help                   도움말
#
# ---------------------------------------------------------------------
# 참고: 왜 완전 자동이 아닌가
# ---------------------------------------------------------------------
# fastlane snapshot 은 Xcode UI 테스트 타깃이 있어야 동작한다. 이 프로젝트는
# Expo CNG 라서 ios/ 가 gitignore 되어 prebuild 마다 재생성되므로, UI 테스트
# 타깃을 넣어도 유지되지 않는다. config plugin 으로 매번 주입하는 방법이
# 있으나 스크린샷 5장을 얻자고 감당할 복잡도가 아니다.
#
# 그래서 화면 전환은 손으로, 캡처·규격 검증·파일 정리는 스크립트로 나눴다.
# 5장 기준 10분이면 끝난다.
#
# ---------------------------------------------------------------------
# 참고: 시뮬레이터의 한계
# ---------------------------------------------------------------------
# · 시뮬레이터에는 카메라가 없다. 촬영 화면(CaptureScreen)은 미리보기가
#   비어 보이므로 스크린샷 소재로 쓰지 말 것. 촬영 화면을 꼭 넣고 싶으면
#   실기기에서 전원+볼륨업으로 찍고 규격에 맞게 리사이즈해야 한다.
#   (실기기 캡처는 6.9" 기기로 찍으면 1320x2868 이 그대로 나온다)
# · 사진 앱이 비어 있으면 갤러리·편집 화면을 만들 수 없다. --add-media 로
#   샘플 사진을 넣고 시작하면 된다.
# · 프레임·스티커는 앱에 내장된 게 없다. 편집 화면 스크린샷을 찍으려면
#   먼저 앱에서 이미지를 몇 개 등록해 두어야 한다.
# =====================================================================

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# ── 대상 기기 ───────────────────────────────────────────────────────
# 이름으로 찾는다. udid 를 박아두면 Xcode 업데이트 때마다 깨진다.
IPHONE_NAME="iPhone 17 Pro Max"
IPHONE_FALLBACK="iPhone 16 Pro Max"
IPHONE_W=1320
IPHONE_H=2868

IPAD_NAME="iPad Pro 13-inch (M4)"
IPAD_FALLBACK="iPad Air 13-inch (M3)"
IPAD_W=2064
IPAD_H=2752

# ── 촬영 목록 (파일명|안내 문구) ────────────────────────────────────
# 실제 화면 구성 기준. 순서가 App Store 에 노출되는 순서가 된다.
SHOTS=(
  "01-home|홈 — 프로필 칩과 프레임·스티커·텍스트 모드 카드가 보이게"
  "02-select|프레임(또는 스티커) 선택 — 등록해 둔 항목이 그리드에 보이게"
  "03-edit|편집 — 사진 위에 스티커를 올리고 크기·각도를 잡은 상태"
  "04-text|텍스트 카드 — '데일리 체크' 카드를 붙이고 항목을 채운 상태"
  "05-result|완성 — 저장·공유 버튼과 '메인 화면으로' 가 보이게"
  "06-profile|프로필 — 닉네임과 이모지 테마 (선택)"
)

DEVICE_SEL="both"
OUT_DIR="store/screenshots"
APP_PATH=""
BUNDLE_ID=""
ADD_MEDIA=""
DO_INSTALL=1
DO_STATUS_BAR=1
KEEP_BOOTED=0
DRY_RUN=0
LIST_ONLY=0

if [ -t 1 ]; then
  C_RESET='\033[0m'; C_BLUE='\033[1;34m'; C_GREEN='\033[1;32m'
  C_YELLOW='\033[1;33m'; C_RED='\033[1;31m'; C_DIM='\033[2m'
else
  C_RESET=''; C_BLUE=''; C_GREEN=''; C_YELLOW=''; C_RED=''; C_DIM=''
fi

step() { printf "\n${C_BLUE}▶ %s${C_RESET}\n" "$*"; }
ok()   { printf "  ${C_GREEN}✓${C_RESET} %s\n" "$*"; }
warn() { printf "  ${C_YELLOW}!${C_RESET} %s\n" "$*"; }
fail() { printf "  ${C_RED}✗${C_RESET} %s\n" "$*" >&2; exit 1; }
note() { printf "  ${C_DIM}%s${C_RESET}\n" "$*"; }

run() {
  if [ "$DRY_RUN" -eq 1 ]; then
    printf "  ${C_DIM}[dry-run] %s${C_RESET}\n" "$*"
    return 0
  fi
  "$@"
}

usage() { sed -n '2,95p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0; }

while [ $# -gt 0 ]; do
  case "$1" in
    --device)         DEVICE_SEL="${2:?}"; shift 2 ;;
    --app)            APP_PATH="${2:?}"; shift 2 ;;
    --bundle-id)      BUNDLE_ID="${2:?}"; shift 2 ;;
    --add-media)      ADD_MEDIA="${2:?}"; shift 2 ;;
    --out)            OUT_DIR="${2:?}"; shift 2 ;;
    --no-install)     DO_INSTALL=0; shift ;;
    --no-status-bar)  DO_STATUS_BAR=0; shift ;;
    --keep-booted)    KEEP_BOOTED=1; shift ;;
    --dry-run)        DRY_RUN=1; shift ;;
    --list)           LIST_ONLY=1; shift ;;
    -h|--help)        usage ;;
    *)                fail "알 수 없는 옵션: $1 (--help 참고)" ;;
  esac
done

case "$DEVICE_SEL" in iphone|ipad|both) ;; *) fail "--device 는 iphone|ipad|both" ;; esac

command -v xcrun >/dev/null 2>&1 || fail "Xcode 명령줄 도구가 필요합니다."

if [ -z "$BUNDLE_ID" ]; then
  BUNDLE_ID="$(node -e "console.log(require('./app.json').expo.ios.bundleIdentifier)" 2>/dev/null || true)"
fi
[ -n "$BUNDLE_ID" ] || fail "번들 ID 를 찾지 못했습니다. --bundle-id 로 지정하세요."

# 이름으로 시뮬레이터 udid 찾기. 부팅 가능한 것 중 마지막(=최신 런타임) 항목.
find_udid() {
  xcrun simctl list devices available \
    | grep -F "$1 (" \
    | tail -n1 \
    | sed -E 's/.*\(([0-9A-F-]{36})\).*/\1/'
}

resolve_device() {
  local primary="$1" fallback="$2" udid
  udid="$(find_udid "$primary")"
  if [ -z "$udid" ]; then
    udid="$(find_udid "$fallback")"
    [ -n "$udid" ] && warn "'$primary' 가 없어 '$fallback' 로 대체합니다." >&2
  fi
  echo "$udid"
}

step "대상 기기 확인"
IPHONE_UDID=""; IPAD_UDID=""
if [ "$DEVICE_SEL" = "iphone" ] || [ "$DEVICE_SEL" = "both" ]; then
  IPHONE_UDID="$(resolve_device "$IPHONE_NAME" "$IPHONE_FALLBACK")"
  [ -n "$IPHONE_UDID" ] || fail "6.9인치 iPhone 시뮬레이터를 찾지 못했습니다. Xcode > Settings > Components 에서 추가하세요."
  ok "iPhone 6.9\" → ${IPHONE_W}x${IPHONE_H}  ($IPHONE_UDID)"
fi
if [ "$DEVICE_SEL" = "ipad" ] || [ "$DEVICE_SEL" = "both" ]; then
  IPAD_UDID="$(resolve_device "$IPAD_NAME" "$IPAD_FALLBACK")"
  [ -n "$IPAD_UDID" ] || fail "13인치 iPad 시뮬레이터를 찾지 못했습니다."
  ok "iPad 13\"   → ${IPAD_W}x${IPAD_H}  ($IPAD_UDID)"
fi

if [ "$LIST_ONLY" -eq 1 ]; then
  step "촬영 목록 (${#SHOTS[@]}장)"
  for shot in "${SHOTS[@]}"; do
    printf "  %-14s %s\n" "${shot%%|*}" "${shot#*|}"
  done
  note "저장 위치: $OUT_DIR/<device>/"
  exit 0
fi

# ── 기기 하나를 처리 ────────────────────────────────────────────────
capture_device() {
  local udid="$1" label="$2" want_w="$3" want_h="$4"
  local dir="$OUT_DIR/$label"

  step "[$label] 시뮬레이터 준비"
  run mkdir -p "$dir"
  run xcrun simctl boot "$udid" 2>/dev/null || true
  run xcrun simctl bootstatus "$udid" -b >/dev/null 2>&1 || true
  run open -a Simulator --args -CurrentDeviceUDID "$udid" || true
  ok "부팅 완료"

  if [ -n "$ADD_MEDIA" ]; then
    if [ -d "$ADD_MEDIA" ]; then
      # shellcheck disable=SC2046
      run xcrun simctl addmedia "$udid" $(find "$ADD_MEDIA" -maxdepth 1 -type f \( -iname '*.png' -o -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.heic' \))
      ok "샘플 사진을 사진 앱에 추가했습니다."
    else
      warn "--add-media 경로가 없습니다: $ADD_MEDIA"
    fi
  fi

  if [ "$DO_STATUS_BAR" -eq 1 ]; then
    run xcrun simctl status_bar "$udid" override \
      --time "9:41" --batteryState charged --batteryLevel 100 \
      --cellularMode active --cellularBars 4 --wifiMode active --wifiBars 3 \
      >/dev/null 2>&1 || warn "상태바 고정에 실패했습니다 (런타임에 따라 미지원)."
    ok "상태바 9:41 로 고정"
  fi

  if [ "$DO_INSTALL" -eq 1 ] && [ -n "$APP_PATH" ]; then
    [ -d "$APP_PATH" ] || fail "앱 번들이 없습니다: $APP_PATH"
    run xcrun simctl install "$udid" "$APP_PATH"
    ok "설치 완료: $APP_PATH"
  fi

  run xcrun simctl launch "$udid" "$BUNDLE_ID" >/dev/null 2>&1 \
    || warn "앱 실행에 실패했습니다. 이미 실행 중이거나 설치되지 않았을 수 있습니다."

  step "[$label] 캡처 — 시뮬레이터에서 화면을 맞춘 뒤 Enter"
  note "건너뛰려면 s + Enter · 중단하려면 q + Enter"

  local idx=0
  for shot in "${SHOTS[@]}"; do
    local name="${shot%%|*}" desc="${shot#*|}"
    idx=$((idx + 1))

    if [ "$DRY_RUN" -eq 1 ]; then
      printf "  ${C_DIM}[dry-run] %s → %s/%s.png${C_RESET}\n" "$desc" "$dir" "$name"
      continue
    fi

    printf "\n  ${C_BLUE}[%d/%d]${C_RESET} %s\n" "$idx" "${#SHOTS[@]}" "$desc"
    printf "  준비되면 Enter > "
    read -r answer </dev/tty || answer=""
    case "$answer" in
      q|Q) warn "중단합니다."; return 0 ;;
      s|S) note "건너뜀"; continue ;;
    esac

    local out="$dir/$name.png"
    xcrun simctl io "$udid" screenshot "$out" >/dev/null 2>&1 \
      || { warn "캡처 실패: $name"; continue; }

    # 규격 검증 — 여기서 걸러야 업로드 단계에서 반려당하지 않는다
    local w h
    w="$(sips -g pixelWidth "$out" | awk '/pixelWidth/{print $2}')"
    h="$(sips -g pixelHeight "$out" | awk '/pixelHeight/{print $2}')"
    if [ "$w" = "$want_w" ] && [ "$h" = "$want_h" ]; then
      ok "$name.png (${w}x${h})"
    else
      warn "$name.png 해상도가 ${w}x${h} 입니다. 기대값 ${want_w}x${want_h}"
      note "시뮬레이터 창 배율이 아니라 기기 자체가 다를 수 있습니다."
    fi
  done

  if [ "$DO_STATUS_BAR" -eq 1 ]; then
    run xcrun simctl status_bar "$udid" clear >/dev/null 2>&1 || true
  fi
  if [ "$KEEP_BOOTED" -eq 0 ]; then
    run xcrun simctl shutdown "$udid" >/dev/null 2>&1 || true
    ok "[$label] 시뮬레이터 종료"
  fi
}

[ -n "$IPHONE_UDID" ] && capture_device "$IPHONE_UDID" "iphone-6.9" "$IPHONE_W" "$IPHONE_H"
[ -n "$IPAD_UDID" ]   && capture_device "$IPAD_UDID"   "ipad-13"    "$IPAD_W"   "$IPAD_H"

step "완료"
if [ "$DRY_RUN" -eq 0 ]; then
  find "$OUT_DIR" -name '*.png' 2>/dev/null | sort | sed 's/^/  /' || true
fi
note "App Store Connect > 앱 > 버전 1.0 > 미리보기 및 스크린샷 에 업로드하세요."
note "업로드는 사람이 직접 — 이 스크립트는 파일만 만듭니다."
