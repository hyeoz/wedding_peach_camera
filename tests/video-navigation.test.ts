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

test('식단공유 경로는 홈 위에 식단공유 화면을 연다', () => {
  const state = getStateFromPath('diet', linking.config);
  assert.deepEqual(state?.routes.map(route => route.name), ['Home', 'DietShare']);
  assert.equal(state?.index, 1);
});

test('식단공유 경로는 format 쿼리로 게시글 비율을 고를 수 있다', () => {
  const state = getStateFromPath('diet?format=feed', linking.config);
  assert.deepEqual(state?.routes[1]?.params, { format: 'feed' });
});
