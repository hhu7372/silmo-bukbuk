import { useId } from 'react';
import type { ClockModel } from '../types';

interface Theme {
  face: string;
  rimStroke: string;
  rimWidth: number;
  number: string;
  numberWeight: number;
  numberSize: number;
  font: string;
  tickMajor: string;
  tickMinor: string;
  hour: string;
  minute: string;
  second: string;
  cap: string;
  label: string;
  bandColor: string;
}

const THEMES: Record<ClockModel, Theme> = {
  // 수능 표준형 — 흰 배경, 검정 굵은 아라비아 숫자, 빨간 초침, 명확한 분 눈금
  A: {
    face: '#FFFFFF',
    rimStroke: '#111111',
    rimWidth: 5,
    number: '#000000',
    numberWeight: 900,
    numberSize: 17,
    font: 'Arial, Helvetica, sans-serif',
    tickMajor: '#000000',
    tickMinor: '#222222',
    hour: '#000000',
    minute: '#000000',
    second: '#E11D48',
    cap: '#E11D48',
    label: '#64748b',
    bandColor: 'rgba(37, 99, 235, 0.22)',
  },
  // 교실 벽걸이형 — 아이보리, 클래식 고딕, 입체 테두리 그림자
  B: {
    face: '#FDFBF7',
    rimStroke: 'url(#rim)',
    rimWidth: 9,
    number: '#3B3129',
    numberWeight: 700,
    numberSize: 16,
    font: "'Noto Sans KR', 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif",
    tickMajor: '#3B3129',
    tickMinor: '#8a7d70',
    hour: '#2B231C',
    minute: '#2B231C',
    second: '#B91C1C',
    cap: '#7C2D12',
    label: '#8a7d70',
    bandColor: 'rgba(180, 83, 9, 0.18)',
  },
};

function polar(cx: number, cy: number, r: number, deg: number): [number, number] {
  const rad = ((deg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}

function arcPath(cx: number, cy: number, r: number, fromDeg: number, toDeg: number): string {
  const sweep = Math.min(Math.max(toDeg - fromDeg, 0), 359.99);
  const [x1, y1] = polar(cx, cy, r, fromDeg);
  const [x2, y2] = polar(cx, cy, r, fromDeg + sweep);
  const large = sweep > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
}

export interface AnalogClockProps {
  /** 표시할 시각 (초 단위, 자정 기준 또는 남은 시간) */
  displaySeconds: number;
  model: ClockModel;
  /** 다이얼 바깥 링에 표시할 구간(남은 시간) – 각도 */
  band?: { fromDeg: number; toDeg: number };
  warning?: boolean;
  caption?: string;
}

export function AnalogClock({ displaySeconds, model, band, warning, caption }: AnalogClockProps) {
  const t = THEMES[model];
  const uidRaw = useId().replace(/:/g, '');
  const id = (name: string) => `${name}-${uidRaw}`;

  const sec = displaySeconds % 60;
  const secAngle = Math.floor(sec) * 6; // 쿼츠 시계처럼 1초 단위 틱
  const minAngle = ((displaySeconds / 60) % 60) * 6;
  const hourAngle = ((displaySeconds / 3600) % 12) * 30;

  const bandColor = warning ? 'rgba(239, 68, 68, 0.55)' : t.bandColor;

  const ticks = Array.from({ length: 60 }, (_, i) => {
    const major = i % 5 === 0;
    const [x1, y1] = polar(100, 100, major ? 79 : 83, i * 6);
    const [x2, y2] = polar(100, 100, 89, i * 6);
    return (
      <line
        key={i}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={major ? t.tickMajor : t.tickMinor}
        strokeWidth={major ? 3 : 1.1}
        strokeLinecap="butt"
      />
    );
  });

  const numbers = Array.from({ length: 12 }, (_, i) => {
    const n = i + 1;
    const [x, y] = polar(100, 100, 66, n * 30);
    return (
      <text
        key={n}
        x={x}
        y={y}
        textAnchor="middle"
        dominantBaseline="central"
        fill={t.number}
        fontFamily={t.font}
        fontWeight={t.numberWeight}
        fontSize={t.numberSize}
      >
        {n}
      </text>
    );
  });

  const hand = (angle: number, length: number, tail: number, width: number, color: string, extra?: object) => {
    const [x1, y1] = polar(100, 100, -tail, angle);
    const [x2, y2] = polar(100, 100, length, angle);
    return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={width} strokeLinecap="round" {...extra} />;
  };

  return (
    <svg viewBox="0 0 200 200" className="h-full w-full select-none" role="img" aria-label="아날로그 시계">
      <defs>
        <linearGradient id="rim" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#d6cfc4" />
          <stop offset="45%" stopColor="#8b7f70" />
          <stop offset="100%" stopColor="#4a4036" />
        </linearGradient>
        <radialGradient id={id('faceGrad')} cx="50%" cy="40%" r="65%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#F3EEE4" />
        </radialGradient>
        <filter id={id('shadow')} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="3" stdDeviation="3.5" floodColor="#000" floodOpacity="0.35" />
        </filter>
        <filter id={id('handShadow')} x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="1.2" dy="1.8" stdDeviation="1" floodColor="#000" floodOpacity="0.3" />
        </filter>
      </defs>

      {/* 본체 / 테두리 */}
      <circle
        cx="100"
        cy="100"
        r={96}
        fill={model === 'B' ? `url(#${id('faceGrad')})` : t.face}
        stroke={t.rimStroke}
        strokeWidth={t.rimWidth}
        filter={model === 'B' ? `url(#${id('shadow')})` : undefined}
      />
      {model === 'B' && <circle cx="100" cy="100" r={90.5} fill="none" stroke="rgba(0,0,0,0.12)" strokeWidth={1.5} />}

      {/* 남은 시간 구간 표시 링 */}
      {band && band.toDeg > band.fromDeg && (
        <path d={arcPath(100, 100, 86, band.fromDeg, band.toDeg)} fill="none" stroke={bandColor} strokeWidth={8} />
      )}

      {ticks}
      {numbers}

      {caption && (
        <text x="100" y="132" textAnchor="middle" fill={t.label} fontSize="7.5" fontFamily={t.font} fontWeight={600}>
          {caption}
        </text>
      )}

      {/* 바늘 */}
      <g filter={model === 'B' ? `url(#${id('handShadow')})` : undefined}>
        {hand(hourAngle, 44, 10, 6.5, t.hour)}
        {hand(minAngle, 68, 12, 4.2, t.minute)}
        {hand(secAngle, 78, 18, 1.6, t.second)}
        <circle cx="100" cy="100" r={4.5} fill={t.cap} />
        <circle cx="100" cy="100" r={1.4} fill="#fff" />
      </g>
    </svg>
  );
}
