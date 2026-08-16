/**
 * 디자인에 쓰인 라인/솔리드 아이콘 모음 (react-native-svg).
 */
import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string;
}

export function ChevronLeft({ size = 20, color = '#3a1030' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 18l-6-6 6-6"
        stroke={color}
        strokeWidth={2.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function Check({ size = 14, color = '#fff' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20 6L9 17l-5-5"
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function FrameIcon({ size = 26, color = '#fff' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={3} width={18} height={18} rx={4} stroke={color} strokeWidth={2.5} />
      <Rect x={7.5} y={7.5} width={9} height={9} rx={2} stroke={color} strokeWidth={2.5} />
    </Svg>
  );
}

export function StarIcon({
  size = 24,
  color = '#fff',
  fill = '#fff',
  stroke,
}: IconProps & { fill?: string; stroke?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={fill}>
      <Path
        d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.27 5.82 21 7 14.14l-5-4.87 6.91-1.01L12 2z"
        stroke={stroke ?? color}
        strokeWidth={stroke ? 1.8 : 0}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function CameraIcon({ size = 24, color = '#fff' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 8a2 2 0 012-2h1.5l1-2h7l1 2H19a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V8z"
        stroke={color}
        strokeWidth={2.2}
        strokeLinejoin="round"
      />
      <Circle cx={12} cy={13} r={3.5} stroke={color} strokeWidth={2.2} />
    </Svg>
  );
}

export function ImageIcon({ size = 24, color = '#fff' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={4} width={18} height={16} rx={2.5} stroke={color} strokeWidth={2.2} />
      <Circle cx={8.5} cy={9.5} r={1.6} fill={color} />
      <Path
        d="M4 17l5-5 3.5 3.5L17 10l4 5"
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function CloseIcon({ size = 12, color = '#b31877' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M18 6L6 18M6 6l12 12" stroke={color} strokeWidth={3} strokeLinecap="round" />
    </Svg>
  );
}

export function DownloadIcon({ size = 18, color = '#fff' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 4v11M8 11l4 4 4-4M5 19h14"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ShareIcon({ size = 18, color = '#3a1030' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={6} cy={12} r={2.5} stroke={color} strokeWidth={2.2} />
      <Circle cx={18} cy={6} r={2.5} stroke={color} strokeWidth={2.2} />
      <Circle cx={18} cy={18} r={2.5} stroke={color} strokeWidth={2.2} />
      <Path d="M8.2 10.8l7.6-4.4M8.2 13.2l7.6 4.4" stroke={color} strokeWidth={2.2} />
    </Svg>
  );
}

export function RefreshIcon({ size = 16, color = '#b31877' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 4v5h5M20 20v-5h-5"
        stroke={color}
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M5.5 9a7 7 0 0112-4M18.5 15a7 7 0 01-12 4"
        stroke={color}
        strokeWidth={2.4}
        strokeLinecap="round"
      />
    </Svg>
  );
}
