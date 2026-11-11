/**
 * 개발 전용 — 딥링크로 특정 화면에 데모 상태로 바로 진입한다.
 *
 * App Store 스크린샷을 시뮬레이터에서 찍을 때, 탭을 주입할 수 없는 환경(원격
 * 세션 등)에서도 각 화면에 도달할 수 있어야 한다. 그래서 화면 전환·상태 시드를
 * 딥링크 하나로 처리한다.
 *
 *   xcrun simctl openurl booted "wepicam://demo?screen=edit"
 *
 * screen 값
 *   home    홈 (모드 카드)
 *   select  프레임 선택 그리드
 *   edit    편집 — 사진 + 스티커 배치 (frame=1 이면 프레임까지 얹는다)
 *   text    편집 — 텍스트 카드 (template 로 템플릿 지정, 기본 타임스탬프)
 *   result  완성 화면 (dev-demo/result.jpg 를 결과 이미지로 사용)
 *
 * 데모 자산은 앱 문서 디렉터리의 dev-demo/ 에서 읽는다 (scripts/seed-demo-simulator.py
 * 가 시뮬레이터에 넣어 준다). 앱 번들에는 데모 이미지가 들어가지 않는다.
 *
 * ── 릴리스 격리 ────────────────────────────────────────────────────────
 * 이 파일은 RootNavigator 에서 `__DEV__ ? require(...) : null` 로만 불린다.
 * 릴리스 번들에서는 __DEV__ 가 false 로 상수 접힘 → require 자체가 제거되어
 * 이 모듈이 번들에 들어가지 않는다. 아래 DEV_ONLY_MARKER 로 검증할 수 있다:
 *
 *   npx expo export -p ios && grep -r "WEPICAM_DEV_DEMO_LAUNCHER" dist/
 *   (릴리스 번들에서 아무것도 안 나와야 정상)
 */
import { useEffect } from 'react';
import { Linking } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

import { useSession } from '@/context/SessionContext';
import { navigationRef } from '@/navigation/navigationRef';
import type { RootStackParamList } from '@/navigation/types';

/** 릴리스 번들에 이 모듈이 새어 들어갔는지 검사하는 표식. */
export const DEV_ONLY_MARKER = 'WEPICAM_DEV_DEMO_LAUNCHER';

/** 데모 자산 폴더. seed-demo-simulator.py 가 여기에 파일을 넣는다. */
const DEMO_DIR = `${FileSystem.documentDirectory ?? ''}dev-demo/`;

/** 시드된 라이브러리 항목 id (seed-demo-simulator.py 와 맞춰야 한다). */
const DEMO_FRAME_ID = 'frame-demo-1';
const DEMO_STICKER_IDS = ['sticker-demo-1', 'sticker-demo-2', 'sticker-demo-3'];

/** 스크린샷이 매번 같게 나오도록 촬영 시각을 고정한다. */
const DEMO_TAKEN_AT = new Date(2026, 4, 18, 15, 24, 8).getTime();

/** 데모 사진 크기 (seed 스크립트가 만드는 것과 같아야 한다). */
const DEMO_PHOTO = { width: 3024, height: 4032 };

interface DemoParams {
  screen: string;
  frame: boolean;
  template: string;
}

function parseDemoUrl(url: string): DemoParams | null {
  if (!url.includes('demo')) return null;
  const query = url.split('?')[1] ?? '';
  const params: Record<string, string> = {};
  for (const pair of query.split('&')) {
    const [key, value] = pair.split('=');
    if (key) params[decodeURIComponent(key)] = decodeURIComponent(value ?? '');
  }
  if (!params.screen) return null;
  return {
    screen: params.screen,
    frame: params.frame === '1',
    template: params.template || 't4',
  };
}

/** 홈을 아래에 깔고 목적지를 얹어, 뒤로가기가 자연스럽게 동작하게 한다. */
function go(screen: keyof RootStackParamList) {
  if (!navigationRef.isReady()) return;
  if (screen === 'Home') {
    navigationRef.reset({ index: 0, routes: [{ name: 'Home' }] });
    return;
  }
  navigationRef.reset({ index: 1, routes: [{ name: 'Home' }, { name: screen }] });
}

export function DemoLauncher() {
  const {
    setMode,
    selectFrame,
    toggleItemChoice,
    setPhoto,
    setResultUri,
    addPlacedItem,
    clearPlacedItems,
  } = useSession();

  useEffect(() => {
    const apply = (rawUrl: string | null) => {
      if (!rawUrl) return;
      const params = parseDemoUrl(rawUrl);
      if (!params) return;

      const photo = {
        uri: `${DEMO_DIR}photo.jpg`,
        width: DEMO_PHOTO.width,
        height: DEMO_PHOTO.height,
        takenAt: DEMO_TAKEN_AT,
        takenAtSource: 'exif' as const,
      };

      clearPlacedItems();

      switch (params.screen) {
        case 'home':
          go('Home');
          break;

        case 'select':
          setMode('frame');
          selectFrame(DEMO_FRAME_ID);
          go('Select');
          break;

        case 'edit': {
          setMode('sticker');
          DEMO_STICKER_IDS.forEach((id) => toggleItemChoice(id));
          setPhoto(photo);
          // kind 를 직접 넘긴다. setMode 가 반영되기 전이라 mode 로는 판별할 수 없다.
          if (params.frame) {
            selectFrame(DEMO_FRAME_ID);
            addPlacedItem(DEMO_FRAME_ID, { kind: 'frame', x: 0, y: 0, scale: 1, rotation: 0 });
          }
          addPlacedItem(DEMO_STICKER_IDS[0], { kind: 'sticker', x: 0.12, y: 0.09, scale: 1.5, rotation: -12 });
          addPlacedItem(DEMO_STICKER_IDS[1], { kind: 'sticker', x: 0.63, y: 0.62, scale: 1.2, rotation: 9 });
          addPlacedItem(DEMO_STICKER_IDS[2], { kind: 'sticker', x: 0.36, y: 0.33, scale: 1.8, rotation: 0 });
          go('Edit');
          break;
        }

        case 'text': {
          setMode('text');
          toggleItemChoice(params.template);
          setPhoto(photo);
          addPlacedItem(params.template, {
            kind: 'text',
            x: 0.08,
            y: 0.66,
            scale: 1,
            rotation: -2,
            choices: { diet: 'good', workout: 'good', mood: 'good' },
            notes: { note: '오늘도 예쁘게', memo: '오늘도 예쁘게' },
          });
          addPlacedItem('t4', { kind: 'text', x: 0.42, y: 0.14, scale: 1, rotation: 0 });
          go('Edit');
          break;
        }

        case 'result':
          setResultUri(`${DEMO_DIR}result.jpg`);
          go('Result');
          break;

        default:
          break;
      }
    };

    Linking.getInitialURL().then(apply).catch(() => {});
    const subscription = Linking.addEventListener('url', ({ url }) => apply(url));
    return () => subscription.remove();
  }, [
    setMode,
    selectFrame,
    toggleItemChoice,
    setPhoto,
    setResultUri,
    addPlacedItem,
    clearPlacedItems,
  ]);

  return null;
}
