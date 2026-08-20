#!/usr/bin/env node
/**
 * EAS 없이 이 맥에서 직접 iOS 릴리스 빌드를 만들어 App Store Connect 에 올린다.
 *
 * EAS Build 는 계정 단위 월 할당량(Free 플랜 iOS 15건)이 있어서, 한 계정에서 앱을
 * 여러 개 굴리면 금방 막힌다. 이 스크립트는 클라우드를 아예 거치지 않고
 *   expo prebuild → pod install → xcodebuild archive → exportArchive → altool 업로드
 * 를 한 번에 돌린다. 필요한 건 Xcode 와 App Store Connect API 키뿐이다.
 *
 * 서명은 Xcode 자동 서명에 맡기고, 인증서·프로비저닝 프로파일 발급/갱신은
 * `-allowProvisioningUpdates` + ASC API 키로 처리한다. 사람이 Xcode 에 로그인해
 * 둘 필요도, fastlane 도 필요 없다.
 *
 * 사용법
 *   node scripts/local-release-ios.mjs --dry-run     실행할 명령만 출력
 *   node scripts/local-release-ios.mjs               빌드 + 업로드 + VALID 대기
 *   node scripts/local-release-ios.mjs --build-only  IPA 까지만
 *   node scripts/local-release-ios.mjs --upload-only --ipa <경로>
 *   node scripts/local-release-ios.mjs --clean       ios/ 를 지우고 prebuild
 *   node scripts/local-release-ios.mjs --skip-prebuild   기존 ios/ 를 그대로 씀(빠름)
 *   node scripts/local-release-ios.mjs --skip-archive    build-ios/ 의 아카이브부터 이어서
 *   node scripts/local-release-ios.mjs --build-number 12 빌드 번호 직접 지정
 *
 * ── 키체인 승인에서 멈췄을 때 ──────────────────────────────────────────────
 * 아카이브는 개발용 인증서로 통과하지만, IPA 내보내기는 **배포용 인증서**로 다시
 * 서명한다. 그 개인 키의 ACL 이 codesign 을 아직 신뢰하지 않으면 승인 창이 뜨고
 * 사람이 누를 때까지 멈춘다 (로그가 조용해서 원인을 짐작하기 어렵다).
 *
 *   방법 1 — 창을 띄워 "항상 허용" 누르기
 *     node scripts/local-release-ios.mjs --skip-archive
 *     (승인 창이 뜨면 "항상 허용". 그 뒤로는 자동으로 진행된다)
 *
 *   방법 2 — 미리 승인해 두기 (로그인 비밀번호 필요, 창이 아예 안 뜬다)
 *     security set-key-partition-list -S apple-tool:,apple:,codesign: \
 *       -s -k <로그인 비밀번호> ~/Library/Keychains/login.keychain-db
 *     node scripts/local-release-ios.mjs --skip-archive
 *
 * 어느 쪽이든 한 번만 해 두면 다음 릴리스부터는 조용히 지나간다.
 *
 * 필요한 환경 변수 (.env.release 또는 셸)
 *   ASC_KEY_ID        App Store Connect API 키 ID
 *   ASC_ISSUER_ID     Issuer ID
 *   ASC_KEY_PATH      .p8 파일 경로
 *   ASC_APP_ID        (선택) ASC 의 앱 Apple ID(숫자). 없으면 eas.json 에서 읽는다
 *   APPLE_TEAM_ID     (선택) 팀 ID. 없으면 eas.json 에서 읽는다
 *
 * 다른 Expo 앱으로 옮길 때: 이 파일과 `.env.release` 만 복사하면 된다.
 * 앱마다 다른 값(팀·앱 ID)은 환경 변수로 주거나 eas.json 에 남겨 두면 자동으로 읽는다.
 */

import { execFileSync, spawnSync } from 'node:child_process';
import { createSign } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { argv, env, exit } from 'node:process';

// ─── 인자 ────────────────────────────────────────────────────────────────

const ARGS = argv.slice(2);
const has = (flag) => ARGS.includes(flag);
const valueOf = (flag) => {
  const i = ARGS.indexOf(flag);
  return i === -1 ? null : ARGS[i + 1] ?? null;
};

const DRY_RUN = has('--dry-run');
const BUILD_ONLY = has('--build-only');
const UPLOAD_ONLY = has('--upload-only');
const CLEAN = has('--clean');
const SKIP_PREBUILD = has('--skip-prebuild');
const SKIP_ARCHIVE = has('--skip-archive');
const IPA_ARG = valueOf('--ipa');
const BUILD_NUMBER_ARG = valueOf('--build-number');

const ROOT = resolve(new URL('..', import.meta.url).pathname);
const IOS_DIR = join(ROOT, 'ios');
const OUT_DIR = join(ROOT, 'build-ios');
const ARCHIVE_PATH = join(OUT_DIR, 'app.xcarchive');
const EXPORT_DIR = join(OUT_DIR, 'export');

const C = { b: '[1m', dim: '[2m', red: '[31m', grn: '[32m', yel: '[33m', off: '[0m' };
const log = (msg) => console.log(msg);
const step = (msg) => console.log(`\n${C.b}▸ ${msg}${C.off}`);
const ok = (msg) => console.log(`  ${C.grn}✓${C.off} ${msg}`);
const warn = (msg) => console.log(`  ${C.yel}!${C.off} ${msg}`);
const info = (msg) => console.log(`  ${C.dim}${msg}${C.off}`);
const fail = (msg) => {
  console.error(`\n${C.red}${C.b}실패:${C.off} ${msg}`);
  exit(1);
};

// ─── .env.release ────────────────────────────────────────────────────────

/** 시크릿을 셸 히스토리에 남기지 않으려고 파일에서 읽는다. 셸 값이 우선. */
function loadEnvFile(path = join(ROOT, '.env.release')) {
  if (!existsSync(path)) return;
  for (const rawLine of readFileSync(path, 'utf8').split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!env[key]) env[key] = value;
  }
}

// ─── 명령 실행 ───────────────────────────────────────────────────────────

/**
 * CocoaPods(시스템 루비)는 로케일이 C/미설정이면 경로를 유니코드 정규화하다
 * `Encoding::CompatibilityError` 로 죽는다. 비대화형 셸에서 흔한 상황이라 여기서 못 박는다.
 */
const CHILD_ENV = {
  ...env,
  LANG: env.LANG || 'en_US.UTF-8',
  LC_ALL: env.LC_ALL || 'en_US.UTF-8',
};

function run(command, args, options = {}) {
  const pretty = `${command} ${args.join(' ')}`;
  if (DRY_RUN) {
    info(`[dry-run] ${pretty}`);
    return '';
  }
  info(pretty.length > 300 ? `${pretty.slice(0, 300)}…` : pretty);
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? ROOT,
    stdio: options.capture ? ['inherit', 'pipe', 'inherit'] : 'inherit',
    encoding: 'utf8',
    env: CHILD_ENV,
  });
  if (result.status !== 0) fail(`${command} 가 코드 ${result.status} 로 끝났습니다.`);
  return result.stdout ?? '';
}

// ─── App Store Connect API ───────────────────────────────────────────────

const ASC = 'https://api.appstoreconnect.apple.com/v1';

function ascToken() {
  const keyId = env.ASC_KEY_ID;
  const issuerId = env.ASC_ISSUER_ID;
  const keyPath = env.ASC_KEY_PATH;
  if (!keyId || !issuerId || !keyPath) {
    fail('ASC_KEY_ID / ASC_ISSUER_ID / ASC_KEY_PATH 가 필요합니다 (.env.release 또는 셸).');
  }
  if (!existsSync(keyPath)) fail(`ASC_KEY_PATH 파일이 없습니다: ${keyPath}`);

  const b64 = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const header = b64({ alg: 'ES256', kid: keyId, typ: 'JWT' });
  const payload = b64({ iss: issuerId, iat: now, exp: now + 900, aud: 'appstoreconnect-v1' });
  const signer = createSign('SHA256');
  signer.update(`${header}.${payload}`);
  const signature = signer
    .sign({ key: readFileSync(keyPath, 'utf8'), dsaEncoding: 'ieee-p1363' })
    .toString('base64url');
  return `${header}.${payload}.${signature}`;
}

async function ascGet(path) {
  const response = await fetch(`${ASC}${path}`, {
    headers: { Authorization: `Bearer ${ascToken()}` },
  });
  if (!response.ok) fail(`App Store Connect ${response.status}: ${await response.text()}`);
  return response.json();
}

/** 이 앱에 이미 올라간 빌드 중 가장 큰 번호. 없으면 0. */
async function latestBuildNumber(appId) {
  const { data } = await ascGet(
    `/builds?filter[app]=${appId}&limit=200&sort=-uploadedDate&fields[builds]=version,processingState`,
  );
  const numbers = data
    .map((build) => Number.parseInt(build.attributes.version, 10))
    .filter((n) => Number.isFinite(n));
  return numbers.length > 0 ? Math.max(...numbers) : 0;
}

/** 업로드한 빌드가 처리될 때까지 기다린다. VALID 면 true. */
async function waitForProcessing(appId, buildNumber, { timeoutMs = 45 * 60 * 1000 } = {}) {
  const startedAt = Date.now();
  let lastState = '';

  while (Date.now() - startedAt < timeoutMs) {
    const { data } = await ascGet(
      `/builds?filter[app]=${appId}&limit=50&sort=-uploadedDate&fields[builds]=version,processingState,uploadedDate`,
    );
    const build = data.find((entry) => entry.attributes.version === String(buildNumber));

    if (build) {
      const state = build.attributes.processingState;
      if (state !== lastState) {
        info(`빌드 ${buildNumber}: ${state}`);
        lastState = state;
      }
      if (state === 'VALID') return true;
      if (state === 'FAILED' || state === 'INVALID') {
        fail(`빌드 ${buildNumber} 처리 실패 (${state}). App Store Connect 에서 사유를 확인하세요.`);
      }
    } else if (!lastState) {
      info('아직 App Store Connect 에 나타나지 않음 (업로드 직후에는 몇 분 걸립니다)');
      lastState = 'PENDING';
    }

    await new Promise((r) => setTimeout(r, 30_000));
  }

  return false;
}

// ─── 설정 읽기 ───────────────────────────────────────────────────────────

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * 앱 식별 정보. 환경 변수를 먼저 보고, 없으면 eas.json 에 남아 있는 값을 쓴다.
 * EAS 를 완전히 걷어내더라도 환경 변수만 주면 그대로 돈다.
 */
function resolveConfig() {
  const easSubmit = readJson(join(ROOT, 'eas.json'))?.submit?.production?.ios ?? {};
  const appId = env.ASC_APP_ID || easSubmit.ascAppId;
  const teamId = env.APPLE_TEAM_ID || easSubmit.appleTeamId;

  if (!appId) fail('ASC_APP_ID 가 필요합니다 (App Store Connect 의 앱 Apple ID 숫자).');
  if (!teamId) fail('APPLE_TEAM_ID 가 필요합니다 (Apple Developer > Membership).');

  // ios/ 안의 워크스페이스에서 스킴 이름을 얻는다. Expo CNG 는 보통 'app'.
  let workspace = null;
  if (existsSync(IOS_DIR)) {
    const found = readdirSync(IOS_DIR).find((name) => name.endsWith('.xcworkspace'));
    if (found) workspace = join(IOS_DIR, found);
  }
  const scheme = workspace ? basename(workspace, '.xcworkspace') : 'app';

  return { appId: String(appId), teamId: String(teamId), workspace, scheme };
}

// ─── 단계들 ──────────────────────────────────────────────────────────────

function prebuild() {
  step('1. 네이티브 프로젝트 생성 (expo prebuild)');
  if (SKIP_PREBUILD) {
    warn('--skip-prebuild: 기존 ios/ 를 그대로 씁니다 (app.json 변경이 반영되지 않을 수 있음)');
    if (!existsSync(IOS_DIR)) fail('ios/ 가 없습니다. --skip-prebuild 를 빼고 실행하세요.');
    return;
  }

  // prebuild 는 package.json 의 scripts 에 run:ios / run:android 를 끼워 넣는다.
  // 릴리스를 한 번 돌렸다고 추적 파일이 바뀌면 곤란하므로 원래대로 되돌린다.
  const packagePath = join(ROOT, 'package.json');
  const before = existsSync(packagePath) ? readFileSync(packagePath, 'utf8') : null;

  const args = ['expo', 'prebuild', '--platform', 'ios'];
  if (CLEAN) args.push('--clean');
  run('npx', args);

  if (before !== null && !DRY_RUN && readFileSync(packagePath, 'utf8') !== before) {
    writeFileSync(packagePath, before);
    info('prebuild 가 건드린 package.json 을 원래대로 되돌렸습니다.');
  }
  ok('prebuild 완료');
}

function podInstall() {
  step('2. CocoaPods 설치');
  run('pod', ['install'], { cwd: IOS_DIR });
  ok('pod install 완료');
}

/**
 * 빌드 번호를 Info.plist 에 직접 박는다.
 *
 * EAS 의 remote autoIncrement 를 쓰지 않으므로 값을 우리가 정해야 한다.
 * app.json 을 건드리면 추적 파일이 더러워지므로, prebuild 가 만들어 낸
 * (gitignore 된) Info.plist 만 고친다.
 */
function setBuildNumber(scheme, buildNumber) {
  step(`3. 빌드 번호 설정 (${buildNumber})`);
  const plist = join(IOS_DIR, scheme, 'Info.plist');
  if (!existsSync(plist) && !DRY_RUN) fail(`Info.plist 를 찾을 수 없습니다: ${plist}`);
  run('/usr/libexec/PlistBuddy', ['-c', `Set :CFBundleVersion ${buildNumber}`, plist]);
  ok(`CFBundleVersion = ${buildNumber}`);
}

function signingArgs() {
  return [
    '-allowProvisioningUpdates',
    '-authenticationKeyPath',
    resolve(env.ASC_KEY_PATH),
    '-authenticationKeyID',
    env.ASC_KEY_ID,
    '-authenticationKeyIssuerID',
    env.ASC_ISSUER_ID,
  ];
}

function archive({ workspace, scheme, teamId }) {
  step('4. 아카이브 (xcodebuild archive)');
  mkdirSync(OUT_DIR, { recursive: true });
  if (existsSync(ARCHIVE_PATH) && !DRY_RUN) rmSync(ARCHIVE_PATH, { recursive: true, force: true });

  run('xcodebuild', [
    '-workspace',
    workspace,
    '-scheme',
    scheme,
    '-configuration',
    'Release',
    '-destination',
    'generic/platform=iOS',
    '-archivePath',
    ARCHIVE_PATH,
    'archive',
    `DEVELOPMENT_TEAM=${teamId}`,
    'CODE_SIGN_STYLE=Automatic',
    ...signingArgs(),
  ]);
  ok(`아카이브: ${ARCHIVE_PATH}`);
}

function exportIpa({ teamId }) {
  step('5. IPA 내보내기 (xcodebuild -exportArchive)');
  if (existsSync(EXPORT_DIR) && !DRY_RUN) rmSync(EXPORT_DIR, { recursive: true, force: true });
  mkdirSync(EXPORT_DIR, { recursive: true });

  const optionsPath = join(OUT_DIR, 'ExportOptions.plist');
  const optionsPlist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>method</key><string>app-store-connect</string>
  <key>destination</key><string>export</string>
  <key>teamID</key><string>${teamId}</string>
  <key>signingStyle</key><string>automatic</string>
  <key>uploadSymbols</key><true/>
  <key>manageAppVersionAndBuildNumber</key><false/>
</dict>
</plist>
`;
  if (!DRY_RUN) writeFileSync(optionsPath, optionsPlist);
  else info(`[dry-run] ExportOptions.plist 작성: ${optionsPath}`);

  run('xcodebuild', [
    '-exportArchive',
    '-archivePath',
    ARCHIVE_PATH,
    '-exportPath',
    EXPORT_DIR,
    '-exportOptionsPlist',
    optionsPath,
    ...signingArgs(),
  ]);

  if (DRY_RUN) return join(EXPORT_DIR, 'app.ipa');
  const ipa = readdirSync(EXPORT_DIR).find((name) => name.endsWith('.ipa'));
  if (!ipa) fail(`IPA 를 찾지 못했습니다: ${EXPORT_DIR}`);
  ok(`IPA: ${join(EXPORT_DIR, ipa)}`);
  return join(EXPORT_DIR, ipa);
}

function upload(ipaPath) {
  step('6. App Store Connect 업로드 (altool)');
  run('xcrun', [
    'altool',
    '--upload-app',
    '-f',
    ipaPath,
    '-t',
    'ios',
    '--apiKey',
    env.ASC_KEY_ID,
    '--apiIssuer',
    env.ASC_ISSUER_ID,
  ]);
  ok('업로드 요청 완료');
}

// ─── 사전 점검 ───────────────────────────────────────────────────────────

function preflight(config) {
  step('0. 사전 점검');

  for (const command of ['xcodebuild', 'pod', 'npx']) {
    const found = spawnSync('/bin/sh', ['-c', `command -v ${command}`], { encoding: 'utf8' });
    if (found.status !== 0) fail(`${command} 를 찾을 수 없습니다.`);
  }
  const xcode = execFileSync('xcodebuild', ['-version'], { encoding: 'utf8' }).split('\n')[0];
  ok(xcode);

  if (!existsSync(env.ASC_KEY_PATH ?? '')) fail(`ASC_KEY_PATH 파일이 없습니다: ${env.ASC_KEY_PATH}`);
  ok(`ASC API 키: ${env.ASC_KEY_ID}`);
  ok(`앱 Apple ID: ${config.appId} / 팀: ${config.teamId}`);

  /**
   * 배포 인증서는 로그인 키체인에 있고, 개인 키 ACL 이 codesign 을 아직 신뢰하지
   * 않으면 export 단계에서 승인 창이 떠 **사람이 누를 때까지 멈춘다**.
   * 자동으로 뚫을 방법이 없으니(키체인 비밀번호가 필요하다) 미리 알려만 준다.
   */
  const identities = spawnSync('security', ['find-identity', '-v', '-p', 'codesigning'], {
    encoding: 'utf8',
  }).stdout ?? '';
  const distribution = identities
    .split('\n')
    .find((line) => line.includes('Apple Distribution') && line.includes(config.teamId));
  if (distribution) {
    ok(`배포 인증서 있음:${distribution.split('"')[1] ? ` ${distribution.split('"')[1]}` : ''}`);
    warn('처음 실행이면 export 단계에서 키체인 접근 승인 창이 뜹니다 — "항상 허용" 을 누르세요.');
    info('미리 없애려면(비밀번호 직접 입력): security set-key-partition-list \\');
    info('  -S apple-tool:,apple:,codesign: -s -k <로그인 비밀번호> ~/Library/Keychains/login.keychain-db');
  } else {
    warn(`팀 ${config.teamId} 의 Apple Distribution 인증서가 로컬에 없습니다.`);
    info('xcodebuild 가 ASC API 키로 새로 발급하려 시도합니다 (실패하면 Xcode 에서 한 번 만들어야 합니다).');
  }

  const dirty = execFileSync('git', ['status', '--porcelain'], { cwd: ROOT, encoding: 'utf8' }).trim();
  if (dirty) warn(`커밋되지 않은 변경 ${dirty.split('\n').length}건 — 지금 상태 그대로 빌드됩니다.`);
  else ok(`깨끗한 작업 트리 (${execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim()})`);
}

// ─── 메인 ────────────────────────────────────────────────────────────────

/** 이미 만들어 둔 아카이브에 박혀 있는 빌드 번호. */
function archiveBuildNumber() {
  return execFileSync(
    '/usr/libexec/PlistBuddy',
    ['-c', 'Print :ApplicationProperties:CFBundleVersion', join(ARCHIVE_PATH, 'Info.plist')],
    { encoding: 'utf8' },
  ).trim();
}

/** 내보내기 → 업로드 → VALID 대기. 아카이브가 준비된 뒤의 공통 흐름. */
async function exportUploadFinish(config, buildNumber) {
  const ipaPath = exportIpa({ teamId: config.teamId });

  if (BUILD_ONLY) {
    step('완료 (--build-only)');
    ok(`IPA: ${ipaPath}`);
    info(`업로드하려면: node scripts/local-release-ios.mjs --upload-only --ipa ${ipaPath} --build-number ${buildNumber}`);
    return;
  }

  upload(ipaPath);
  if (!DRY_RUN) await finish(config.appId, buildNumber);
}

async function main() {
  loadEnvFile();
  const config = resolveConfig();

  log(`${C.b}웨피캠 로컬 iOS 릴리스${C.off}${DRY_RUN ? `${C.yel} (dry-run)${C.off}` : ''}`);
  preflight(config);

  if (UPLOAD_ONLY) {
    if (!IPA_ARG) fail('--upload-only 에는 --ipa <경로> 가 필요합니다.');
    const buildNumber = BUILD_NUMBER_ARG ?? String((await latestBuildNumber(config.appId)) + 1);
    upload(resolve(IPA_ARG));
    if (!DRY_RUN) await finish(config.appId, buildNumber);
    return;
  }

  // 아카이브까지 끝난 뒤 내보내기에서 멈춘 경우(키체인 승인 대기 등) 여기서 이어 붙인다.
  // 15~20분짜리 빌드를 다시 돌릴 필요가 없다.
  if (SKIP_ARCHIVE) {
    step('기존 아카이브 재사용 (--skip-archive)');
    if (!existsSync(ARCHIVE_PATH)) fail(`아카이브가 없습니다: ${ARCHIVE_PATH}`);
    const buildNumber = BUILD_NUMBER_ARG ?? archiveBuildNumber();
    ok(`${ARCHIVE_PATH} (빌드 ${buildNumber})`);
    await exportUploadFinish(config, buildNumber);
    return;
  }

  step('빌드 번호 결정');
  const latest = await latestBuildNumber(config.appId);
  const buildNumber = BUILD_NUMBER_ARG ?? String(latest + 1);
  info(`App Store Connect 최신 빌드: ${latest || '(없음)'}`);
  ok(`이번 빌드 번호: ${buildNumber}`);

  prebuild();
  podInstall();
  setBuildNumber(config.scheme, buildNumber);

  // prebuild 후 워크스페이스가 새로 생겼을 수 있어 다시 확인한다.
  const resolved = resolveConfig();
  if (!resolved.workspace && !DRY_RUN) fail('ios/*.xcworkspace 를 찾지 못했습니다.');

  archive({ ...resolved, teamId: config.teamId });
  await exportUploadFinish(config, buildNumber);
}

async function finish(appId, buildNumber) {
  step('7. 처리 상태 확인 (VALID 까지 대기)');
  const valid = await waitForProcessing(appId, buildNumber);
  if (valid) {
    ok(`빌드 ${buildNumber} VALID — TestFlight 에서 사용할 수 있습니다.`);
    info('심사 제출은 이 스크립트가 하지 않습니다. App Store Connect 에서 직접 진행하세요.');
  } else {
    warn(`시간 안에 VALID 를 확인하지 못했습니다. App Store Connect 에서 빌드 ${buildNumber} 상태를 확인하세요.`);
  }
}

main().catch((error) => fail(error instanceof Error ? error.message : String(error)));
