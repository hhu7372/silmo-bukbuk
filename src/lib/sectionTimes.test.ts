import { describe, expect, it } from 'vitest';
import type { ExamResult } from '../types';
import { compareSections, sectionTimes } from './sectionTimes';

const sections = [
  { id: 'a', name: 'A', q_start: 1, q_end: 2 },
  { id: 'b', name: 'B', q_start: 3, q_end: 4 },
];
const make = (id: string, secs: number[], extra: Partial<ExamResult> = {}): ExamResult =>
  ({
    id,
    examId: 'e',
    subjectId: 's',
    expMode: true,
    totalQuestions: 4,
    laps: secs.map((s, i) => ({ lapNo: i + 1, questionNo: i + 1, startMs: 0, endMs: s * 1000, durationMs: s * 1000, outcome: 'completed' })),
    createdAt: '2026-01-01',
    ...extra,
  }) as ExamResult;

describe('파트별 시간 비교', () => {
  it('파트별 합계', () => {
    expect(sectionTimes(make('x', [10, 20, 30, 40]), sections).map((s) => s.ms)).toEqual([30_000, 70_000]);
  });
  it('이전 기록 평균과 비교, 선택과목이 다르면 제외', () => {
    const cur = make('cur', [10, 10, 10, 10], { electiveId: 'x' });
    const hist = [make('h1', [20, 20, 20, 20], { electiveId: 'x' }), make('h2', [10, 10, 30, 30], { electiveId: 'x' }), make('h3', [99, 99, 99, 99], { electiveId: 'y' })];
    const { rows, samples } = compareSections(cur, [cur, ...hist], sections);
    expect(samples).toBe(2);
    expect(rows[0]).toMatchObject({ currentMs: 20_000, averageMs: 30_000, diffMs: -10_000 });
    expect(rows[1]).toMatchObject({ currentMs: 20_000, averageMs: 50_000 });
  });
});
