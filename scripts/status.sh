#!/usr/bin/env bash
# 최근 빌드/제출 현황을 한눈에.
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
cd_root
step "앱"
info "$(json_get ./app.json expo.name) v$(json_get ./app.json expo.version) — $(json_get ./app.json expo.ios.bundleIdentifier)"
step "최근 빌드"
eas_run build:list --platform ios --limit 5 --non-interactive || warn "조회 실패 (인증/네트워크 확인)"
step "최근 제출"
eas_run submit:list --platform ios --limit 3 --non-interactive 2>/dev/null || info "submit:list 미지원 버전이거나 제출 이력 없음"
