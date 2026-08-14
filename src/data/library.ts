/**
 * 프레임 / 스티커 / 텍스트 라이브러리 통합 접근.
 *
 * 실제 에셋(투명 PNG)은 아직 플레이스홀더다. 준비되면 assets/frames,
 * assets/stickers 에 넣고 각 항목의 `source`에 require(...)를 채우면
 * 썸네일/편집/결과 화면에 자동으로 실제 이미지가 사용된다.
 * source가 없으면 라벨 + 이모지 플레이스홀더 타일이 렌더된다.
 *
 * 텍스트 모드는 이미지가 아니라 textTemplates.ts의 JSON 템플릿을 사용한다.
 */
import type { ImageSourcePropType } from 'react-native';

import { TEXT_TEMPLATES } from '@/data/textTemplates';

export type OverlayMode = 'frame' | 'sticker' | 'text';

export interface LibraryItem {
  id: string;
  label: string;
  /** 플레이스홀더/썸네일 이모지. */
  emoji: string;
  /** 실제 이미지 (스티커/프레임). 없으면 플레이스홀더. */
  source?: ImageSourcePropType;
}

export const FRAME_LIB: LibraryItem[] = [
  { id: 'f1', label: '청첩장 프레임', emoji: '💌' },
  { id: 'f2', label: '필름 감성', emoji: '🎞️' },
  { id: 'f3', label: '화이트 보더', emoji: '⬜' },
  { id: 'f4', label: '러블리 하트', emoji: '💕' },
  { id: 'f5', label: '심플 라운드', emoji: '🔲' },
  { id: 'f6', label: '골드라인', emoji: '✨' },
];

export const STICKER_LIB: LibraryItem[] = [
  { id: 's1', label: '하트', emoji: '❤️' },
  { id: 's2', label: '리본', emoji: '🎀' },
  { id: 's3', label: '부케꽃', emoji: '💐' },
  { id: 's4', label: '반지', emoji: '💍' },
  { id: 's5', label: '축하해요', emoji: '🎉' },
  { id: 's6', label: '별', emoji: '⭐' },
  { id: 's7', label: '왕관', emoji: '👑' },
  { id: 's8', label: '체리', emoji: '🍒' },
];

/** 화면 상단 타이틀. */
export function modeTitle(mode: OverlayMode): string {
  return mode === 'frame' ? '프레임 선택' : mode === 'sticker' ? '스티커 선택' : '텍스트 선택';
}

export function modeLabel(mode: OverlayMode): string {
  return mode === 'frame' ? '프레임' : mode === 'sticker' ? '스티커' : '텍스트';
}

/** 선택 그리드에 표시할 공통 형태의 항목들. */
export function getSelectableItems(mode: OverlayMode): LibraryItem[] {
  if (mode === 'frame') return FRAME_LIB;
  if (mode === 'sticker') return STICKER_LIB;
  return TEXT_TEMPLATES.map((t) => ({ id: t.id, label: t.label, emoji: t.emoji }));
}

export function findSelectable(mode: OverlayMode, id: string): LibraryItem | undefined {
  return getSelectableItems(mode).find((it) => it.id === id);
}

/** 이미지 스티커 조회 (배치 스티커는 항상 스티커 라이브러리에서 찾는다). */
export function findSticker(id: string): LibraryItem | undefined {
  return STICKER_LIB.find((it) => it.id === id);
}

export function findFrame(id: string): LibraryItem | undefined {
  return FRAME_LIB.find((it) => it.id === id);
}
