import type { ExamSection } from '../data/examConfigData';
import type { ExamResult } from '../types';
import { buildQuestionLogs } from './stats';

/** 비교에 필요한 최소 이전 기록 수 */
export const MIN_COMPARE_RECORDS = 3;

export interface SectionTime {
  id: string;
  name: string;
  ms: number;
}

/** 한 시험 기록의 파트별 사용 시간 (문항 Lap 합계) */
export function sectionTimes(result: Pick<ExamResult, 'laps' | 'totalQuestions'>, sections: ExamSection[]): SectionTime[] {
  const logs = buildQuestionLogs(result.laps, result.totalQuestions);
  return sections
    .filter((s) => s.q_start <= result.totalQuestions)
    .map((s) => {
      let ms = 0;
      for (let q = s.q_start; q <= Math.min(s.q_end, result.totalQuestions); q++) ms += logs[q - 1]?.totalMs ?? 0;
      return { id: s.id, name: s.name, ms };
    });
}

export interface SectionCompareRow {
  id: string;
  name: string;
  currentMs: number;
  averageMs: number;
  /** 이번 − 평균 (음수면 더 빨라짐) */
  diffMs: number;
  samples: number;
}

/**
 * 같은 시험·과목(·선택과목)의 이전 EXP 기록 평균과 이번 기록을 파트별로 비교
 * 선택과목 파트는 같은 선택과목 기록끼리만 평균
 */
export function compareSections(current: ExamResult, history: ExamResult[], sections: ExamSection[]): { rows: SectionCompareRow[]; samples: number } {
  const prev = history.filter(
    (r) =>
      r.id !== current.id &&
      r.examId === current.examId &&
      r.subjectId === current.subjectId &&
      r.expMode &&
      r.laps.length > 0 &&
      (!current.electiveId || r.electiveId === current.electiveId),
  );
  const cur = sectionTimes(current, sections);
  const prevTimes = prev.map((r) => sectionTimes(r, sections));
  const rows = cur.map((c) => {
    const vals = prevTimes.map((t) => t.find((x) => x.id === c.id)?.ms).filter((v): v is number => typeof v === 'number' && v > 0);
    const averageMs = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    return { id: c.id, name: c.name, currentMs: c.ms, averageMs, diffMs: c.ms - averageMs, samples: vals.length };
  });
  return { rows, samples: prev.length };
}
