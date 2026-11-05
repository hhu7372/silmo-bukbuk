/**
 * 누적 기록 화면 둘러보기용 예시 데이터 생성기
 * - 2026년 3~10월 모의고사 8회(평가원 2·학평 4·사설 2) × 6과목, 점점 오답이 줄어드는 성장 곡선
 * - 정답표(배점 포함)·내 답·오답·점수가 서로 일치하도록 생성
 * - 국어/수학/영어는 EXP Lap 기록 포함 (보류 후 재도전 문항 포함)
 * 모든 항목에 sample: true 가 붙어 있어 한 번에 지울 수 있습니다.
 */
import { CSAT_CONFIG, type ExamSubject } from '../data/examConfigData';
import type { AnswerKeyItem, ExamResult, ExamSettings } from '../types';
import type { Lap } from './lapTracker';
import { resolveTiming } from './timing';
import { minToHM } from './time';

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SESSIONS = [
  { date: '2026-03-26', name: '2026년 3월 고3 전국연합학력평가' },
  { date: '2026-04-23', name: '2026년 4월 고3 전국연합학력평가' },
  { date: '2026-05-16', name: '더프리미엄 모의고사 5월호' },
  { date: '2026-06-04', name: '2027학년도 6월 모의평가' },
  { date: '2026-07-09', name: '2026년 7월 고3 전국연합학력평가' },
  { date: '2026-08-14', name: '더프리미엄 모의고사 8월호' },
  { date: '2026-09-03', name: '2027학년도 9월 모의평가' },
  { date: '2026-10-21', name: '2026년 10월 고3 전국연합학력평가' },
];

/** 과목별: 첫 회/마지막 회 오답 수, 문항 난이도 가중치, 배점 */
interface Profile {
  wrongStart: number;
  wrongEnd: number;
  weight: (q: number) => number;
  points: (q: number) => number;
  exp: boolean;
  electiveId?: string;
  subModeId?: string;
}

const inSet = (arr: number[]) => (q: number) => arr.includes(q);

const PROFILES: Record<string, Profile> = {
  kor: {
    wrongStart: 9,
    wrongEnd: 4,
    weight: (q) => (q <= 17 ? (q >= 8 ? 2.0 : 1.2) : q <= 34 ? 1.0 : 0.5),
    points: (q) => (inSet([4, 8, 11, 14, 17, 22, 26, 31, 35, 40])(q) ? 3 : 2),
    exp: true,
    electiveId: 'eonmae',
  },
  math: {
    wrongStart: 8,
    wrongEnd: 3,
    weight: (q) => (q <= 10 ? 0.3 : q <= 15 ? 1.4 : q <= 19 ? 0.4 : q <= 22 ? 2.2 : q <= 27 ? 0.5 : 2.4),
    points: (q) => (inSet([1, 2, 23])(q) ? 2 : inSet([9, 10, 11, 12, 13, 14, 15, 20, 21, 22, 28, 29, 30])(q) ? 4 : 3),
    exp: true,
    electiveId: 'calc',
  },
  eng: {
    wrongStart: 7,
    wrongEnd: 2,
    weight: (q) => (q <= 17 ? 0.3 : q <= 28 ? 0.6 : q <= 30 ? 1.5 : q <= 40 ? 2.2 : 0.8),
    points: (q) => (inSet([8, 15, 21, 24, 29, 32, 33, 34, 37, 39])(q) ? 3 : 2),
    exp: true,
  },
  hist: {
    wrongStart: 4,
    wrongEnd: 1,
    weight: (q) => (q >= 15 ? 1.5 : 1),
    points: (q) => (q % 2 === 0 ? 3 : 2),
    exp: false,
  },
  sci: {
    wrongStart: 6,
    wrongEnd: 2,
    weight: (q) => (q >= 15 ? 2.4 : 0.6),
    points: (q) => (q % 2 === 0 ? 3 : 2),
    exp: false,
    subModeId: 'sub1',
  },
  soc: {
    wrongStart: 5,
    wrongEnd: 2,
    weight: (q) => (q >= 15 ? 1.4 : 1),
    points: (q) => (q % 2 === 1 ? 3 : 2),
    exp: false,
    subModeId: 'sub2',
  },
};

function pickWeighted(r: () => number, items: number[], weight: (q: number) => number, count: number): number[] {
  const pool = items.slice();
  const out: number[] = [];
  while (out.length < count && pool.length) {
    const total = pool.reduce((s, q) => s + weight(q), 0);
    let x = r() * total;
    let idx = 0;
    for (; idx < pool.length - 1; idx++) {
      x -= weight(pool[idx]);
      if (x <= 0) break;
    }
    out.push(pool.splice(idx, 1)[0]);
  }
  return out.sort((a, b) => a - b);
}

function buildLaps(r: () => number, subject: ExamSubject, profile: Profile, wrong: Set<number>, durationMs: number, progress: number): Lap[] {
  const n = subject.total_questions;
  const qs = Array.from({ length: n }, (_, i) => i + 1);
  // 문항별 소요 시간(상대값): 난이도 × 오답 가중 × 잡음
  const raw = qs.map((q) => profile.weight(q) * (wrong.has(q) ? 1.6 : 1) * (0.6 + r() * 0.9) + 0.35);
  // 회차가 지날수록 시험 시간을 덜 쓰도록 (97% → 82%)
  const target = durationMs * (0.97 - 0.15 * progress + (r() - 0.5) * 0.03);
  const scale = target / raw.reduce((a, b) => a + b, 0);
  const times = raw.map((t) => Math.max(15_000, Math.round((t * scale) / 1000) * 1000));
  // 보류 후 재도전 문항: 어려운 문항 중 2~4개
  const skipCount = 2 + Math.floor(r() * 3);
  const skipped = new Set(pickWeighted(r, qs, (q) => profile.weight(q) ** 2, skipCount));
  const laps: Lap[] = [];
  let t = 0;
  const push = (q: number, dur: number, outcome: Lap['outcome']) => {
    laps.push({ lapNo: laps.length + 1, questionNo: q, startMs: t, endMs: t + dur, durationMs: dur, outcome });
    t += dur;
  };
  for (const q of qs) {
    const total = times[q - 1];
    if (skipped.has(q)) push(q, Math.round((total * (0.35 + r() * 0.2)) / 1000) * 1000, 'skipped');
    else push(q, total, 'completed');
  }
  for (const q of skipped) {
    const first = laps.find((l) => l.questionNo === q)!.durationMs;
    push(q, Math.max(10_000, times[q - 1] - first), 'completed');
  }
  return laps;
}

export function generateSampleResults(): ExamResult[] {
  const r = rng(20261105);
  const out: ExamResult[] = [];
  SESSIONS.forEach((session, si) => {
    const progress = si / (SESSIONS.length - 1);
    for (const subject of CSAT_CONFIG.subjects) {
      const profile = PROFILES[subject.id];
      if (!profile) continue;
      const n = subject.total_questions;
      const shortSet = new Set(subject.short_answer_questions ?? []);
      const expected = profile.wrongStart + (profile.wrongEnd - profile.wrongStart) * progress;
      const wrongCount = Math.max(0, Math.round(expected + (r() - 0.5) * 3));
      const qs = Array.from({ length: n }, (_, i) => i + 1);
      const wrongList = pickWeighted(r, qs, profile.weight, wrongCount);
      const wrong = new Set(wrongList);

      const answerKey: AnswerKeyItem[] = qs.map((q) => ({
        answer: shortSet.has(q) ? String(1 + Math.floor(r() * 300)) : String(1 + Math.floor(r() * 5)),
        points: profile.points(q),
        kind: shortSet.has(q) ? 'short' : 'choice',
      }));
      const myAnswers = answerKey.map((k, i) => {
        if (!wrong.has(i + 1)) return k.answer;
        if (r() < 0.12) return ''; // 가끔 미기입
        if (k.kind === 'short') return String(Number(k.answer) + 1 + Math.floor(r() * 40));
        const choices = ['1', '2', '3', '4', '5'].filter((c) => c !== k.answer);
        return choices[Math.floor(r() * choices.length)];
      });
      const score = answerKey.reduce((s, k, i) => (wrong.has(i + 1) ? s : s + (k.points ?? 0)), 0);

      const timing = resolveTiming(subject, profile.subModeId);
      const durationMs = timing.durationMin * 60_000;
      const laps = profile.exp ? buildLaps(r, subject, profile, wrong, durationMs, progress) : [];
      const elapsedMs = profile.exp ? Math.min(durationMs, laps[laps.length - 1].endMs + 60_000) : durationMs;
      const elective = subject.electives?.find((e) => e.id === profile.electiveId);
      const settings: ExamSettings = {
        examId: CSAT_CONFIG.exam_id,
        subjectId: subject.id,
        subModeId: profile.subModeId,
        electiveId: elective?.id,
        clockType: 'analog',
        timeMode: 'real',
        clockModel: 'A',
        waitOption: 'prep',
        customWaitMin: 10,
        visualAlert: true,
        soundAlert: false,
        expMode: profile.exp,
      };
      out.push({
        id: `sample_${session.date}_${subject.id}`,
        createdAt: new Date(`${session.date}T${minToHM(timing.endMin)}:00`).toISOString(),
        examId: CSAT_CONFIG.exam_id,
        examTitle: CSAT_CONFIG.exam_title,
        subjectId: subject.id,
        subjectName: subject.display_name ?? subject.tab_name,
        subModeId: profile.subModeId,
        subModeName: timing.subModeName,
        electiveId: elective?.id,
        electiveName: elective?.name,
        settings,
        totalQuestions: n,
        durationMin: timing.durationMin,
        elapsedMs,
        endedEarly: false,
        expMode: profile.exp,
        laps,
        score,
        wrongQuestions: wrongList,
        mockName: session.name,
        answerKey,
        myAnswers,
        ownerId: null,
        sample: true,
      });
    }
  });
  return out;
}
