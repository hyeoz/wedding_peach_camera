/**
 * 편집 캔버스 크기 계산.
 * 사진이 잘리지 않게(fitInside) / 프레임이 캔버스를 덮게(coverFraction) 하는 부분이다.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { coverFraction, fitInside } from '@/utils/layout';

describe('fitInside', () => {
  it('비율이 같으면 영역을 그대로 채운다', () => {
    assert.deepEqual(fitInside({ width: 300, height: 400 }, 3 / 4), { width: 300, height: 400 });
  });

  it('가로로 넉넉하면 높이에 맞춘다', () => {
    assert.deepEqual(fitInside({ width: 800, height: 400 }, 1), { width: 400, height: 400 });
  });

  it('세로로 넉넉하면 폭에 맞춘다', () => {
    assert.deepEqual(fitInside({ width: 300, height: 900 }, 1), { width: 300, height: 300 });
  });

  it('결과는 항상 영역 안에 들어가고 비율을 지킨다', () => {
    for (const aspect of [0.4, 0.75, 1, 1.5, 2.5]) {
      const area = { width: 375, height: 520 };
      const size = fitInside(area, aspect);
      assert.ok(size, '계산 결과가 있어야 한다');
      assert.ok(size.width <= area.width + 1e-9 && size.height <= area.height + 1e-9);
      assert.ok(Math.abs(size.width / size.height - aspect) < 1e-9);
    }
  });

  it('계산할 수 없으면 null', () => {
    assert.equal(fitInside({ width: 0, height: 10 }, 1), null);
    assert.equal(fitInside({ width: 10, height: 0 }, 1), null);
    assert.equal(fitInside({ width: 10, height: 10 }, null), null);
    assert.equal(fitInside({ width: 10, height: 10 }, 0), null);
  });
});

describe('coverFraction', () => {
  it('가로가 긴 캔버스 + 정사각 프레임 → 세로가 넘친다', () => {
    assert.deepEqual(coverFraction(2, 1), { width: 1, height: 2 });
  });

  it('정사각 캔버스 + 가로가 긴 프레임 → 가로가 넘친다', () => {
    assert.deepEqual(coverFraction(1, 2), { width: 2, height: 1 });
  });

  it('비율이 같으면 딱 맞는다', () => {
    assert.deepEqual(coverFraction(0.75, 0.75), { width: 1, height: 1 });
  });

  it('항상 캔버스를 덮으면서 프레임 원본 비율을 지킨다', () => {
    for (const canvas of [0.5, 0.75, 1, 1.5, 2.2]) {
      for (const frame of [0.4, 0.75, 1, 1.9, 3]) {
        const r = coverFraction(canvas, frame);
        assert.ok(r.width >= 1 - 1e-9 && r.height >= 1 - 1e-9, `덮지 못함 ${canvas}/${frame}`);
        assert.ok(
          Math.abs((r.width * canvas) / r.height - frame) < 1e-9,
          `비율이 찌그러짐 ${canvas}/${frame}`,
        );
      }
    }
  });

  it('캔버스 크기와 무관하다 (회전·원본 해상도 합성에서 같은 값이어야 한다)', () => {
    assert.deepEqual(coverFraction(0.75, 1.5), coverFraction(0.75, 1.5));
  });

  it('값이 이상하면 1:1 로 물러선다', () => {
    assert.deepEqual(coverFraction(0, 1), { width: 1, height: 1 });
    assert.deepEqual(coverFraction(1, 0), { width: 1, height: 1 });
  });
});
