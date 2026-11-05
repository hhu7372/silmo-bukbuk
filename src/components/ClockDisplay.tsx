import type { ClockModel, ClockType, TimeMode } from '../types';
import { msToMMSS, secondsToClock } from '../lib/time';
import { AnalogClock } from './AnalogClock';
import { cx } from './ui';

export interface ClockDisplayProps {
  clockType: ClockType;
  timeMode: TimeMode;
  model: ClockModel;
  /** 자정 기준 현재 (가상) 시각, 초 */
  clockSeconds: number;
  /** 남은 시험 시간 ms */
  remainingMs: number;
  /** 전체 시험 시간 ms */
  durationMs: number;
  waiting: boolean;
  warning: boolean;
  subjectLabel: string;
  /** 문항 그리드와 한 화면에 들어오도록 작게 */
  compact?: boolean;
}

export function ClockDisplay(p: ClockDisplayProps) {
  const remainingMin = p.remainingMs / 60000;

  if (p.clockType === 'digital') {
    const main = p.timeMode === 'real' ? secondsToClock(p.clockSeconds) : msToMMSS(p.remainingMs);
    const sub = p.timeMode === 'real' ? `남은 시간 ${msToMMSS(p.remainingMs)}` : `현재 시각 ${secondsToClock(p.clockSeconds)}`;
    return (
      <div
        className={cx(
          'flex w-full flex-col items-center justify-center rounded-3xl border shadow-inner', p.compact ? 'h-full px-2 py-4' : 'px-4 py-8 sm:py-12',
          p.warning ? 'border-red-500/60 bg-red-950 text-red-100' : 'border-slate-200 bg-white text-slate-900',
        )}
      >
        <div className="text-xs font-bold uppercase tracking-[0.3em] opacity-60">{p.timeMode === 'real' ? 'EXAM CLOCK' : 'COUNTDOWN'}</div>
        <div className={cx('mt-2 font-mono font-black tabular-nums', p.compact ? (p.timeMode === 'real' ? 'text-2xl sm:text-5xl lg:text-7xl' : 'text-4xl sm:text-6xl lg:text-8xl') : 'text-6xl sm:text-8xl', p.warning && 'text-red-400')}>{main}</div>
        <div className={cx('mt-3 font-mono tabular-nums opacity-70', p.compact ? 'text-[11px] sm:text-sm' : 'text-sm')}>{sub}</div>
        <div className="mt-4 h-2 w-full max-w-md overflow-hidden rounded-full bg-black/10">
          <div
            className={cx('h-full rounded-full transition-[width]', p.warning ? 'bg-red-500' : 'bg-blue-500')}
            style={{ width: `${Math.max(0, Math.min(100, (p.remainingMs / p.durationMs) * 100))}%` }}
          />
        </div>
      </div>
    );
  }

  // 아날로그
  let displaySeconds: number;
  let band: { fromDeg: number; toDeg: number } | undefined;
  if (p.timeMode === 'real') {
    displaySeconds = p.clockSeconds;
    const minAngle = ((p.clockSeconds / 60) % 60) * 6;
    // 지금부터 종료 시각까지 분침이 지나갈 구간 (최대 60분)
    band = p.waiting ? undefined : { fromDeg: minAngle, toDeg: minAngle + Math.min(remainingMin, 60) * 6 };
  } else {
    // 카운트다운: 12시(0분)에서 출발해 바늘은 항상 시계 방향으로 흐르고,
    // 남은 시간은 분침 앞쪽 링(최대 60분)과 아래 숫자로 표시
    const elapsedSec = Math.max(0, (p.durationMs - p.remainingMs) / 1000);
    displaySeconds = elapsedSec;
    const minAngle = ((elapsedSec / 60) % 60) * 6;
    band = { fromDeg: minAngle, toDeg: minAngle + Math.min(remainingMin, 60) * 6 };
  }

  return (
    <div className="flex w-full flex-col items-center">
      <div className={cx('aspect-square w-full', p.compact ? 'max-w-[340px] lg:max-w-[min(100%,calc(100vh-280px))]' : 'max-w-[min(78vw,420px)] lg:max-w-[min(100%,calc(100vh-300px),560px)]')}>
        <AnalogClock
          displaySeconds={displaySeconds}
          model={p.model}
          band={band}
          warning={p.warning}
          caption={p.timeMode === 'real' ? p.subjectLabel : '남은 시간'}
        />
      </div>
      {/* 현재 시각은 시계판에 있으므로 아래에는 남은 시간만 크게 */}
      <div className={cx('mt-2 flex items-baseline justify-center gap-2 tabular-nums', p.warning ? 'text-red-500' : 'text-slate-700')}>
        <span className={cx('font-semibold', p.compact ? 'text-xs sm:text-sm' : 'text-sm')}>남은 시간</span>
        <span className={cx('font-mono font-black', p.compact ? 'text-lg sm:text-2xl lg:text-3xl' : 'text-2xl sm:text-3xl')}>{msToMMSS(p.remainingMs)}</span>
      </div>
    </div>
  );
}
