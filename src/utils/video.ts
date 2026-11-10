/** 카메라 줌은 expo-camera 규격상 0(기본)~1(기기 최대) 범위다. */
export function clampCameraZoom(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/** 녹화 시간을 아이폰 카메라처럼 mm:ss, 한 시간부터는 hh:mm:ss로 표시한다. */
export function formatRecordingTime(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');

  return hours > 0 ? `${String(hours).padStart(2, '0')}:${mm}:${ss}` : `${mm}:${ss}`;
}
