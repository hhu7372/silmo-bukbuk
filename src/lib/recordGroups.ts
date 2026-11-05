/**
 * 응시 기록 묶음(그룹) – 사용자가 직접 설계하는 분류
 * 모의고사 이름에 키워드가 들어 있으면 그 그룹에 들어갑니다. (위에 있는 그룹이 우선)
 * 예) "더프리미엄" 시리즈, "학력평가/학평", "모의평가/평가원"
 */
import type { ExamResult } from '../types';

export interface RecordGroup {
  id: string;
  name: string;
  keywords: string[];
}

export type SortOrder = 'desc' | 'asc';

export interface HistoryView {
  order: SortOrder;
  /** 추가 옵션: 묶어서 보기 */
  grouped: boolean;
  groups: RecordGroup[];
  /** 'all' | 그룹 id | UNGROUPED */
  active: string;
}

export const UNGROUPED = '__none__';

export const PRESET_GROUPS: RecordGroup[] = [
  { id: 'g_kice', name: '평가원 모의평가', keywords: ['모의평가', '평가원', '대학수학능력시험'] },
  { id: 'g_edu', name: '교육청 학력평가', keywords: ['학력평가', '학평'] },
  { id: 'g_private', name: '사설 모의고사', keywords: ['더프리미엄', '이감', '상상', '바탕', '시대인재', '서바이벌', '강대'] },
];

export const DEFAULT_VIEW: HistoryView = { order: 'desc', grouped: false, groups: PRESET_GROUPS, active: 'all' };

/** "더프리미엄, 이감 / 상상" → ['더프리미엄', '이감', '상상'] */
export function parseKeywords(text: string): string[] {
  return [...new Set(text.split(/[,/|·\n]+/).map((k) => k.trim()).filter(Boolean))];
}

export function groupOf(result: Pick<ExamResult, 'mockName'>, groups: RecordGroup[]): string {
  const name = (result.mockName ?? '').toLowerCase().replace(/\s+/g, '');
  if (!name) return UNGROUPED;
  for (const g of groups) {
    if (g.keywords.some((k) => k && name.includes(k.toLowerCase().replace(/\s+/g, '')))) return g.id;
  }
  return UNGROUPED;
}

export function sortResults<T extends Pick<ExamResult, 'createdAt'>>(list: T[], order: SortOrder): T[] {
  return [...list].sort((a, b) => (order === 'desc' ? b.createdAt.localeCompare(a.createdAt) : a.createdAt.localeCompare(b.createdAt)));
}
