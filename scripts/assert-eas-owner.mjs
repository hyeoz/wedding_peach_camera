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
    process.stderr.write(result.stderr || result.stdout);
    process.exit(result.status ?? 1);
  }

  return result.stdout;
}

const signedInOwner = runEas(['whoami'])
  .split(/\r?\n/)
  .map((line) => line.trim())
  .find(Boolean);

if (signedInOwner !== expectedOwner) {
  console.error(
    `EAS account mismatch: expected ${expectedOwner}, but found ${signedInOwner ?? 'no login'}.`,
  );
  console.error('Run `eas login --browser` and choose the hyeoz account before releasing.');
  process.exit(1);
}

const projectInfo = runEas(['project:info']);
if (!projectInfo.includes(expectedProject) || !projectInfo.includes(expectedProjectId)) {
  console.error(`EAS project mismatch: expected ${expectedProject} (${expectedProjectId}).`);
  process.exit(1);
}

console.log(`EAS release target verified: ${expectedProject}`);
