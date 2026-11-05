/**
 * EXP 모드 이용 한도
 *  - 비회원: 사용 불가 (회원가입 유도)
 *  - 회원: 무료 10회
 *  - Pro 구독: 무제한
 * 현재는 브라우저(localStorage)에 기록하는 데모 구현입니다.
 * 실제 서비스에서는 서버(Supabase 등)에서 계정 단위로 차감해야 우회할 수 없습니다.
 */
export const FREE_EXP_SESSIONS = 10;

export type ExpAccess =
  | { kind: 'guest' }
  | { kind: 'member'; remaining: number; used: number }
  | { kind: 'exhausted'; used: number }
  | { kind: 'pro' };

const key = (userId: string) => `csat-timer:exp-used:${userId}`;

export function getExpUsed(userId: string): number {
  try {
    const n = Number(localStorage.getItem(key(userId)) ?? '0');
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  } catch {
    return 0;
  }
}

export function consumeExp(userId: string): number {
  const next = getExpUsed(userId) + 1;
  try {
    localStorage.setItem(key(userId), String(next));
  } catch {
    /* 저장 불가 환경 */
  }
  return next;
}

export function getExpAccess(userId: string | null, isPro: boolean): ExpAccess {
  if (isPro) return { kind: 'pro' };
  if (!userId) return { kind: 'guest' };
  const used = getExpUsed(userId);
  const remaining = Math.max(0, FREE_EXP_SESSIONS - used);
  return remaining > 0 ? { kind: 'member', remaining, used } : { kind: 'exhausted', used };
}

export function canUseExp(a: ExpAccess): boolean {
  return a.kind === 'pro' || a.kind === 'member';
}
