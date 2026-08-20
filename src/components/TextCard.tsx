import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  TOKEN_DATE,
  TOKEN_NICKNAME,
  TOKEN_SHOT_DATE,
  TOKEN_SHOT_DATETIME,
  TOKEN_SHOT_FILM,
  TOKEN_SHOT_TIME,
} from '@/data/textTemplateParser';
import { DEFAULT_STAMP_COLOR, type TextTemplate } from '@/data/textTemplates';
import { todayLabel } from '@/utils/date';
import {
  formatShotDate,
  formatShotDateTime,
  formatShotFilm,
  formatShotTime,
} from '@/utils/exif';
import { fonts, radius, useTheme, type ThemeColors } from '@/theme';

interface TextCardProps {
  template: TextTemplate;
  nickname: string;
  /** 사진 촬영 일시(epoch ms). 없으면 현재 시각으로 대체한다. */
  takenAt?: number;
  choices: Record<string, string>;
  notes: Record<string, string>;
  /** 편집 가능(선택된 카드) 여부. */
  editable?: boolean;
  /**
   * 카드 전체 배율. 글자 크기·여백·테두리를 모두 곱해 **다시 레이아웃**한다.
   * transform scale 과 달리 확대해도 글자가 뭉개지지 않아, 원본 해상도로 합성할 때
   * 이 값만 키우면 그대로 선명해진다.
   */
  sizeScale?: number;
  onToggleChoice?: (lineKey: string, option: string) => void;
  onEditNote?: (lineKey: string) => void;
}

/**
 * 사진 위에 붙는 다이어리 텍스트 카드 (귀여운 Gaegu 폰트).
 * 헤더: "{닉네임}님의 {오늘 날짜}", 각 줄은 good/bad 토글 또는 자유 메모.
 */
export function TextCard({
  template,
  nickname,
  takenAt,
  choices,
  notes,
  editable = false,
  sizeScale = 1,
  onToggleChoice,
  onEditNote,
}: TextCardProps) {
  const colors = useTheme();
  const styles = useMemo(() => makeStyles(colors, sizeScale), [colors, sizeScale]);

  // 촬영 시각을 못 받은 경우(등록 미리보기 등)에는 현재 시각으로 보여준다.
  const shotMs = takenAt ?? Date.now();

  // 토큰은 여러 번 써도 모두 치환되도록 전역 치환한다.
  const header = template.headerTemplate
    .replaceAll(TOKEN_NICKNAME, nickname || 'OOO')
    .replaceAll(TOKEN_DATE, todayLabel())
    .replaceAll(TOKEN_SHOT_DATETIME, formatShotDateTime(shotMs))
    .replaceAll(TOKEN_SHOT_DATE, formatShotDate(shotMs))
    .replaceAll(TOKEN_SHOT_TIME, formatShotTime(shotMs))
    .replaceAll(TOKEN_SHOT_FILM, formatShotFilm(shotMs));

  // 타임스탬프는 카드 장식 없이 글자만 얹는다.
  if (template.variant === 'stamp') {
    return (
      <View style={styles.stampWrap}>
        <Text style={[styles.stampText, { color: template.stampColor || DEFAULT_STAMP_COLOR }]}>
          {header}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: template.tint || colors.tintPink }]}>
      <Text style={styles.header}>
        {template.emoji} {header}
      </Text>

      {template.lines.length > 0 ? <View style={styles.divider} /> : null}

      {template.lines.map((line) => (
        <View key={line.key} style={styles.line}>
          {line.type === 'static' ? null : <Text style={styles.check}>✓</Text>}
          <Text style={styles.label}>{line.label}</Text>

          {line.type === 'static' ? null : line.type === 'choice' ? (
            <View style={styles.options}>
              {line.options?.map((opt, i) => {
                const selected = choices[line.key] === opt;
                return (
                  <React.Fragment key={opt}>
                    {i > 0 ? <Text style={styles.slash}>/</Text> : null}
                    <Pressable
                      disabled={!editable}
                      onPress={() => onToggleChoice?.(line.key, opt)}
                      hitSlop={4}
                    >
                      <Text style={[styles.option, selected && styles.optionOn]}>{opt}</Text>
                    </Pressable>
                  </React.Fragment>
                );
              })}
            </View>
          ) : (
            <Pressable
              disabled={!editable}
              onPress={() => onEditNote?.(line.key)}
              style={styles.noteWrap}
              hitSlop={4}
            >
              <Text style={[styles.note, !notes[line.key] && styles.notePlaceholder]}>
                {notes[line.key] || (editable ? '탭해서 입력' : '—')}
              </Text>
            </Pressable>
          )}
        </View>
      ))}
    </View>
  );
}

/**
 * `s` 는 카드 배율. 모든 치수에 곱해 레이아웃 자체를 키운다.
 * 색상·정렬처럼 크기와 무관한 값은 그대로 둔다.
 */
const makeStyles = (colors: ThemeColors, s: number) =>
  StyleSheet.create({
  /**
   * 필름 카메라 날짜 각인 느낌.
   * 배경·테두리 없이 글자만 올리고, 어떤 사진 위에서도 읽히도록 발광을 준다.
   */
  stampWrap: {
    paddingHorizontal: 6 * s,
    paddingVertical: 2 * s,
  },
  stampText: {
    fontFamily: fonts.body,
    fontSize: 17 * s,
    letterSpacing: 1.2 * s,
    textShadowColor: 'rgba(255, 96, 0, 0.55)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 7 * s,
  },
  card: {
    minWidth: 200 * s,
    maxWidth: 260 * s,
    borderRadius: radius.thumb * s,
    paddingVertical: 12 * s,
    paddingHorizontal: 14 * s,
    borderWidth: 1.5 * s,
    borderColor: colors.border,
  },
  header: {
    fontFamily: fonts.cute,
    fontSize: 18 * s,
    color: colors.primaryDeep,
  },
  divider: {
    height: 1.5 * s,
    backgroundColor: colors.border,
    marginVertical: 8 * s,
    borderRadius: 1 * s,
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4 * s,
    flexWrap: 'wrap',
  },
  check: {
    fontFamily: fonts.cute,
    fontSize: 15 * s,
    color: colors.primary,
    marginRight: 4 * s,
  },
  label: {
    fontFamily: fonts.cute,
    fontSize: 16 * s,
    color: colors.text,
    marginRight: 6 * s,
  },
  options: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  slash: {
    fontFamily: fonts.cute,
    fontSize: 15 * s,
    color: colors.textMuted,
    marginHorizontal: 4 * s,
  },
  option: {
    fontFamily: fonts.cute,
    fontSize: 16 * s,
    color: colors.textMuted,
  },
  optionOn: {
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  noteWrap: {
    flex: 1,
    minWidth: 80 * s,
  },
  note: {
    fontFamily: fonts.cute,
    fontSize: 16 * s,
    color: colors.text,
  },
  notePlaceholder: {
    color: colors.textMuted,
  },
});
