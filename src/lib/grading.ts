import type { AnswerKeyItem } from '../types';

const CIRCLED: Record<string, string> = { '①': '1', '②': '2', '③': '3', '④': '4', '⑤': '5' };

/** "③" → "3", " 007 " → "7", 숫자 외 문자는 제거 */
export function normalizeAnswer(raw: string | number | null | undefined): string {
  if (raw === null || raw === undefined) return '';
  let s = String(raw).trim();
  s = s.replace(/[①②③④⑤]/g, (c) => CIRCLED[c]);
  s = s.replace(/[^0-9]/g, '');
  if (s === '') return '';
  return String(parseInt(s, 10));
}

export function emptyKey(total: number, shortSet: Set<number>): AnswerKeyItem[] {
  return Array.from({ length: total }, (_, i) => ({ answer: '', points: null, kind: shortSet.has(i + 1) ? 'short' : 'choice' }));
}

/** 저장된 정답표 길이/형식 보정 */
export function ensureKey(key: AnswerKeyItem[] | undefined, total: number, shortSet: Set<number>): AnswerKeyItem[] {
  const base = emptyKey(total, shortSet);
  if (!key) return base;
  return base.map((b, i) => (key[i] ? { ...b, ...key[i], kind: key[i].kind ?? b.kind } : b));
}

/**
 * 빠른 입력 문자열 해석
 * - 구분자(공백, 쉼표, 슬래시, 줄바꿈)가 있으면 토큰 단위: "3 5 1 22 104"
 * - 구분자가 없으면 한 글자씩: "35214213" (5지선다만 있는 과목용)
 * 결과: 1번부터 순서대로의 답 배열 (최대 total개)
 */
export function parseQuickKey(text: string, total: number): string[] {
  const cleaned = text.replace(/[①②③④⑤]/g, (c) => CIRCLED[c]).trim();
  if (!cleaned) return [];
  const hasSeparator = /[\s,/|·.-]/.test(cleaned);
  const tokens = hasSeparator ? cleaned.split(/[\s,/|·.-]+/) : cleaned.split('');
  return tokens.map(normalizeAnswer).filter((t) => t !== '').slice(0, total);
}

/**
 * 객관식 빠른 입력: "12345 51512 31312" → 1~5 숫자 한 글자 = 한 문항 (띄어쓰기·쉼표 무시)
 * invalid: 1~5 이외의 숫자/문자 개수
 */
export function parseChoiceDigits(text: string): { answers: string[]; invalid: number } {
  const cleaned = text.replace(/[①②③④⑤]/g, (c) => CIRCLED[c]).replace(/[\s,/|·.-]+/g, '');
  const answers: string[] = [];
  let invalid = 0;
  for (const ch of cleaned) {
    if (/[1-5]/.test(ch)) answers.push(ch);
    else invalid++;
  }
  return { answers, invalid };
}

/** 단답형 빠른 입력: "12 7 30 5 81" → 띄어쓰기/쉼표로 구분된 숫자 */
export function parseShortList(text: string): string[] {
  return text
    .split(/[\s,/|]+/)
    .map(normalizeAnswer)
    .filter((t) => t !== '');
}

/** 객관식/단답형 문항 번호 목록에 순서대로 답을 채운다 (입력하지 않은 뒤쪽 문항은 유지) */
export function fillByKind(current: string[], questions: number[], answers: string[]): string[] {
  const next = current.slice();
  questions.forEach((q, idx) => {
    if (answers[idx] !== undefined) next[q - 1] = answers[idx];
  });
  return next;
}

export interface GradeResult {
  graded: number;
  correct: number[];
  wrong: number[];
  unanswered: number[];
  score: number | null;
  maxScore: number | null;
}

/** 정답이 입력된 문항만 채점. 미기입은 오답 처리. 배점이 하나라도 비면 점수는 null. */
export function grade(key: AnswerKeyItem[], mine: string[]): GradeResult {
  const correct: number[] = [];
  const wrong: number[] = [];
  const unanswered: number[] = [];
  let score = 0;
  let maxScore = 0;
  let pointsComplete = true;
  key.forEach((k, i) => {
    const ans = normalizeAnswer(k.answer);
    if (!ans) return;
    const q = i + 1;
    const my = normalizeAnswer(mine[i]);
    if (k.points === null || !Number.isFinite(k.points)) pointsComplete = false;
    const pts = k.points ?? 0;
    maxScore += pts;
    if (!my) {
      unanswered.push(q);
      wrong.push(q);
    } else if (my === ans) {
      correct.push(q);
      score += pts;
    } else {
      wrong.push(q);
    }
  });
  const graded = correct.length + wrong.length;
  return {
    graded,
    correct,
    wrong,
    unanswered,
    score: graded > 0 && pointsComplete ? score : null,
    maxScore: graded > 0 && pointsComplete ? maxScore : null,
  };
}

export interface RecognizedSheet {
  examName?: string | null;
  subject?: string | null;
  form?: string | null;
  answers?: Array<{ q?: number; answer?: string | number | null }>;
}

/** 인식 결과를 정답표에 병합. 반환: [새 정답표, 채워진 문항 수] */
export function mergeRecognized(key: AnswerKeyItem[], rec: RecognizedSheet): [AnswerKeyItem[], number] {
  const next = key.map((k) => ({ ...k }));
  let filled = 0;
  for (const a of rec.answers ?? []) {
    const q = Number(a.q);
    if (!Number.isInteger(q) || q < 1 || q > next.length) continue;
    const ans = normalizeAnswer(a.answer ?? '');
    if (!ans) continue;
    next[q - 1] = {
      ...next[q - 1],
      answer: ans,
      kind: next[q - 1].kind === 'short' || !/^[1-5]$/.test(ans) ? 'short' : 'choice',
    };
    filled++;
  }
  return [next, filled];
}
