import type { ExamSubject } from '../data/examConfigData';
import type { WaitOption } from '../types';
import { parseHM } from './time';

export interface ResolvedTiming {
  /** 자정 기준 분 */
  startMin: number;
  endMin: number;
  entryMin: number;
  durationMin: number;
  warningMin: number;
  subModeName?: string;
}

/** 과목 + (탐구) 세부 선택을 실제 시작/종료 시각으로 해석 */
export function resolveTiming(subject: ExamSubject, subModeId?: string): ResolvedTiming {
  const sub = subject.sub_modes?.find((m) => m.id === subModeId) ?? subject.sub_modes?.[0];
  const start = sub ? sub.start_time : subject.start_time;
  const end = sub ? sub.end_time : subject.end_time;
  const duration = sub ? sub.duration_min : subject.duration_min;
  return {
    startMin: parseHM(start),
    endMin: parseHM(end),
    entryMin: parseHM(subject.entry_deadline),
    durationMin: duration,
    warningMin: subject.warning_min,
    subModeName: sub?.name,
  };
}

/** 대기시간 옵션 → 분 */
export function waitMinutes(option: WaitOption, customMin: number): number {
  switch (option) {
    case 'none':
      return 0;
    case 'prep':
      return PREP_BELL_MIN;
    case 'custom':
      return clampWait(customMin);
    default:
      return 0;
  }
}

export const MAX_CUSTOM_WAIT_MIN = 120;
/** 준비령: 시험 시작 5분 전 */
export const PREP_BELL_MIN = 5;

export function clampWait(min: number): number {
  if (!Number.isFinite(min)) return 0;
  return Math.min(MAX_CUSTOM_WAIT_MIN, Math.max(0, Math.round(min)));
}

/** 화면 표시 순서 */
export const WAIT_OPTIONS: WaitOption[] = ['none', 'prep', 'custom'];

export const WAIT_OPTION_LABELS: Record<WaitOption, string> = {
  none: '없음',
  prep: '준비령부터',
  custom: '직접 설정',
};
