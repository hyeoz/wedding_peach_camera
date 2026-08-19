/**
 * 프레임 / 스티커 / 텍스트 라이브러리 통합 접근.
 *
 * 프레임/스티커는 사용자가 직접 이미지와 이름을 등록한다.
 * 등록 정보는 UserLibraryContext에서 로컬 저장소와 함께 관리한다.
 *
 * 텍스트 모드는 이미지가 아니라 textTemplates.ts의 JSON 템플릿을 사용한다.
 */
import type { ImageSourcePropType } from 'react-native';

import { TEXT_TEMPLATES, type TextVariant } from '@/data/textTemplates';

export type OverlayMode = 'frame' | 'sticker' | 'text';
/** 사용자가 직접 등록할 수 있는 모드. 세 모드 모두 등록형이다. */
export type UserLibraryMode = OverlayMode;
/** 이미지를 등록하는 모드 (텍스트는 이미지가 아니라 DSL 원문을 등록한다). */
export type ImageLibraryMode = Exclude<OverlayMode, 'text'>;

export interface LibraryItem {
  id: string;
  label: string;
  /** 플레이스홀더/썸네일 이모지. */
  emoji: string;
  /** 실제 이미지 (스티커/프레임). 없으면 플레이스홀더. */
  source?: ImageSourcePropType;
  /** 사용자가 등록해 앱 문서 디렉터리에 복사된 이미지 URI. */
  uri?: string;
  /** 텍스트 모드 전용 — 사용자가 입력한 템플릿 DSL 원문. */
  templateSource?: string;
  /** 텍스트 모드 전용 — 카드 배경색. */
  tint?: string;
  /** 텍스트 모드 전용 — 카드형/타임스탬프형. */
  variant?: TextVariant;
  /** 텍스트 모드 전용 — 타임스탬프 글자색. */
  stampColor?: string;
  /** 앱에 내장된 항목이면 true. 내장 항목은 삭제할 수 없다. */
  builtIn?: boolean;
}

/** 화면 상단 타이틀. */
export function modeTitle(mode: OverlayMode): string {
  return mode === 'frame' ? '프레임 선택' : mode === 'sticker' ? '스티커 선택' : '텍스트 선택';
}

export function modeLabel(mode: OverlayMode): string {
  return mode === 'frame' ? '프레임' : mode === 'sticker' ? '스티커' : '텍스트';
}

/** 앱에 내장된 항목. 프레임/스티커는 사용자 등록형이므로 텍스트만 내장한다. */
export function getBuiltInItems(mode: OverlayMode): LibraryItem[] {
  if (mode !== 'text') return [];
  return TEXT_TEMPLATES.map((t) => ({
    id: t.id,
    label: t.label,
    emoji: t.emoji,
    builtIn: true,
  }));
}

export function sourceForItem(item: LibraryItem | undefined): ImageSourcePropType | undefined {
  return item?.source ?? (item?.uri ? { uri: item.uri } : undefined);
}
