#!/usr/bin/env node
/**
 * 합성이 끝난 App Store 스크린샷을 App Store Connect 에 올린다.
 *
 *   store/screenshots/composed/iphone/*.png  →  APP_IPHONE_67
 *   store/screenshots/composed/ipad/*.png    →  APP_IPAD_PRO_3GEN_129
 *
 * ASC 업로드는 3단계다. 하나라도 빠지면 이미지가 "처리 중"에서 멈춘다.
 *   1) POST /appScreenshots        업로드 예약 → uploadOperations(서명된 PUT 목록) 수령
 *   2) PUT  (각 operation)         바이너리를 조각내어 그대로 전송 (Authorization 헤더 없음)
 *   3) PATCH /appScreenshots/{id}  uploaded=true + sourceFileChecksum(MD5) 커밋
 * 그 뒤 assetDeliveryState 가 COMPLETE 가 될 때까지 확인한다.
 *
 * 사용법
 *   node scripts/upload-store-screenshots.mjs
 *   node scripts/upload-store-screenshots.mjs --device iphone
 *   node scripts/upload-store-screenshots.mjs --exclude ipad/01-home
 *   node scripts/upload-store-screenshots.mjs --dry-run
 *
 * 자격증명은 .env.release (ASC_ISSUER_ID / ASC_KEY_ID / ASC_KEY_PATH).
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { createSign, createHash } from 'node:crypto';
import { basename } from 'node:path';

const ASC = 'https://api.appstoreconnect.apple.com/v1';
const env = process.env;

const DISPLAY_TYPE = {
  iphone: 'APP_IPHONE_67',
  ipad: 'APP_IPAD_PRO_3GEN_129',
};

// 규격이 어긋난 채 올리면 ASC 가 처리 단계에서야 거부한다. 올리기 전에 막는다.
const EXPECTED_SIZE = {
  iphone: [1320, 2868],
  ipad: [2064, 2752],
};

// ─── .env.release ────────────────────────────────────────────────────────

function loadEnvFile(path = '.env.release') {
  if (!existsSync(path)) return;
  for (const raw of readFileSync(path, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[key] ??= value;
  }
}

const log = (m) => console.log(m);
const step = (m) => console.log(`\n▸ ${m}`);
const fail = (m) => { console.error(`\n✗ ${m}`); process.exit(1); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ─── ASC 인증 ────────────────────────────────────────────────────────────

function ascToken() {
  const keyId = env.ASC_KEY_ID;
  const issuerId = env.ASC_ISSUER_ID;
  const key = env.ASC_KEY_BASE64
    ? Buffer.from(env.ASC_KEY_BASE64, 'base64').toString('utf8')
    : env.ASC_KEY_PATH && existsSync(env.ASC_KEY_PATH)
      ? readFileSync(env.ASC_KEY_PATH, 'utf8')
      : null;

  const missing = [];
  if (!keyId) missing.push('ASC_KEY_ID');
  if (!issuerId) missing.push('ASC_ISSUER_ID');
  if (!key) missing.push('ASC_KEY_PATH(또는 ASC_KEY_BASE64)');
  if (missing.length) fail(`.env.release 에 다음 값이 없습니다: ${missing.join(', ')}`);

  const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const header = b64({ alg: 'ES256', kid: keyId, typ: 'JWT' });
  const payload = b64({ iss: issuerId, iat: now, exp: now + 900, aud: 'appstoreconnect-v1' });
  const signer = createSign('SHA256');
  signer.update(`${header}.${payload}`);
  // ES256 JWT 는 DER 이 아니라 raw R||S 서명을 요구한다.
  const sig = signer.sign({ key, dsaEncoding: 'ieee-p1363' }).toString('base64url');
  return `${header}.${payload}.${sig}`;
}

// 업로드가 길어지면 토큰이 만료되므로 만료 전에 새로 발급한다.
let cachedToken = null;
let cachedExpiry = 0;
function currentToken() {
  const now = Math.floor(Date.now() / 1000);
  if (!cachedToken || now >= cachedExpiry - 60) {
    cachedToken = ascToken();
    cachedExpiry = now + 900;
  }
  return cachedToken;
}

async function asc(path, { method = 'GET', body } = {}) {
  const res = await fetch(path.startsWith('http') ? path : `${ASC}${path}`, {
    method,
    headers: { Authorization: `Bearer ${currentToken()}`, 'Content-Type': 'application/json' },
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

// ─── PNG 헤더에서 크기 읽기 (규격 검증용) ────────────────────────────────

function pngSize(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) return null;
  return [buf.readUInt32BE(16), buf.readUInt32BE(20)];
}

// ─── 대상 찾기 ───────────────────────────────────────────────────────────

function appIdFromEasJson() {
  const easJson = JSON.parse(readFileSync('eas.json', 'utf8'));
  const id = easJson?.submit?.production?.ios?.ascAppId;
  if (!id) fail('eas.json 의 submit.production.ios.ascAppId 를 찾지 못했습니다.');
  return String(id);
}

/** 편집 가능한 버전(제출 전 상태)만 스크린샷을 바꿀 수 있다. */
const EDITABLE = new Set([
  'PREPARE_FOR_SUBMISSION', 'DEVELOPER_REJECTED', 'REJECTED',
  'METADATA_REJECTED', 'INVALID_BINARY', 'WAITING_FOR_REVIEW',
]);

async function findEditableVersion(appId) {
  const res = await asc(`/apps/${appId}/appStoreVersions?limit=10`);
  const version = res.data.find((v) => EDITABLE.has(v.attributes.appStoreState));
  if (!version) {
    const states = res.data.map((v) => `${v.attributes.versionString}=${v.attributes.appStoreState}`).join(', ');
    fail(`편집 가능한 버전이 없습니다. 현재: ${states}`);
  }
  return version;
}

async function findSet(localizationId, device) {
  const type = DISPLAY_TYPE[device];
  const sets = await asc(`/appStoreVersionLocalizations/${localizationId}/appScreenshotSets?limit=50`);
  const existing = sets.data.find((s) => s.attributes.screenshotDisplayType === type);
  if (existing) return existing.id;

  const created = await asc('/appScreenshotSets', {
    method: 'POST',
    body: {
      data: {
        type: 'appScreenshotSets',
        attributes: { screenshotDisplayType: type },
        relationships: {
          appStoreVersionLocalization: {
            data: { type: 'appStoreVersionLocalizations', id: localizationId },
          },
        },
      },
    },
  });
  return created.data.id;
}

// ─── 업로드 ──────────────────────────────────────────────────────────────

async function uploadOne(setId, file, device) {
  const buf = readFileSync(file);
  const name = basename(file);

  const size = pngSize(buf);
  const want = EXPECTED_SIZE[device];
  if (!size) fail(`${file} 은 PNG 가 아닙니다.`);
  if (size[0] !== want[0] || size[1] !== want[1]) {
    fail(`${file} 규격 불일치: ${size[0]}x${size[1]} (필요: ${want[0]}x${want[1]})`);
  }

  // 1) 예약 — Apple 이 서명된 PUT 목록을 돌려준다
  const reserved = await asc('/appScreenshots', {
    method: 'POST',
    body: {
      data: {
        type: 'appScreenshots',
        attributes: { fileName: name, fileSize: buf.length },
        relationships: { appScreenshotSet: { data: { type: 'appScreenshotSets', id: setId } } },
      },
    },
  });

  const id = reserved.data.id;
  const ops = reserved.data.attributes.uploadOperations ?? [];
  if (!ops.length) fail(`${name}: uploadOperations 가 비어 있습니다.`);

  // 2) 바이너리 PUT — 서명 URL 이므로 Authorization 을 붙이면 안 된다
  for (const op of ops) {
    const headers = Object.fromEntries((op.requestHeaders ?? []).map((h) => [h.name, h.value]));
    const chunk = buf.subarray(op.offset, op.offset + op.length);
    const res = await fetch(op.url, { method: op.method, headers, body: chunk });
    if (!res.ok) fail(`${name}: 업로드 PUT 실패 ${res.status} ${await res.text()}`);
  }

  // 3) 커밋 — 체크섬이 맞아야 Apple 이 처리에 들어간다
  const md5 = createHash('md5').update(buf).digest('hex');
  await asc(`/appScreenshots/${id}`, {
    method: 'PATCH',
    body: { data: { type: 'appScreenshots', id, attributes: { uploaded: true, sourceFileChecksum: md5 } } },
  });

  return { id, name, bytes: buf.length };
}

async function waitForComplete(id, name, { timeoutSeconds = 300 } = {}) {
  const deadline = Date.now() + timeoutSeconds * 1000;
  while (Date.now() < deadline) {
    const res = await asc(`/appScreenshots/${id}`);
    const state = res.data.attributes.assetDeliveryState;
    if (state?.state === 'COMPLETE') return 'COMPLETE';
    if (state?.state === 'FAILED') {
      fail(`${name}: 처리 실패 — ${JSON.stringify(state.errors ?? state.warnings)}`);
    }
    await sleep(3000);
  }
  fail(`${name}: ${timeoutSeconds}초 안에 COMPLETE 가 되지 않았습니다.`);
}

/** 업로드 순서와 무관하게 목록 순서를 파일명 순으로 못 박는다. */
async function setOrder(setId, ids) {
  await asc(`/appScreenshotSets/${setId}/relationships/appScreenshots`, {
    method: 'PATCH',
    body: { data: ids.map((id) => ({ type: 'appScreenshots', id })) },
  });
}

// ─── main ────────────────────────────────────────────────────────────────

async function main() {
  const argv = process.argv.slice(2);
  const arg = (n, d) => { const i = argv.indexOf(n); return i === -1 ? d : argv[i + 1]; };
  const device = arg('--device', 'both');
  const dir = arg('--in', 'store/screenshots/composed');
  const dryRun = argv.includes('--dry-run');
  const exclude = new Set(argv.flatMap((a, i) => (argv[i - 1] === '--exclude' ? [a] : [])));

  loadEnvFile();

  const appId = appIdFromEasJson();
  const devices = device === 'both' ? ['iphone', 'ipad'] : [device];

  step(`대상 앱 ${appId}`);
  const version = await findEditableVersion(appId);
  log(`  버전 ${version.attributes.versionString} (${version.attributes.appStoreState})`);

  const locs = await asc(`/appStoreVersions/${version.id}/appStoreVersionLocalizations?limit=20`);
  log(`  로컬라이제이션: ${locs.data.map((l) => l.attributes.locale).join(', ')}`);

  for (const loc of locs.data) {
    for (const dev of devices) {
      const files = readdirSync(`${dir}/${dev}`)
        .filter((f) => f.endsWith('.png'))
        .sort()
        .filter((f) => {
          const key = `${dev}/${f.replace(/\.png$/, '')}`;
          if (exclude.has(key)) { log(`  · ${key} — --exclude 로 건너뜀`); return false; }
          return true;
        });

      step(`${loc.attributes.locale} / ${dev} → ${DISPLAY_TYPE[dev]}  (${files.length}장)`);
      if (dryRun) { files.forEach((f) => log(`  [dry-run] ${dir}/${dev}/${f}`)); continue; }

      const setId = await findSet(loc.id, dev);

      // 기존 이미지는 지우고 새로 올린다(교체).
      const existing = await asc(`/appScreenshotSets/${setId}/appScreenshots?limit=50`);
      for (const shot of existing.data) {
        await asc(`/appScreenshots/${shot.id}`, { method: 'DELETE' });
        log(`  − 기존 ${shot.attributes.fileName ?? shot.id} 삭제`);
      }

      const uploaded = [];
      for (const f of files) {
        const r = await uploadOne(setId, `${dir}/${dev}/${f}`, dev);
        log(`  ↑ ${r.name}  ${(r.bytes / 1024 / 1024).toFixed(2)} MB  → 커밋 완료`);
        uploaded.push(r);
      }

      for (const r of uploaded) {
        const state = await waitForComplete(r.id, r.name);
        log(`  ✓ ${r.name}  ${state}`);
      }

      await setOrder(setId, uploaded.map((r) => r.id));
      log(`  ↳ 순서 고정: ${uploaded.map((r) => r.name).join(' → ')}`);
    }
  }

  log('\n완료.');
}

main().catch((e) => fail(e.stack ?? String(e)));
