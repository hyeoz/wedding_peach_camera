/**
 * 프로필(계정) 컨텍스트.
 * 닉네임 + 이모지 아바타를 로컬(AsyncStorage)에 저장해 계정처럼 사용한다.
 * 텍스트 카드의 "{nickname}님의 ..." 헤더에도 사용된다.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

const KEY = '@wpc/profile/v1';

export interface Profile {
  nickname: string;
  emoji: string;
}

const DEFAULT_PROFILE: Profile = { nickname: '', emoji: '🍑' };

/** 아바타로 고를 수 있는 이모지 목록. */
export const PROFILE_EMOJIS = [
  '🍑', '🐰', '🐱', '🐻', '🌸', '🎀', '⭐', '🍒',
  '🦄', '👾', '🌷', '🐣', '🍓', '🐧', '💦', '🌈',
  '🧸', '💐', '👑', '🤖',
];

interface ProfileContextValue {
  profile: Profile;
  /** AsyncStorage 로드 완료 여부. */
  ready: boolean;
  /** 닉네임이 설정되어 있는지. */
  hasProfile: boolean;
  saveProfile: (profile: Profile) => Promise<void>;
}

const ProfileContext = createContext<ProfileContextValue | undefined>(undefined);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<Profile>;
          setProfile({
            nickname: parsed.nickname ?? '',
            emoji: parsed.emoji || DEFAULT_PROFILE.emoji,
          });
        }
      } catch {
        // 무시하고 기본값 사용.
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const saveProfile = useCallback(async (next: Profile) => {
    const normalized: Profile = {
      nickname: next.nickname.trim(),
      emoji: next.emoji || DEFAULT_PROFILE.emoji,
    };
    setProfile(normalized);
    try {
      await AsyncStorage.setItem(KEY, JSON.stringify(normalized));
    } catch {
      // 저장 실패는 조용히 무시.
    }
  }, []);

  const value = useMemo<ProfileContextValue>(
    () => ({
      profile,
      ready,
      hasProfile: profile.nickname.trim().length > 0,
      saveProfile,
    }),
    [profile, ready, saveProfile],
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile must be used within a ProfileProvider');
  return ctx;
}
