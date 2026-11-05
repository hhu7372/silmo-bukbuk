import { describe, expect, it } from 'vitest';
import { PRESET_GROUPS, UNGROUPED, groupOf, parseKeywords, sortResults } from './recordGroups';

describe('응시 기록 묶음', () => {
  it('키워드로 그룹 판정 (공백/대소문자 무시, 위 그룹 우선)', () => {
    expect(groupOf({ mockName: '2027학년도 9월 모의평가' }, PRESET_GROUPS)).toBe('g_kice');
    expect(groupOf({ mockName: '2026년 10월 고3 전국연합학력평가' }, PRESET_GROUPS)).toBe('g_edu');
    expect(groupOf({ mockName: '더 프리미엄 모의고사 5월호' }, PRESET_GROUPS)).toBe('g_private');
    expect(groupOf({ mockName: '자체 모의고사' }, PRESET_GROUPS)).toBe(UNGROUPED);
    expect(groupOf({}, PRESET_GROUPS)).toBe(UNGROUPED);
  });
  it('키워드 입력 파싱과 정렬', () => {
    expect(parseKeywords('더프리미엄, 이감 / 상상, 이감')).toEqual(['더프리미엄', '이감', '상상']);
    const list = [{ createdAt: '2026-03-01' }, { createdAt: '2026-05-01' }];
    expect(sortResults(list, 'desc')[0].createdAt).toBe('2026-05-01');
    expect(sortResults(list, 'asc')[0].createdAt).toBe('2026-03-01');
  });
});
