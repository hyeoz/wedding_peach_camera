/**
 * 프로필 이모지 → 테마 팔레트 매핑.
 * 이모지를 새로 추가하면서 매핑을 빠뜨리면 조용히 기본 팔레트로 떨어지므로,
 * 목록과 매핑이 어긋나지 않는지 여기서 잡는다.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  DEFAULT_PALETTE,
  EMOJI_PALETTE,
  PALETTES,
  paletteForEmoji,
  type Palette,
} from '@/theme/palettes';

const PALETTE_KEYS: (keyof Palette)[] = [
  'gradient',
  'primary',
  'primaryDeep',
  'primaryDeeper',
  'primaryBadge',
  'secondary',
  'secondaryDeep',
  'text',
  'textMuted',
  'tintPink',
  'tintPurple',
  'border',
];

describe('EMOJI_PALETTE', () => {
  it('매핑된 팔레트 이름이 모두 실재한다', () => {
    for (const [emoji, name] of Object.entries(EMOJI_PALETTE)) {
      assert.ok(name in PALETTES, `${emoji} → ${name} 팔레트가 없다`);
    }
  });

  it('매핑이 비어 있지 않다', () => {
    assert.ok(Object.keys(EMOJI_PALETTE).length >= 20);
  });

  it('기본 팔레트가 실재한다', () => {
    assert.ok(DEFAULT_PALETTE in PALETTES);
  });
});

describe('PALETTES', () => {
  it('모든 팔레트가 같은 토큰을 빠짐없이 채운다', () => {
    for (const [name, palette] of Object.entries(PALETTES)) {
      for (const key of PALETTE_KEYS) {
        assert.ok(palette[key], `${name} 팔레트에 ${key} 가 없다`);
      }
    }
  });

  it('그라디언트는 색 3개다 (LinearGradient locations 가 [0,0.45,1] 고정)', () => {
    for (const [name, palette] of Object.entries(PALETTES)) {
      assert.equal(palette.gradient.length, 3, `${name} 그라디언트 색 수`);
    }
  });

  it('색상 값은 모두 hex 표기다', () => {
    for (const [name, palette] of Object.entries(PALETTES)) {
      for (const key of PALETTE_KEYS) {
        const value = palette[key];
        const values = Array.isArray(value) ? value : [value];
        for (const v of values) {
          assert.match(v as string, /^#[0-9a-fA-F]{3,8}$/, `${name}.${key} = ${v}`);
        }
      }
    }
  });
});

describe('paletteForEmoji', () => {
  it('매핑된 이모지는 그 팔레트를 돌려준다', () => {
    for (const [emoji, name] of Object.entries(EMOJI_PALETTE)) {
      assert.equal(paletteForEmoji(emoji), PALETTES[name], `${emoji}`);
    }
  });

  it('모르는 이모지·빈 문자열은 기본 팔레트', () => {
    assert.equal(paletteForEmoji('🛸'), PALETTES[DEFAULT_PALETTE]);
    assert.equal(paletteForEmoji(''), PALETTES[DEFAULT_PALETTE]);
  });

  it('항상 팔레트를 돌려준다 (undefined 로 앱이 죽지 않게)', () => {
    for (const emoji of ['🍑', '🤖', '없는거', '']) {
      assert.ok(paletteForEmoji(emoji)?.primary);
    }
  });
});
