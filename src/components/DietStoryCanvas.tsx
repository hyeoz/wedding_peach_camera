import React from 'react';
import { Image, Platform, Pressable, StyleSheet, Text, View, type TextProps } from 'react-native';

/**
 * 식단공유 스토리 캔버스 (9:16, 에디토리얼 무드).
 *
 * 1080×1920 기준 px 로 디자인하고 실제 폭에 비례해 줄인다. 화면 미리보기와
 * 저장 캡처가 같은 트리를 쓰므로, 편집 힌트는 `exporting` 일 때만 감춘다.
 * 위 200px · 아래 230px 은 스토리의 프로필·답장 UI 에 가리므로 비워 둔다.
 */

/** 프레임 목록과 편집 화면에 보이는 템플릿 이름. */
export const DIET_TEMPLATE_NAME = '식단공유#1';

export type MealKey = 'breakfast' | 'lunch' | 'dinner';
export const MEAL_KEYS: MealKey[] = ['breakfast', 'lunch', 'dinner'];
export const MEAL_LABELS: Record<MealKey, string> = {
  breakfast: '아침',
  lunch: '점심',
  dinner: '저녁',
};

export type DietThemeKey = 'oat' | 'sage';

interface DietTheme {
  label: string;
  bg: string;
  paper: string;
  ink: string;
  sub: string;
  line: string;
}

export const DIET_THEMES: Record<DietThemeKey, DietTheme> = {
  oat: { label: '오트', bg: '#EFE8DF', paper: '#F7F3EE', ink: '#2F2A26', sub: '#8B8077', line: '#CFC4B8' },
  sage: { label: '세이지', bg: '#E6E8E0', paper: '#F4F4EF', ink: '#2B2E2A', sub: '#7E847A', line: '#C6CBBF' },
};

/** 캔버스 안에서 탭할 수 있는 칸. */
export type DietField =
  | { type: 'photo'; meal: MealKey }
  | { type: 'memo'; meal: MealKey }
  | { type: 'weight' }
  | { type: 'previous' }
  | { type: 'day' }
  | { type: 'date' }
  | { type: 'note' };

export interface DietStoryData {
  dateLabel: string;
  day: string;
  /** 표기용 몸무게 (`58.4`) — 비어 있으면 빈칸. */
  weight: string;
  /** 전날 대비 표기 (`− 0.3 kg`) — 비어 있으면 빈칸. */
  delta: string;
  photos: Record<MealKey, string | null>;
  memos: Record<MealKey, string>;
  /** 하단 한 문장 — 게시글 비율에서만 그린다. */
  note: string;
}

/** 스토리(9:16)·게시글(4:5). 같은 구성을 비율에 맞춰 여백·사진 비율만 바꾼다. */
export type DietFormat = 'story' | 'feed';

interface Layout {
  label: string;
  ratio: string;
  /** 결과 이미지 크기(px). */
  output: { width: number; height: number };
  /** 바탕 위 종이의 여백. 스토리는 위·아래 프로필/답장 UI 에 가리지 않게 넓게 둔다. */
  inset: { top: number; bottom: number; side: number };
  padTop: number;
  padSide: number;
  ruleGap: number;
  weightSize: number;
  photoAspect: number;
  showNote: boolean;
  footBottom: number;
}

export const DIET_FORMATS: Record<DietFormat, Layout> = {
  story: {
    label: '스토리',
    ratio: '9:16',
    output: { width: 1080, height: 1920 },
    inset: { top: 200, bottom: 230, side: 54 },
    padTop: 70,
    padSide: 64,
    ruleGap: 50,
    weightSize: 190,
    photoAspect: 9 / 16,
    showNote: false,
    footBottom: 46,
  },
  feed: {
    label: '게시글',
    ratio: '4:5',
    output: { width: 1080, height: 1350 },
    inset: { top: 44, bottom: 44, side: 44 },
    padTop: 58,
    padSide: 60,
    ruleGap: 40,
    weightSize: 168,
    photoAspect: 1,
    showNote: true,
    footBottom: 40,
  },
};

interface Props {
  data: DietStoryData;
  theme: DietThemeKey;
  format: DietFormat;
  width: number;
  /** 캡처 중이면 편집 힌트를 감춘다. */
  exporting?: boolean;
  onPressField?: (field: DietField) => void;
}

const BASE_WIDTH = 1080;

const SERIF = Platform.select({ ios: 'Didot', default: 'serif' });
const MEAL_EN: Record<MealKey, string> = { breakfast: 'breakfast', lunch: 'lunch', dinner: 'dinner' };

/** 캔버스 글자는 기기 글자 크기 설정과 무관하게 디자인 비율을 지킨다. */
function T(props: TextProps) {
  return <Text allowFontScaling={false} {...props} />;
}

export function DietStoryCanvas({ data, theme, format, width, exporting = false, onPressField }: Props) {
  const t = DIET_THEMES[theme];
  const L = DIET_FORMATS[format];
  const u = width / BASE_WIDTH;
  const px = (value: number) => value * u;
  const editing = !exporting && !!onPressField;
  const hint = (text: string) => (editing ? text : '');

  const tap = (field: DietField) => (editing ? () => onPressField?.(field) : undefined);

  const rule = <View style={{ height: Math.max(StyleSheet.hairlineWidth, px(1.5)), backgroundColor: t.line, marginVertical: px(L.ruleGap) }} />;
  const caps = { fontSize: px(24), letterSpacing: px(7), color: t.sub, fontWeight: '500' as const };

  return (
    <View style={{ width, height: (width * L.output.height) / L.output.width, backgroundColor: t.bg }}>
      <View
        style={{
          position: 'absolute',
          left: px(L.inset.side),
          right: px(L.inset.side),
          top: px(L.inset.top),
          bottom: px(L.inset.bottom),
          backgroundColor: t.paper,
          paddingTop: px(L.padTop),
          paddingHorizontal: px(L.padSide),
        }}
      >
        <View style={styles.rowBetween}>
          <T style={caps}>DAILY FOOD LOG</T>
          <Pressable onPress={tap({ type: 'day' })} hitSlop={px(20)}>
            <T style={caps}>{data.day ? `NO. ${data.day}` : hint('NO. __')}</T>
          </Pressable>
        </View>
        <Pressable onPress={tap({ type: 'date' })} hitSlop={px(10)} style={{ alignSelf: 'flex-start' }}>
          <T style={{ marginTop: px(34), fontFamily: SERIF, fontStyle: 'italic', fontSize: px(64), color: t.ink }}>
            {data.dateLabel}
          </T>
        </Pressable>

        {rule}

        <View style={[styles.rowBetween, { alignItems: 'flex-end' }]}>
          <Pressable onPress={tap({ type: 'weight' })} hitSlop={px(10)}>
            <T style={{ fontSize: px(22), letterSpacing: px(6), color: t.sub, fontWeight: '500', marginBottom: px(24) }}>
              MORNING WEIGHT
            </T>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
              <T
                style={{
                  fontFamily: SERIF,
                  fontSize: px(L.weightSize),
                  lineHeight: px(L.weightSize),
                  letterSpacing: px(-2),
                  color: data.weight ? t.ink : t.line,
                }}
              >
                {data.weight || (editing ? '00.0' : ' ')}
              </T>
              <T style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: px(48), color: t.ink, marginLeft: px(10), marginBottom: px(22) }}>
                kg
              </T>
            </View>
          </Pressable>
          <Pressable
            onPress={tap({ type: 'previous' })}
            style={{
              borderWidth: px(1.5),
              borderColor: data.delta ? t.ink : t.line,
              borderRadius: 999,
              paddingVertical: px(12),
              paddingHorizontal: px(28),
              marginBottom: px(30),
            }}
          >
            <T style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: px(36), color: data.delta ? t.ink : t.sub }}>
              {data.delta || '± _._ kg'} vs yesterday
            </T>
          </Pressable>
        </View>

        {rule}

        <View style={{ flexDirection: 'row', gap: px(22) }}>
          {MEAL_KEYS.map((meal, index) => {
            const uri = data.photos[meal];
            const memo = data.memos[meal];
            return (
              <View key={meal} style={{ flex: 1, minWidth: 0 }}>
                <Pressable
                  onPress={tap({ type: 'photo', meal })}
                  style={{
                    width: '100%',
                    aspectRatio: L.photoAspect,
                    borderWidth: uri ? 0 : px(1.5),
                    borderColor: t.line,
                    overflow: 'hidden',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {uri ? (
                    <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                  ) : editing ? (
                    <T style={{ fontSize: px(26), color: t.sub, textAlign: 'center', lineHeight: px(40) }}>
                      {'+\n'}
                      {MEAL_LABELS[meal]} 사진
                    </T>
                  ) : null}
                </Pressable>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: px(22), gap: px(12) }}>
                  <T style={{ fontSize: px(20), letterSpacing: px(3), color: t.sub }}>0{index + 1}</T>
                  <T style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: px(40), color: t.ink }}>
                    {MEAL_EN[meal]}
                  </T>
                </View>
                <Pressable onPress={tap({ type: 'memo', meal })} hitSlop={px(10)} style={{ minHeight: px(68), marginTop: px(10) }}>
                  <T style={{ fontSize: px(25), lineHeight: px(34), color: t.sub }} numberOfLines={2}>
                    {memo || hint('메뉴 입력')}
                  </T>
                </Pressable>
              </View>
            );
          })}
        </View>

        {L.showNote ? (
          <>
            <View style={{ height: px(1.5), backgroundColor: t.line, marginTop: px(8), marginBottom: px(32) }} />
            <Pressable onPress={tap({ type: 'note' })} hitSlop={px(10)}>
              <T style={{ textAlign: 'center', fontFamily: SERIF, fontStyle: 'italic', fontSize: px(40), color: t.ink }}>
                {'“ '}
                <T style={{ fontFamily: undefined, fontStyle: 'normal', fontSize: px(32), fontWeight: '300', color: data.note ? t.ink : t.sub }}>
                  {data.note || hint('한 문장 입력') || '            '}
                </T>
                {' ”'}
              </T>
            </Pressable>
          </>
        ) : null}

        <View style={[styles.rowBetween, { position: 'absolute', left: px(L.padSide), right: px(L.padSide), bottom: px(L.footBottom) }]}>
          <T style={[caps, { fontSize: px(18), letterSpacing: px(6) }]}>EAT WELL</T>
          <T style={[caps, { fontSize: px(18) }]}>·</T>
          <T style={[caps, { fontSize: px(18), letterSpacing: px(6) }]}>LIVE WELL</T>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
});
