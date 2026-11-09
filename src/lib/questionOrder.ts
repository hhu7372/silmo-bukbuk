import type { ExamSection } from '../data/examConfigData';

export type OrderMode = 'number' | 'sections' | 'custom';

/** "35-45, 18-34, 1-17" / "35~45 18~34" → 문항 번호 배열 (범위 밖·중복은 오류) */
export function parseRanges(text: string, total: number): { list: number[]; error?: string } {
  const parts = text
    .replace(/[~–—]/g, '-')
    .split(/[,\s]+/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (!parts.length) return { list: [], error: '순서를 입력해주세요. 예: 35-45, 18-34, 1-17' };
  const list: number[] = [];
  const seen = new Set<number>();
  for (const p of parts) {
    const m = p.match(/^(\d+)(?:-(\d+))?$/);
    if (!m) return { list, error: `"${p}" 를 읽을 수 없어요. 35-45 처럼 숫자와 - 로 적어주세요.` };
    const a = Number(m[1]);
    const b = m[2] ? Number(m[2]) : a;
    if (a < 1 || b < 1 || a > total || b > total) return { list, error: `${p}: 1~${total}번 사이로 적어주세요.` };
    const step = a <= b ? 1 : -1;
    for (let q = a; step > 0 ? q <= b : q >= b; q += step) {
      if (seen.has(q)) return { list, error: `${q}번이 두 번 들어갔어요.` };
      seen.add(q);
      list.push(q);
    }
  }
  return { list };
}

/** 빠진 문항은 번호순으로 뒤에 붙여 전체 순서를 완성 */
export function completeOrder(list: number[], total: number): number[] {
  const seen = new Set(list);
  const rest = Array.from({ length: total }, (_, i) => i + 1).filter((q) => !seen.has(q));
  return [...list, ...rest];
}

export function sectionsOrder(sections: ExamSection[], ids: string[], total: number): number[] {
  const byId = new Map(sections.map((s) => [s.id, s]));
  const ordered = [...ids.map((id) => byId.get(id)).filter((s): s is ExamSection => !!s), ...sections.filter((s) => !ids.includes(s.id))];
  const list: number[] = [];
  for (const s of ordered) for (let q = s.q_start; q <= Math.min(s.q_end, total); q++) list.push(q);
  return completeOrder(list, total);
}

/** "35~45 → 18~34 → 1~17" 처럼 연속 구간으로 줄여 표시 */
export function orderLabel(order: number[]): string {
  const parts: string[] = [];
  let i = 0;
  while (i < order.length) {
    let j = i;
    const dir = order[i + 1] === order[i] + 1 ? 1 : order[i + 1] === order[i] - 1 ? -1 : 0;
    if (dir) while (j + 1 < order.length && order[j + 1] === order[j] + dir) j++;
    parts.push(i === j ? `${order[i]}` : `${order[i]}~${order[j]}`);
    i = j + 1;
  }
  return parts.join(' → ');
}

export function isDefaultOrder(order: number[]): boolean {
  return order.every((q, i) => q === i + 1);
}
