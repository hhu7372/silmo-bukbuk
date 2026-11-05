import { describe, expect, it } from 'vitest';
import { completeCurrent, createTracker, finalizeTracker, getStatus, jumpTo, skipCurrent } from './lapTracker';
import { buildQuestionLogs, summarize } from './stats';

const s = (exam: number, real = exam) => ({ exam, real });

describe('EXP 모드 비선형 Lap 트래킹', () => {
  it('명세서 시나리오: 2번 보류 → 3번 완료 → 2번 복귀 완료', () => {
    let t = createTracker(45, s(0));
    t = completeCurrent(t, s(60_000)); // Lap1: 1번 60초 완료 → 2번 자동 진입
    t = skipCurrent(t, s(110_000)); // Lap2: 2번 50초 보류 → 3번 자동 진입
    t = completeCurrent(t, s(200_000)); // Lap3: 3번 90초 완료 → 4번 자동 진입
    t = jumpTo(t, 2, s(200_500)); // 0.5초 만에 2번 선택 → 4번 자동 Lap은 폐기
    t = completeCurrent(t, s(270_500)); // Lap4: 2번 70초 완료

    expect(t.laps.map((l) => [l.lapNo, l.questionNo, l.durationMs, l.outcome])).toEqual([
      [1, 1, 60_000, 'completed'],
      [2, 2, 50_000, 'skipped'],
      [3, 3, 90_000, 'completed'],
      [4, 2, 70_000, 'completed'],
    ]);
    const logs = buildQuestionLogs(t.laps, 45);
    expect(logs[1].lapNos).toEqual([2, 4]);
    expect(logs[1].lapDurations).toEqual([50_000, 70_000]);
    expect(logs[1].totalMs).toBe(120_000);
    expect(logs[1].visits).toBe(2);
    expect(logs[1].isCompleted).toBe(true);
    expect(t.current?.questionNo).toBe(4);
    expect(getStatus(t, 2)).toBe('completed');

    const sum = summarize(logs);
    expect(sum.regressions.map((l) => l.questionNo)).toEqual([2]);
    expect(sum.avgFirstGiveUpMs).toBe(50_000);
  });

  it('다른 문항 직접 선택 시 진행 중 Lap은 부분 기록으로 저장', () => {
    let t = createTracker(20, s(0));
    t = jumpTo(t, 3, s(30_000));
    expect(t.laps[0]).toMatchObject({ lapNo: 1, questionNo: 1, durationMs: 30_000, outcome: 'switched' });
    expect(getStatus(t, 1)).toBe('skipped');
    expect(getStatus(t, 3)).toBe('active');
    t = finalizeTracker(t, s(45_000));
    expect(t.laps[1]).toMatchObject({ questionNo: 3, durationMs: 15_000, outcome: 'exam_end' });
    expect(t.finalized).toBe(true);
  });

  it('모든 문항 완료 시 current 는 null, 그리드로 재검토 가능', () => {
    let t = createTracker(2, s(0));
    t = completeCurrent(t, s(10_000));
    t = completeCurrent(t, s(20_000));
    expect(t.current).toBeNull();
    t = jumpTo(t, 1, s(25_000));
    t = completeCurrent(t, s(30_000));
    expect(buildQuestionLogs(t.laps, 2)[0].lapNos).toEqual([1, 3]);
  });
});

describe('보류 문항 탐색 (방향키)', () => {
  it('가장 최근 보류 문항과 다음 보류 문항', async () => {
    const { mostRecentSkipped, nextSkipped } = await import('./lapTracker');
    let t = createTracker(10, s(0));
    t = skipCurrent(t, s(10_000)); // 1 보류 → 2
    t = completeCurrent(t, s(20_000)); // 2 완료 → 3
    t = skipCurrent(t, s(30_000)); // 3 보류 → 4
    t = jumpTo(t, 7, s(40_000, 99_000)); // 4 이동(부분기록, 보류) → 7
    expect(mostRecentSkipped(t)).toBe(4);
    expect(nextSkipped(t, 7)).toBe(1); // 순환
    expect(nextSkipped(t, 1)).toBe(3);
    t = jumpTo(t, mostRecentSkipped(t)!, s(50_000, 200_000));
    expect(t.current?.questionNo).toBe(4);
    expect(mostRecentSkipped(t)).toBe(7); // 방금 떠난 7번이 최근 보류
  });
});

describe('훑어보기 Lap 폐기', () => {
  it('직접 선택한 문항을 1초 안에 떠나면 Lap을 남기지 않음', () => {
    let t = createTracker(10, s(0, 0));
    t = jumpTo(t, 5, s(20_000, 20_000)); // 1번 20초 기록
    t = jumpTo(t, 6, s(20_300, 20_300)); // 5번 0.3초 → 폐기
    expect(t.laps.map((l) => l.questionNo)).toEqual([1]);
    expect(t.current?.questionNo).toBe(6);
  });
});
