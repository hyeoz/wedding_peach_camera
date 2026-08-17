#!/usr/bin/env bash
# 공통 헬퍼. 각 스크립트에서 source 한다.

set -euo pipefail

if [ -t 1 ] && [ -z "${NO_COLOR:-}" ]; then
  C_RED=$'\033[31m'; C_GRN=$'\033[32m'; C_YEL=$'\033[33m'
  C_BLU=$'\033[36m'; C_DIM=$'\033[2m'; C_B=$'\033[1m'; C_0=$'\033[0m'
else
  C_RED=''; C_GRN=''; C_YEL=''; C_BLU=''; C_DIM=''; C_B=''; C_0=''
fi

step()  { printf '\n%s▸ %s%s\n' "$C_B$C_BLU" "$*" "$C_0"; }
ok()    { printf '  %s✓%s %s\n' "$C_GRN" "$C_0" "$*"; }
warn()  { printf '  %s!%s %s\n' "$C_YEL" "$C_0" "$*"; }
fail()  { printf '  %s✗%s %s\n' "$C_RED" "$C_0" "$*"; }
info()  { printf '  %s%s%s\n'   "$C_DIM" "$*" "$C_0"; }

die() { fail "$*"; exit 1; }

# 프로젝트 루트로 이동 (스크립트 위치 기준)
cd_root() {
  local here; here="$(cd "$(dirname "${BASH_SOURCE[1]}")/.." && pwd)"
  cd "$here"
  [ -f app.json ] || die "app.json이 없습니다. 프로젝트 루트가 아닙니다: $here"
  ROOT="$here"
}

need_cmd() { command -v "$1" >/dev/null 2>&1 || die "'$1' 명령을 찾을 수 없습니다."; }

# app.json / eas.json에서 값 읽기 (node 사용 — jq 의존성 회피)
# json_get <파일경로> <a.b.c>  — 파일이나 키가 없으면 빈 문자열 (스크립트를 죽이지 않는다)
json_get() { node -e "
  try {
    const fs = require('fs');
    const v = JSON.parse(fs.readFileSync(process.argv[1], 'utf8'));
    let cur = v;
    for (const k of process.argv[2].split('.')) { if (cur == null) break; cur = cur[k]; }
    process.stdout.write(cur == null ? '' : String(cur));
  } catch (e) { process.stdout.write(''); }
" "$1" "$2"; }

# EAS CLI 실행기. 전역 설치본이 있으면 그걸, 없으면 npx로.
eas_run() {
  if command -v eas >/dev/null 2>&1; then eas "$@"; else npx --yes eas-cli@latest "$@"; fi
}
