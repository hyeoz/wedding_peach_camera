import assert from 'node:assert/strict';
import test from 'node:test';
import { getActionFromState, getStateFromPath } from '@react-navigation/core';
import { linking } from '../src/navigation/linking';

test('단축어 경로는 홈으로 돌아갈 수 있는 동영상 화면을 연다', () => {
  assert.deepEqual(linking.prefixes, ['wepicam://']);
  const state = getStateFromPath('video', linking.config);
  assert.deepEqual(state?.routes.map(route => route.name), ['Home', 'VideoCapture']);
  assert.equal(state?.index, 1);
  const action = getActionFromState(state!, linking.config);
  assert.equal(action?.type, 'NAVIGATE');
  assert.equal((action?.payload as { name: string }).name, 'VideoCapture');
});

test('미지원 경로로 동영상 촬영을 실행하지 않는다', () => {
  assert.equal(getStateFromPath('unknown', linking.config), undefined);
});
