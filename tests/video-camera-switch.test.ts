import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import { URL } from 'node:url';
import ts from 'typescript';

// iOS 이벤트 계약을 모사한다. facing 속성 변경에는 ready 이벤트가 없고,
// React key가 바뀌어 새 카메라가 마운트된 경우에만 ready 이벤트가 온다.
test('후면→전면→후면 전환마다 새 카메라의 준비 완료 후 녹화를 허용한다', async () => {
  const values: any[] = [];
  let cursor = 0;
  let recordCalls = 0;
  const camera = { recordAsync: async () => { recordCalls++; return { uri: 'file:///test.mov' }; } };
  const hooks = {
    useState(initial: any) {
      const i = cursor++;
      if (!(i in values)) values[i] = initial;
      return [values[i], (next: any) => { values[i] = typeof next === 'function' ? next(values[i]) : next; }];
    },
    useRef(initial: any) {
      const i = cursor++;
      if (!(i in values)) values[i] = { current: initial };
      return values[i];
    },
    useMemo: (factory: () => any) => factory(),
    useEffect: () => {},
  };
  const gesture: any = {};
  for (const method of ['runOnJS', 'onBegin', 'onUpdate']) gesture[method] = () => gesture;
  const jsx = (type: any, props: any, key: any) => ({ type, props, key });
  const mocks: Record<string, any> = {
    react: hooks,
    'react/jsx-runtime': { jsx, jsxs: jsx },
    '@react-navigation/native': { useIsFocused: () => true },
    'expo-camera': { CameraView: 'CameraView', useCameraPermissions: () => [{ granted: true }, () => {}] },
    'react-native': { View: 'View', Text: 'Text', Pressable: 'Pressable', ActivityIndicator: 'ActivityIndicator', StyleSheet: { create: (x: any) => x, absoluteFill: {} } },
    'react-native-gesture-handler': { Gesture: { Pinch: () => gesture }, GestureDetector: 'GestureDetector' },
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
    '@/components/Icons': { ChevronLeft: 'ChevronLeft' },
    '@/components/PillButton': { PillButton: 'PillButton' },
    '@/theme': { fonts: {}, spacing: {} },
    '@/utils/media': { saveToGallery: async () => {} },
    '@/utils/video': { clampCameraZoom: (x: number) => Math.max(0, Math.min(1, x)), formatRecordingTime: () => '00:00' },
  };
  const source = readFileSync(new URL('../src/screens/VideoCaptureScreen.tsx', import.meta.url), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  const exports: any = {};
  runInNewContext(code, { exports, require: (id: string) => {
    assert.ok(id in mocks, `예상하지 못한 모듈: ${id}`);
    return mocks[id];
  }, Date, Math, setInterval, clearInterval, setTimeout, clearTimeout });
  const render = () => {
    cursor = 0;
    const nodes: any[] = [];
    const visit = (node: any) => {
      if (!node || typeof node !== 'object') return;
      nodes.push(node);
      const children = node.props?.children;
      (Array.isArray(children) ? children : [children]).forEach(visit);
    };
    visit(exports.VideoCaptureScreen({ navigation: { goBack: () => {} } }));
    const view = nodes.find(n => n.type === 'CameraView');
    view.props.ref.current = camera;
    return {
      view,
      shutter: nodes.find(n => n.props?.accessibilityLabel === '동영상 촬영 시작'),
      flip: nodes.find(n => n.props?.accessibilityLabel === '전후면 카메라 전환'),
    };
  };
  let ui = render();
  assert.equal(ui.shutter.props.disabled, true);
  ui.view.props.onCameraReady();
  for (const facing of ['front', 'back']) {
    ui = render();
    assert.equal(ui.flip.props.disabled, false);
    const oldKey = ui.view.key;
    ui.flip.props.onPress();
    ui = render();
    assert.equal(ui.view.props.facing, facing);
    assert.notEqual(ui.view.key, oldKey, '카메라 인스턴스가 교체돼야 ready 이벤트를 다시 받는다');
    assert.equal(ui.shutter.props.disabled, true);
    assert.equal(ui.flip.props.disabled, true);
    ui.view.props.onCameraReady();
    ui = render();
    assert.equal(ui.shutter.props.disabled, false);
    ui.shutter.props.onPress();
    await new Promise(resolve => setImmediate(resolve));
  }
  assert.equal(recordCalls, 2);
});
