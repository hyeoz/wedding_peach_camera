import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { TextTemplate } from '@/data/textTemplates';
import { todayLabel } from '@/utils/date';
import { colors, fonts, radius } from '@/theme';

interface TextCardProps {
  template: TextTemplate;
  nickname: string;
  choices: Record<string, string>;
  notes: Record<string, string>;
  /** 편집 가능(선택된 카드) 여부. */
  editable?: boolean;
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
  choices,
  notes,
  editable = false,
  onToggleChoice,
  onEditNote,
}: TextCardProps) {
  const header = template.headerTemplate
    .replace('{nickname}', nickname || 'OOO')
    .replace('{date}', todayLabel());

  return (
    <View style={[styles.card, { backgroundColor: template.tint }]}>
      <Text style={styles.header}>
        {template.emoji} {header}
      </Text>

      {template.lines.length > 0 ? <View style={styles.divider} /> : null}

      {template.lines.map((line) => (
        <View key={line.key} style={styles.line}>
          <Text style={styles.check}>✓</Text>
          <Text style={styles.label}>{line.label}</Text>

          {line.type === 'choice' ? (
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

const styles = StyleSheet.create({
  card: {
    minWidth: 200,
    maxWidth: 260,
    borderRadius: radius.thumb,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  header: {
    fontFamily: fonts.cute,
    fontSize: 18,
    color: colors.primaryDeep,
  },
  divider: {
    height: 1.5,
    backgroundColor: colors.border,
    marginVertical: 8,
    borderRadius: 1,
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    flexWrap: 'wrap',
  },
  check: {
    fontFamily: fonts.cute,
    fontSize: 15,
    color: colors.primary,
    marginRight: 4,
  },
  label: {
    fontFamily: fonts.cute,
    fontSize: 16,
    color: colors.text,
    marginRight: 6,
  },
  options: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  slash: {
    fontFamily: fonts.cute,
    fontSize: 15,
    color: colors.textMuted,
    marginHorizontal: 4,
  },
  option: {
    fontFamily: fonts.cute,
    fontSize: 16,
    color: colors.textMuted,
  },
  optionOn: {
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  noteWrap: {
    flex: 1,
    minWidth: 80,
  },
  note: {
    fontFamily: fonts.cute,
    fontSize: 16,
    color: colors.text,
  },
  notePlaceholder: {
    color: colors.textMuted,
  },
});
