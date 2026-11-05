/**
 * EXP 모드 문항별 Lap 트래커 (순수 함수 / 불변 상태)
 * ------------------------------------------------------------
 * - 모든 시간은 "시험 시작 기준 경과 ms(가상 시계)"로 기록 → 배속 모드에서도 정확
 * - 비선형 풀이 지원: 보류(Skip) / 문항 직접 선택 시 현재 Lap을 부분 기록으로 저장하고
 *   선택한 문항에서 새 Lap을 시작. 한 문항은 여러 Lap을 가질 수 있음.
 * - Lap 번호는 "기록이 확정되는 순간" 순차 부여 (#1, #2, ...)
 * - 자동으로 다음 문항에 진입한 직후(유예시간 이내) 다른 문항을 직접 선택하면,
 *   손도 대지 않은 자동 진입 Lap은 버려집니다. (시나리오: 3번 완료 → 곧바로 2번 선택 시
 *   2번의 2차 기록이 Lap #4가 되도록)
 */

export type LapOutcome = 'completed' | 'skipped' | 'switched' | 'exam_end';
export type QuestionStatus = 'untried' | 'active' | 'skipped' | 'completed';

export interface Lap {
  lapNo: number;
  questionNo: number;
  startMs: number;
  endMs: number;
  durationMs: number;
  outcome: LapOutcome;
}

export interface CurrentLap {
  questionNo: number;
  /** 시험 기준 시작 시각 (가상 ms) */
  startMs: number;
  /** 실제 시각 (performance.now 등) – 오터치 유예 판단용 */
  realStart: number;
  /** 사용자가 직접 선택한 Lap인지 (자동 진입이면 false) */
  userInitiated: boolean;
}

export interface TrackerState {
  total: number;
  laps: Lap[];
  current: CurrentLap | null;
  /** index = 문항번호 - 1 */
  completed: boolean[];
  /** 한 번이라도 Lap이 기록된 문항 */
  visited: boolean[];
  finalized: boolean;
}

export interface Stamp {
  /** 시험 시작 기준 가상 ms */
  exam: number;
  /** 실제 시간 ms (오터치 유예 판단) */
  real: number;
}

/** 자동 진입 직후 이 시간(실제 ms) 안에 다른 문항으로 이동하면 빈 Lap으로 간주하여 폐기 */
export const AUTO_LAP_GRACE_MS = 3000;
/** 사용자가 직접 고른 문항도 이 시간(실제 ms) 안에 떠나면 '훑어보기'로 보고 Lap을 남기지 않음 (방향키 연속 이동 등) */
export const BROWSE_GRACE_MS = 1000;

export function createTracker(total: number, at: Stamp, firstQuestion = 1): TrackerState {
  return {
    total,
    laps: [],
    current: { questionNo: firstQuestion, startMs: at.exam, realStart: at.real, userInitiated: true },
    completed: Array(total).fill(false),
    visited: Array(total).fill(false),
    finalized: false,
  };
}

export function nextLapNo(state: TrackerState): number {
  return state.laps.length + 1;
}

export function getStatus(state: TrackerState, q: number): QuestionStatus {
  if (state.current?.questionNo === q && !state.finalized) return 'active';
  if (state.completed[q - 1]) return 'completed';
  if (state.visited[q - 1]) return 'skipped';
  return 'untried';
}

/** fromQ 다음부터 순환하며 미완료 문항 탐색 (fromQ 자신 제외) */
export function findNextOpen(state: Pick<TrackerState, 'total' | 'completed'>, fromQ: number): number | null {
  for (let step = 1; step < state.total; step++) {
    const q = ((fromQ - 1 + step) % state.total) + 1;
    if (!state.completed[q - 1]) return q;
  }
  return null;
}

function closeCurrent(state: TrackerState, at: Stamp, outcome: LapOutcome): TrackerState {
  const cur = state.current;
  if (!cur) return state;
  const endMs = Math.max(at.exam, cur.startMs);
  const lap: Lap = {
    lapNo: nextLapNo(state),
    questionNo: cur.questionNo,
    startMs: cur.startMs,
    endMs,
    durationMs: endMs - cur.startMs,
    outcome,
  };
  const completed = state.completed.slice();
  const visited = state.visited.slice();
  visited[cur.questionNo - 1] = true;
  if (outcome === 'completed') completed[cur.questionNo - 1] = true;
  return { ...state, laps: [...state.laps, lap], completed, visited, current: null };
}

function startLap(state: TrackerState, q: number | null, at: Stamp, userInitiated: boolean): TrackerState {
  if (q === null) return { ...state, current: null };
  return { ...state, current: { questionNo: q, startMs: at.exam, realStart: at.real, userInitiated } };
}

/** [현재 N번] 풀이 완료 → 다음 문제 */
export function completeCurrent(state: TrackerState, at: Stamp): TrackerState {
  if (state.finalized || !state.current) return state;
  const q = state.current.questionNo;
  const closed = closeCurrent(state, at, 'completed');
  return startLap(closed, findNextOpen(closed, q), at, false);
}

/** [현재 N번] 보류 후 넘어가기 (Skip) */
export function skipCurrent(state: TrackerState, at: Stamp): TrackerState {
  if (state.finalized || !state.current) return state;
  const q = state.current.questionNo;
  const closed = closeCurrent(state, at, 'skipped');
  return startLap(closed, findNextOpen(closed, q), at, false);
}

/** 문항 그리드에서 특정 문항 직접 선택 */
export function jumpTo(state: TrackerState, q: number, at: Stamp): TrackerState {
  if (state.finalized || q < 1 || q > state.total) return state;
  const cur = state.current;
  if (cur && cur.questionNo === q) return state;
  let base = state;
  if (cur) {
    const realElapsed = at.real - cur.realStart;
    const discard = realElapsed < (cur.userInitiated ? BROWSE_GRACE_MS : AUTO_LAP_GRACE_MS);
    base = discard ? { ...state, current: null } : closeCurrent(state, at, 'switched');
  }
  return startLap(base, q, at, true);
}

/** 시험 종료: 진행 중인 Lap을 부분 기록으로 저장하고 잠금 */
export function finalizeTracker(state: TrackerState, at: Stamp): TrackerState {
  if (state.finalized) return state;
  const cur = state.current;
  const hasTime = cur !== null && at.exam - cur.startMs > 0;
  const closed = hasTime ? closeCurrent(state, at, 'exam_end') : state;
  return { ...closed, current: null, finalized: true };
}

/** 현재 보류중(시도했으나 미완료, 현재 풀이중 아님)인 문항 번호 목록 (오름차순) */
export function skippedQuestions(state: TrackerState): number[] {
  const out: number[] = [];
  for (let q = 1; q <= state.total; q++) if (getStatus(state, q) === 'skipped') out.push(q);
  return out;
}

/** 보류중 문항 중 가장 최근에 손댄(마지막 Lap 번호가 가장 큰) 문항 */
export function mostRecentSkipped(state: TrackerState): number | null {
  const skipped = new Set(skippedQuestions(state));
  for (let i = state.laps.length - 1; i >= 0; i--) {
    if (skipped.has(state.laps[i].questionNo)) return state.laps[i].questionNo;
  }
  return null;
}

/** 보류중 문항 중 fromQ 다음 번호 (순환) */
export function nextSkipped(state: TrackerState, fromQ: number): number | null {
  const skipped = skippedQuestions(state);
  if (skipped.length === 0) return null;
  return skipped.find((q) => q > fromQ) ?? skipped[0];
}
