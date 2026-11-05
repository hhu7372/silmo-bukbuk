import type { ExamSection } from '../data/examConfigData';
import type { Lap, LapOutcome } from './lapTracker';

export interface QuestionLog {
  questionNo: number;
  lapNos: number[];
  lapDurations: number[];
  totalMs: number;
  /** 1차 Lap (처음 손댄 구간) */
  firstLapMs: number;
  /** 2차 이상 Lap 합계 (돌아와서 다시 푼 시간) */
  retryMs: number;
  visits: number;
  isCompleted: boolean;
  firstOutcome: LapOutcome | null;
}

/** Lap 배열 → 문항별 집계 */
export function buildQuestionLogs(laps: Lap[], total: number): QuestionLog[] {
  const logs: QuestionLog[] = Array.from({ length: total }, (_, i) => ({
    questionNo: i + 1,
    lapNos: [],
    lapDurations: [],
    totalMs: 0,
    firstLapMs: 0,
    retryMs: 0,
    visits: 0,
    isCompleted: false,
    firstOutcome: null,
  }));
  const sorted = [...laps].sort((a, b) => a.lapNo - b.lapNo);
  for (const lap of sorted) {
    const log = logs[lap.questionNo - 1];
    if (!log) continue;
    if (log.visits === 0) {
      log.firstLapMs = lap.durationMs;
      log.firstOutcome = lap.outcome;
    } else {
      log.retryMs += lap.durationMs;
    }
    log.lapNos.push(lap.lapNo);
    log.lapDurations.push(lap.durationMs);
    log.totalMs += lap.durationMs;
    log.visits += 1;
    if (lap.outcome === 'completed') log.isCompleted = true;
  }
  return logs;
}

export interface TimeSummary {
  attemptedCount: number;
  completedCount: number;
  meanMs: number;
  stdMs: number;
  totalTrackedMs: number;
  timeKillers: QuestionLog[];
  regressions: QuestionLog[];
  /** 여러 번에 나눠 푼 문항들의 "첫 포기까지 걸린 평균 시간" */
  avgFirstGiveUpMs: number;
}

export function summarize(logs: QuestionLog[]): TimeSummary {
  const attempted = logs.filter((l) => l.totalMs > 0);
  const n = attempted.length;
  const totalTrackedMs = attempted.reduce((s, l) => s + l.totalMs, 0);
  const meanMs = n ? totalTrackedMs / n : 0;
  const stdMs = n ? Math.sqrt(attempted.reduce((s, l) => s + (l.totalMs - meanMs) ** 2, 0) / n) : 0;
  const timeKillers = [...attempted].sort((a, b) => b.totalMs - a.totalMs).slice(0, 5);
  const regressions = logs.filter((l) => l.visits >= 2);
  const giveUps = regressions.filter((l) => l.firstOutcome !== 'completed');
  const avgFirstGiveUpMs = giveUps.length ? giveUps.reduce((s, l) => s + l.firstLapMs, 0) / giveUps.length : 0;
  return {
    attemptedCount: n,
    completedCount: logs.filter((l) => l.isCompleted).length,
    meanMs,
    stdMs,
    totalTrackedMs,
    timeKillers,
    regressions,
    avgFirstGiveUpMs,
  };
}

export interface SectionBreakdown {
  section: ExamSection;
  total: number;
  wrong: number;
  wrongRate: number;
  timeMs: number;
  wrongQuestions: number[];
}

export function sectionBreakdown(
  sections: ExamSection[],
  wrongQuestions: number[],
  logs?: QuestionLog[],
): SectionBreakdown[] {
  const wrongSet = new Set(wrongQuestions);
  return sections.map((section) => {
    const total = section.q_end - section.q_start + 1;
    const wq: number[] = [];
    let timeMs = 0;
    for (let q = section.q_start; q <= section.q_end; q++) {
      if (wrongSet.has(q)) wq.push(q);
      if (logs?.[q - 1]) timeMs += logs[q - 1].totalMs;
    }
    return { section, total, wrong: wq.length, wrongRate: total ? wq.length / total : 0, timeMs, wrongQuestions: wq };
  });
}

export function findSection(sections: ExamSection[], q: number): ExamSection | undefined {
  return sections.find((s) => q >= s.q_start && q <= s.q_end);
}

export const OUTCOME_LABEL: Record<LapOutcome, string> = {
  completed: '완료',
  skipped: '보류',
  switched: '이동',
  exam_end: '시험 종료',
};
