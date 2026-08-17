import { spawnSync } from 'node:child_process';

const expectedOwner = 'hyeoz';
const expectedProject = '@hyeoz/wepicam';
const expectedProjectId = 'addf138b-49c9-4309-8d96-995b707bda2f';

function runEas(args) {
  const result = spawnSync('npx', ['--yes', 'eas-cli@22.0.0', ...args], {
    encoding: 'utf8',
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  if (result.status !== 0) {
    // EAS는 원인을 stdout에, 일반화된 실패 문구를 stderr에 나눠 쓰는 경우가 있다.
    // 하나만 출력하면 진짜 이유가 잘리므로 둘 다 보여준다.
    process.stderr.write([result.stdout, result.stderr].filter(Boolean).join("\n"));
    process.stderr.write("\n(실패한 명령: eas " + args.join(" ") + ")\n");
    process.exit(result.status ?? 1);
  }

  return result.stdout;
}

// EXPO_TOKEN 으로 인증하면 whoami 가 "hyeoz (authenticated using EXPO_TOKEN)" 를 출력한다.
// 괄호 주석을 떼어내야 계정명만 비교할 수 있다.
const signedInOwner = runEas(['whoami'])
  .split(/\r?\n/)
  .map((line) => line.trim())
  .find(Boolean)
  ?.replace(/\s*\(.*\)\s*$/, "");

if (signedInOwner !== expectedOwner) {
  console.error(
    `EAS account mismatch: expected ${expectedOwner}, but found ${signedInOwner ?? 'no login'}.`,
  );
  console.error('`eas login --browser` 로 hyeoz 계정에 로그인하거나, EXPO_TOKEN 을 설정하세요.');
  process.exit(1);
}

const projectInfo = runEas(['project:info']);
if (!projectInfo.includes(expectedProject) || !projectInfo.includes(expectedProjectId)) {
  console.error(`EAS project mismatch: expected ${expectedProject} (${expectedProjectId}).`);
  process.exit(1);
}

console.log(`EAS release target verified: ${expectedProject}`);
