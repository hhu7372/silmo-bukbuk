import { describe, expect, it } from 'vitest';
import { completeCurrent, createTracker, nextSkipped, skipCurrent } from './lapTracker';
import { completeOrder, orderLabel, parseRanges, sectionsOrder } from './questionOrder';

const s = (exam: number) => ({ exam, real: exam });
const KOR = [
  { id: 'reading', name: '독서', q_start: 1, q_end: 17 },
  { id: 'literature', name: '문학', q_start: 18, q_end: 34 },
  { id: 'elective', name: '선택', q_start: 35, q_end: 45 },
];

describe('풀이 순서', () => {
  it('파트 순서: 선택 → 문학 → 독서', () => {
    const order = sectionsOrder(KOR, ['elective', 'literature', 'reading'], 45);
    expect(order.slice(0, 3)).toEqual([35, 36, 37]);
    expect(order[11]).toBe(18);
    expect(order).toHaveLength(45);
    expect(orderLabel(order)).toBe('35~45 → 18~34 → 1~17');
  });

  it('직접 입력 해석과 오류', () => {
    expect(parseRanges('35-45, 18~34 1-17', 45).list).toHaveLength(45);
    expect(parseRanges('30-25', 30).list).toEqual([30, 29, 28, 27, 26, 25]);
    expect(parseRanges('1-10, 5', 45).error).toContain('5번이 두 번');
    expect(parseRanges('40-50', 45).error).toContain('1~45');
    expect(completeOrder([3, 1], 4)).toEqual([3, 1, 2, 4]);
  });

  it('트래커가 순서를 따라 이동 (마지막 다음은 순서의 처음으로)', () => {
    const order = sectionsOrder(KOR, ['elective', 'literature', 'reading'], 45);
    let t = createTracker(45, s(0), 1, order);
    expect(t.current?.questionNo).toBe(35);
    for (let i = 0; i < 11; i++) t = completeCurrent(t, s((i + 1) * 1000));
    expect(t.current?.questionNo).toBe(18); // 45번 다음은 문학 18번
    t = skipCurrent(t, s(20_000)); // 18 보류 → 19
    expect(t.current?.questionNo).toBe(19);
    expect(nextSkipped(t, 19)).toBe(18);
  });
});
