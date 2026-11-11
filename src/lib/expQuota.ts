/**
 * EXP 모드 이용 한도 (서버 기준)
 *  - 베타 기간: 모두 무제한
 *  - 비회원: 사용 불가 (로그인 유도)
 *  - 회원: 무료 N회 (서버 entitlements.exp_used / exp_free_limit())
 *  - Pro: 무제한
 * 실제 차감은 시험 시작 때 서버 함수 consume_exp() 로 합니다.
 */
import { SITE } from '../config/site';
import type { AppUser, Entitlement } from '../types';

export const FREE_EXP_SESSIONS = 10;

export type ExpAccess =
  | { kind: 'beta' }
  | { kind: 'guest' }
  | { kind: 'member'; remaining: number; used: number; limit: number }
  | { kind: 'exhausted'; used: number; limit: number }
  | { kind: 'pro'; until: string | null };

export function getExpAccess(user: AppUser | null, entitlement: Entitlement | null): ExpAccess {
  if (SITE.betaFree) return { kind: 'beta' };
  if (!user) return { kind: 'guest' };
  if (entitlement?.isPro) return { kind: 'pro', until: entitlement.proUntil };
  const limit = entitlement?.expLimit ?? FREE_EXP_SESSIONS;
  const used = entitlement?.expUsed ?? 0;
  const remaining = Math.max(0, limit - used);
  return remaining > 0 ? { kind: 'member', remaining, used, limit } : { kind: 'exhausted', used, limit };
}

export function canUseExp(a: ExpAccess): boolean {
  return a.kind === 'beta' || a.kind === 'pro' || a.kind === 'member';
}
