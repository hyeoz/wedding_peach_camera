import assert from 'node:assert/strict';
import test from 'node:test';

import { clampCameraZoom, formatRecordingTime } from '../src/utils/video';

test('카메라 줌 값을 지원 범위로 제한한다', () => {
  assert.equal(clampCameraZoom(-0.2), 0);
  assert.equal(clampCameraZoom(0.45), 0.45);
  assert.equal(clampCameraZoom(1.4), 1);
});

test('녹화 시간을 카메라 타이머 형식으로 표시한다', () => {
  assert.equal(formatRecordingTime(0), '00:00');
  assert.equal(formatRecordingTime(65), '01:05');
  assert.equal(formatRecordingTime(3661), '01:01:01');
});
