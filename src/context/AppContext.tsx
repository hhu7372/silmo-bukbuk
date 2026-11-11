import type { User } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { SITE } from '../config/site';
import { authEnabled, supabase } from '../lib/supabase';
import { GuestResultRepository, loadPrimitive, savePref, type ExamResultRepository } from '../repository/resultRepository';
import { SyncedResultRepository } from '../repository/syncedRepository';
import type { AppUser, Entitlement } from '../types';

export type ThemePref = 'system' | 'light' | 'dark';
export type OAuthProvider = 'kakao' | 'google';

export type RedeemResult = { ok: true; proUntil: string; days: number } | { ok: false; reason: 'not_found' | 'expired' | 'already_used' | 'used_up' | 'login' | 'error' };

interface AppContextValue {
  /** 로그인 기능 사용 가능 여부 (Supabase 설정됨) */
  authEnabled: boolean;
  authReady: boolean;
  user: AppUser | null;
  login: (provider: OAuthProvider) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<boolean>;
  /** 서버의 이용 권한 (로그인 회원만) */
  entitlement: Entitlement | null;
  refreshEntitlement: () => Promise<void>;
  /** EXP 모드 1회 사용 (베타 기간·Pro 는 항상 허용) */
  consumeExp: () => Promise<boolean>;
  redeemCode: (code: string) => Promise<RedeemResult>;
  isPro: boolean;
  repository: ExamResultRepository;
  /** 로그인 직후 기기 기록을 서버로 올린 개수 (안내용) */
  lastSyncCount: number | null;
  loginModalOpen: boolean;
  openLogin: () => void;
  closeLogin: () => void;
  /** 시험 화면의 테스트 도구(배속·시간 점프) 표시 */
  showDebug: boolean;
  setShowDebug: (v: boolean) => void;
  /** 화면 테마: 시스템 설정 따라가기 / 라이트 / 다크 */
  theme: ThemePref;
  setTheme: (t: ThemePref) => void;
  isDark: boolean;
  tutorialOpen: boolean;
  openTutorial: () => void;
  closeTutorial: () => void;
}

const Ctx = createContext<AppContextValue | null>(null);

function toAppUser(u: User): AppUser {
  const m = (u.user_metadata ?? {}) as Record<string, unknown>;
  const str = (k: string) => (typeof m[k] === 'string' ? (m[k] as string) : '');
  const email = u.email ?? str('email');
  return {
    id: u.id,
    name: str('full_name') || str('name') || str('nickname') || str('preferred_username') || (email ? email.split('@')[0] : '회원'),
    email,
    provider: String(u.app_metadata?.provider ?? ''),
    avatarUrl: str('avatar_url') || str('picture') || undefined,
  };
}

function toEntitlement(d: unknown): Entitlement | null {
  if (!d || typeof d !== 'object') return null;
  const o = d as Record<string, unknown>;
  return {
    isPro: !!o.is_pro,
    proUntil: typeof o.pro_until === 'string' ? o.pro_until : null,
    expUsed: Number(o.exp_used ?? 0),
    expLimit: Number(o.exp_limit ?? 10),
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [authReady, setAuthReady] = useState(!authEnabled);
  const [entitlement, setEntitlement] = useState<Entitlement | null>(null);
  const [syncTick, setSyncTick] = useState(0);
  const [lastSyncCount, setLastSyncCount] = useState<number | null>(null);
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  // ───────── 로그인 상태 ─────────
  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setUser(data.session?.user ? toAppUser(data.session.user) : null);
      setAuthReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ? toAppUser(session.user) : null);
      setAuthReady(true);
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const repository = useMemo<ExamResultRepository>(
    () => (supabase && user ? new SyncedResultRepository(supabase, user.id) : new GuestResultRepository()),
    // syncTick: 동기화가 끝나면 화면들이 목록을 다시 불러오도록 새 객체로 교체
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user?.id, syncTick],
  );

  const refreshEntitlement = useCallback(async () => {
    if (!supabase || !user) {
      setEntitlement(null);
      return;
    }
    const { data, error } = await supabase.rpc('get_entitlement');
    if (!error) setEntitlement(toEntitlement(data));
  }, [user]);

  // 로그인되면: 이용 권한 불러오기 + 이 기기 기록을 서버로 올리기 (한 번만)
  const syncedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!supabase || !user) {
      setEntitlement(null);
      syncedFor.current = null;
      return;
    }
    void refreshEntitlement();
    if (syncedFor.current === user.id) return;
    syncedFor.current = user.id;
    const repo = new SyncedResultRepository(supabase, user.id);
    void repo
      .syncLocal()
      .then((n) => {
        setLastSyncCount(n);
        setSyncTick((t) => t + 1);
      })
      .catch(() => setLastSyncCount(null));
    setLoginModalOpen(false);
  }, [user, refreshEntitlement]);

  const login = useCallback(async (provider: OAuthProvider) => {
    if (!supabase) return;
    savePref('return-path', window.location.pathname + window.location.search);
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}${window.location.pathname}` },
    });
  }, []);

  const logout = useCallback(async () => {
    if (!supabase) return;
    if (user) await new SyncedResultRepository(supabase, user.id).forgetLocal();
    await supabase.auth.signOut();
    setEntitlement(null);
  }, [user]);

  const deleteAccount = useCallback(async () => {
    if (!supabase || !user) return false;
    const { error } = await supabase.rpc('delete_my_account');
    if (error) return false;
    await new SyncedResultRepository(supabase, user.id).forgetLocal();
    await supabase.auth.signOut();
    setEntitlement(null);
    return true;
  }, [user]);

  const consumeExp = useCallback(async () => {
    if (SITE.betaFree) return true;
    if (!supabase || !user) return false;
    const { data, error } = await supabase.rpc('consume_exp');
    if (error) return false;
    const o = (data ?? {}) as Record<string, unknown>;
    setEntitlement((e) => ({ isPro: !!o.is_pro, proUntil: e?.proUntil ?? null, expUsed: Number(o.exp_used ?? 0), expLimit: Number(o.exp_limit ?? 10) }));
    return !!o.ok;
  }, [user]);

  const redeemCode = useCallback(
    async (code: string): Promise<RedeemResult> => {
      if (!supabase || !user) return { ok: false, reason: 'login' };
      const { data, error } = await supabase.rpc('redeem_code', { p_code: code });
      if (error) return { ok: false, reason: 'error' };
      const o = (data ?? {}) as Record<string, unknown>;
      if (!o.ok) {
        const r = String(o.reason);
        return { ok: false, reason: r === 'not_found' || r === 'expired' || r === 'already_used' || r === 'used_up' ? r : 'error' };
      }
      await refreshEntitlement();
      return { ok: true, proUntil: String(o.pro_until), days: Number(o.days) };
    },
    [user, refreshEntitlement],
  );

  // ───────── 테마 ─────────
  const [theme, setThemeState] = useState<ThemePref>(() => {
    const t = loadPrimitive<string>('theme', 'system');
    return t === 'light' || t === 'dark' ? t : 'system';
  });
  const [systemDark, setSystemDark] = useState(() => typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches);
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq) return;
    const on = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  const isDark = theme === 'dark' || (theme === 'system' && systemDark);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', isDark ? '#020617' : '#0f172a');
  }, [isDark]);
  const setTheme = useCallback((t: ThemePref) => {
    setThemeState(t);
    savePref('theme', t);
  }, []);

  // 개발 서버에서는 기본 표시, 배포본에서는 숨김. 주소에 ?debug=1 을 붙이거나 설정 화면에서 켤 수 있음
  const [showDebug, setShowDebugState] = useState<boolean>(() => {
    try {
      if (new URLSearchParams(window.location.search).get('debug') === '1') {
        savePref('debug-tools', true);
        return true;
      }
    } catch {
      /* ignore */
    }
    return loadPrimitive('debug-tools', import.meta.env.DEV);
  });
  const setShowDebug = useCallback((v: boolean) => {
    setShowDebugState(v);
    savePref('debug-tools', v);
  }, []);

  // 처음 방문하면 사용법 튜토리얼 자동 표시
  const [tutorialOpen, setTutorialOpen] = useState<boolean>(() => !loadPrimitive('tutorial-done', false));
  const closeTutorial = useCallback(() => {
    setTutorialOpen(false);
    savePref('tutorial-done', true);
  }, []);

  const isPro = !!entitlement?.isPro;

  const value = useMemo<AppContextValue>(
    () => ({
      authEnabled,
      authReady,
      user,
      login,
      logout,
      deleteAccount,
      entitlement,
      refreshEntitlement,
      consumeExp,
      redeemCode,
      isPro,
      repository,
      lastSyncCount,
      loginModalOpen,
      openLogin: () => setLoginModalOpen(true),
      closeLogin: () => setLoginModalOpen(false),
      showDebug,
      setShowDebug,
      theme,
      setTheme,
      isDark,
      tutorialOpen,
      openTutorial: () => setTutorialOpen(true),
      closeTutorial,
    }),
    [authReady, user, login, logout, deleteAccount, entitlement, refreshEntitlement, consumeExp, redeemCode, isPro, repository, lastSyncCount, loginModalOpen, showDebug, setShowDebug, theme, setTheme, isDark, tutorialOpen, closeTutorial],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp must be used inside AppProvider');
  return v;
}
