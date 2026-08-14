/**
 * 편집 세션 상태.
 * 4단계 플로우(모드 선택 → 오버레이 선택 → 촬영/불러오기 → 편집/저장)
 * 동안 선택한 값들을 전역으로 들고 다닌다.
 */
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

import type { OverlayAsset, OverlayMode, Photo } from '@/types';

interface SessionState {
  mode: OverlayMode | null;
  overlay: OverlayAsset | null;
  photo: Photo | null;
}

interface SessionContextValue extends SessionState {
  setMode: (mode: OverlayMode) => void;
  setOverlay: (overlay: OverlayAsset | null) => void;
  setPhoto: (photo: Photo | null) => void;
  /** 세션 초기화(처음 화면으로 돌아갈 때). */
  reset: () => void;
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

const initialState: SessionState = { mode: null, overlay: null, photo: null };

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<SessionState>(initialState);

  const setMode = useCallback((mode: OverlayMode) => {
    // 모드가 바뀌면 이전 오버레이는 무효화한다.
    setState((prev) => ({ ...prev, mode, overlay: null }));
  }, []);

  const setOverlay = useCallback((overlay: OverlayAsset | null) => {
    setState((prev) => ({ ...prev, overlay }));
  }, []);

  const setPhoto = useCallback((photo: Photo | null) => {
    setState((prev) => ({ ...prev, photo }));
  }, []);

  const reset = useCallback(() => setState(initialState), []);

  const value = useMemo<SessionContextValue>(
    () => ({ ...state, setMode, setOverlay, setPhoto, reset }),
    [state, setMode, setOverlay, setPhoto, reset],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return ctx;
}
