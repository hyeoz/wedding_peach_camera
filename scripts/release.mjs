#!/usr/bin/env node
/**
 * 웨피캠 릴리스 자동화.
 *
 * 사람이 프롬프트에 답하지 않아도 빌드부터 심사 제출까지 진행할 수 있게 만든 스크립트다.
 * 에이전트(Claude, Codex 등)가 대신 실행하는 상황을 전제로, 모든 단계가 비대화형이며
 * 실패하면 그 자리에서 멈추고 이유를 출력한다.
 *
 * 사용법
 *   node scripts/release.mjs --dry-run                  무엇을 할지만 출력
 *   node scripts/release.mjs                            빌드 + TestFlight 업로드
 *   node scripts/release.mjs --skip-build               이미 올라간 최신 빌드만 버전에 연결
 *   node scripts/release.mjs --submit-for-review        위 과정 후 App Review까지 제출
 *
 * 필요한 환경 변수 (.env.release 또는 셸)
 *   ASC_KEY_ID        App Store Connect API 키 ID
 *   ASC_ISSUER_ID     Issuer ID
 *   ASC_KEY_PATH      .p8 파일 경로 (또는 ASC_KEY_BASE64 에 base64로 담아도 됨)
 *   ASC_APP_ID        App Store Connect Apple ID (숫자)
 *
 * 이 키는 EAS가 자체 생성해 보관하는 키와 별개다. EAS의 키는 EAS 서버에만 있어서
 * 이 스크립트가 쓸 수 없으므로, App Store Connect에서 별도로 하나 발급받아야 한다.
 * 사용자 및 액세스 → 통합 → App Store Connect API → 키 생성 (역할: App Manager)
 */

import { execFileSync } from 'node:child_process';
import { createSign } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { argv, env, exit } from 'node:process';

const FLAGS = new Set(argv.slice(2));
const DRY_RUN = FLAGS.has('--dry-run');
const SKIP_BUILD = FLAGS.has('--skip-build');
const SUBMIT_FOR_REVIEW = FLAGS.has('--submit-for-review');

const EAS = ['--yes', 'eas-cli@22.0.0'];
const ASC = 'https://api.appstoreconnect.apple.com/v1';

// ─── .env.release ────────────────────────────────────────────────────────

/**
 * 시크릿을 셸 히스토리에 남기지 않으려고 .env.release 를 쓴다.
 * 이미 셸에 있는 값이 우선이므로 CI에서는 파일 없이 환경 변수만 주입하면 된다.
 * (.gitignore 의 `.env.*.local` 이 아니라 `.env` 규칙에 걸리지 않으니 커밋 금지 주의)
 */
function loadEnvFile(path = '.env.release') {
  if (!existsSync(path)) return;

  for (const rawLine of readFileSync(path, 'utf8').split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const eq = line.indexOf('=');
    if (eq === -1) continue;

    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] ??= value;
  }
}

// ─── 유틸 ────────────────────────────────────────────────────────────────

const log = (msg) => console.log(msg);
const step = (msg) => console.log(`\n▸ ${msg}`);

function fail(msg) {
  console.error(`\n✖ ${msg}`);
  exit(1);
}

function run(cmd, args, { capture = false } = {}) {
  if (DRY_RUN) {
    log(`  [dry-run] ${cmd} ${args.join(' ')}`);
    return '';
  }
  try {
    const out = execFileSync(cmd, args, {
      encoding: 'utf8',
      stdio: capture ? ['inherit', 'pipe', 'inherit'] : 'inherit',
    });
    return out ?? '';
  } catch (error) {
    fail(`명령 실패: ${cmd} ${args.join(' ')}\n${error.message}`);
    return '';
  }
}

const npx = (args, opts) => run('npx', [...EAS, ...args], opts);

// ─── App Store Connect API ───────────────────────────────────────────────

function ascToken() {
  const keyId = env.ASC_KEY_ID;
  const issuerId = env.ASC_ISSUER_ID;
  let key = env.ASC_KEY_BASE64
    ? Buffer.from(env.ASC_KEY_BASE64, 'base64').toString('utf8')
    : env.ASC_KEY_PATH && existsSync(env.ASC_KEY_PATH)
      ? readFileSync(env.ASC_KEY_PATH, 'utf8')
      : null;

  if (!keyId || !issuerId || !key) {
    fail('ASC_KEY_ID, ASC_ISSUER_ID, ASC_KEY_PATH(또는 ASC_KEY_BASE64)가 필요합니다.');
  }

  const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const header = b64({ alg: 'ES256', kid: keyId, typ: 'JWT' });
  const payload = b64({
    iss: issuerId,
    iat: now,
    exp: now + 600, // Apple은 20분을 넘기면 거부한다
    aud: 'appstoreconnect-v1',
  });

  // ES256 JWT는 DER이 아니라 raw R||S 서명을 요구한다.
  const signer = createSign('SHA256');
  signer.update(`${header}.${payload}`);
  const sig = signer.sign({ key, dsaEncoding: 'ieee-p1363' }).toString('base64url');

  return `${header}.${payload}.${sig}`;
}

/**
 * 토큰 수명은 10분인데 빌드 처리 대기는 최대 60분까지 돈다.
 * 한 번 만들어 계속 쓰면 대기 도중 401로 떨어지므로 만료 전에 새로 발급한다.
 */
let cachedToken = null;
let cachedTokenExpiry = 0;

function currentToken() {
  const now = Math.floor(Date.now() / 1000);
  if (!cachedToken || now >= cachedTokenExpiry - 60) {
    cachedToken = ascToken();
    cachedTokenExpiry = now + 600;
  }
  return cachedToken;
}

async function asc(path, { method = 'GET', body } = {}) {
  const token = currentToken();
  const res = await fetch(`${ASC}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return null;
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const detail = json?.errors?.map((e) => `${e.title}: ${e.detail}`).join('\n  ') ?? text;
    fail(`App Store Connect ${method} ${path} → ${res.status}\n  ${detail}`);
  }
  return json;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ─── 단계 ────────────────────────────────────────────────────────────────

function preflight() {
  step('사전 점검');

  const branch = run('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { capture: true }).trim();
  const dirty = run('git', ['status', '--porcelain'], { capture: true }).trim();

  if (!DRY_RUN) {
    if (dirty) fail(`작업트리가 깨끗하지 않습니다. eas.json의 requireCommit 때문에 빌드가 중단됩니다.\n${dirty}`);
    if (branch !== 'main') log(`  경고: 현재 브랜치가 ${branch} 입니다.`);
  }

  run('npm', ['run', 'typecheck']);
  run('npm', ['run', 'deploy:check']);
  checkAppConfig();

  log('  ✓ 사전 점검 통과');
}

/**
 * 빌드는 20분 넘게 걸린다. 제출 단계에서야 드러날 설정 누락은 그 전에 잡는다.
 */
function checkAppConfig() {
  const expo = JSON.parse(readFileSync('app.json', 'utf8')).expo;
  const easSubmit = JSON.parse(readFileSync('eas.json', 'utf8'))?.submit?.production?.ios ?? {};
  const problems = [];

  if (!expo?.extra?.eas?.projectId) problems.push('app.json: extra.eas.projectId 없음 (eas init 필요)');
  if (!expo?.ios?.bundleIdentifier) problems.push('app.json: ios.bundleIdentifier 없음');
  if (!easSubmit.ascAppId || /REPLACE_WITH/.test(String(easSubmit.ascAppId)))
    problems.push('eas.json: submit.production.ios.ascAppId 미설정');

  for (const [label, file] of [
    ['아이콘', expo?.icon],
    ['스플래시', expo?.plugins?.find((p) => Array.isArray(p) && p[0] === 'expo-splash-screen')?.[1]?.image],
  ]) {
    if (file && !existsSync(file)) problems.push(`${label} 파일 없음: ${file}`);
  }

  if (problems.length) fail(`앱 설정 문제:\n  - ${problems.join('\n  - ')}`);
  log(`  ✓ ${expo.name} v${expo.version} (${expo.ios.bundleIdentifier})`);
}

function buildAndUpload() {
  step('EAS production 빌드 + App Store Connect 업로드');
  // --auto-submit 은 빌드 완료 후 곧바로 EAS Submit을 실행한다.
  // --non-interactive 로 두면 프롬프트 없이 진행되고, 정보가 부족하면 실패한다.
  npx([
    'build',
    '--platform', 'ios',
    '--profile', 'production',
    '--auto-submit',
    '--non-interactive',
    '--wait',
  ]);
  log('  ✓ 업로드 완료. Apple의 처리(processing)가 이어집니다.');
}

const BUILD_FIELDS = 'version,processingState,expired,uploadedDate';

async function listRecentBuilds(appId, limit = 20) {
  const res = await asc(
    `/builds?filter[app]=${appId}&limit=${limit}&sort=-uploadedDate&fields[builds]=${BUILD_FIELDS}`,
  );
  return res?.data ?? [];
}

/**
 * 업로드 직전의 빌드 목록을 찍어 둔다.
 * 이게 없으면 "가장 최근 빌드"가 방금 올린 것인지, 예전 것인지 구분할 수 없어서
 * 아직 업로드가 반영되지 않은 동안 엉뚱한 빌드를 버전에 연결해 버릴 수 있다.
 */
async function snapshotBuildIds(appId) {
  const builds = await listRecentBuilds(appId);
  return new Set(builds.map((build) => build.id));
}

/**
 * knownIds 에 없는(=이번에 올라온) 빌드가 VALID 가 될 때까지 기다린다.
 * --skip-build 로 실행하면 knownIds 가 비어 있으므로 가장 최근 VALID 빌드를 그대로 쓴다.
 */
async function waitForProcessedBuild(appId, knownIds, { timeoutMinutes = 60 } = {}) {
  step('Apple 빌드 처리 대기');
  const deadline = Date.now() + timeoutMinutes * 60_000;

  while (Date.now() < deadline) {
    const candidates = (await listRecentBuilds(appId)).filter(
      (build) => !knownIds.has(build.id) && !build.attributes.expired,
    );
    const build = candidates[0];

    if (!build) {
      log('  새 빌드가 아직 보이지 않습니다. 60초 후 다시 확인합니다.');
    } else {
      const { processingState, version } = build.attributes;
      log(`  빌드 ${version} · ${processingState}`);

      if (processingState === 'VALID') return build;
      if (processingState === 'FAILED' || processingState === 'INVALID') {
        fail(`빌드 ${version} 처리 실패 (${processingState}). App Store Connect에서 상세 사유를 확인하세요.`);
      }
    }
    await sleep(60_000);
  }
  fail(`${timeoutMinutes}분 안에 처리가 끝나지 않았습니다.`);
}

async function findEditableVersion(appId) {
  step('편집 가능한 App Store 버전 조회');
  const res = await asc(
    `/apps/${appId}/appStoreVersions?filter[appStoreState]=PREPARE_FOR_SUBMISSION,DEVELOPER_REJECTED,REJECTED,METADATA_REJECTED&limit=1`,
  );
  const version = res?.data?.[0];
  if (!version) {
    fail(
      '편집 가능한 버전이 없습니다. App Store Connect에서 새 버전을 만들거나, ' +
        '기존 버전이 이미 심사 중인지 확인하세요.',
    );
  }
  log(`  ✓ ${version.attributes.versionString} (${version.attributes.appStoreState})`);
  return version;
}

async function attachBuild(versionId, buildId) {
  step('버전에 빌드 연결');
  await asc(`/appStoreVersions/${versionId}/relationships/build`, {
    method: 'PATCH',
    body: { data: { type: 'builds', id: buildId } },
  });
  log('  ✓ 연결 완료');
}

async function submitForReview(appId, versionId) {
  step('App Review 제출');

  // 이미 열려 있는 제출이 있으면 재사용한다. 중복 생성은 409를 낸다.
  const existing = await asc(
    `/reviewSubmissions?filter[app]=${appId}&filter[state]=READY_FOR_REVIEW,WAITING_FOR_REVIEW,IN_REVIEW&limit=1`,
  );
  if (existing?.data?.length) {
    fail(
      `이미 진행 중인 심사 제출이 있습니다 (${existing.data[0].attributes.state}). ` +
        '중복 제출을 막기 위해 여기서 멈춥니다.',
    );
  }

  const submission = await asc('/reviewSubmissions', {
    method: 'POST',
    body: {
      data: {
        type: 'reviewSubmissions',
        attributes: { platform: 'IOS' },
        relationships: { app: { data: { type: 'apps', id: appId } } },
      },
    },
  });
  const submissionId = submission.data.id;

  await asc('/reviewSubmissionItems', {
    method: 'POST',
    body: {
      data: {
        type: 'reviewSubmissionItems',
        relationships: {
          reviewSubmission: { data: { type: 'reviewSubmissions', id: submissionId } },
          appStoreVersion: { data: { type: 'appStoreVersions', id: versionId } },
        },
      },
    },
  });

  await asc(`/reviewSubmissions/${submissionId}`, {
    method: 'PATCH',
    body: {
      data: {
        type: 'reviewSubmissions',
        id: submissionId,
        attributes: { submitted: true },
      },
    },
  });

  log(`  ✓ 제출 완료. submission id: ${submissionId}`);
  log('    App Store Connect에서 상태가 "심사 대기 중"으로 바뀌는지 확인하세요.');
}

// ─── 실행 ────────────────────────────────────────────────────────────────

/** eas.json 에 이미 적어 둔 ascAppId 를 기본값으로 쓴다. 두 곳에 같은 숫자를 관리할 이유가 없다. */
function appIdFromEasJson() {
  try {
    const easJson = JSON.parse(readFileSync('eas.json', 'utf8'));
    return easJson?.submit?.production?.ios?.ascAppId ?? null;
  } catch {
    return null;
  }
}

async function main() {
  loadEnvFile();

  const appId = env.ASC_APP_ID ?? appIdFromEasJson();
  if (!appId) {
    fail('ASC_APP_ID가 필요합니다. (App Store Connect의 Apple ID 숫자, 또는 eas.json 의 submit.production.ios.ascAppId)');
  }

  if (DRY_RUN) log('※ dry-run: 실제로 아무것도 바꾸지 않습니다.\n');

  preflight();

  if (DRY_RUN) {
    if (!SKIP_BUILD) buildAndUpload();
    log('\n[dry-run] 이후 단계: 빌드 처리 대기 → 버전에 연결' +
      (SUBMIT_FOR_REVIEW ? ' → App Review 제출' : ''));
    log(`[dry-run] 대상 앱: ${appId}`);
    return;
  }

  // 업로드 전에 기존 빌드를 기록해 둬야 방금 올린 빌드를 구분할 수 있다.
  const knownBuildIds = SKIP_BUILD ? new Set() : await snapshotBuildIds(appId);
  if (!SKIP_BUILD) buildAndUpload();

  const build = await waitForProcessedBuild(appId, knownBuildIds);
  const version = await findEditableVersion(appId);
  await attachBuild(version.id, build.id);

  if (!SUBMIT_FOR_REVIEW) {
    log('\n완료. 심사까지 보내려면 --submit-for-review 를 붙여 다시 실행하세요.');
    log('제출 전에 스크린샷, 설명, App Privacy, 연령 등급이 모두 입력되어 있어야 합니다.');
    return;
  }

  await submitForReview(appId, version.id);
  log('\n완료.');
}

main().catch((error) => fail(error.stack ?? String(error)));
