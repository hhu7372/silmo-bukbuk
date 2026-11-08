import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { createResultRepository, loadPrimitive, savePref, type ExamResultRepository } from '../repository/resultRepository';
import type { AppUser } from '../types';
import { SITE } from '../config/site';

export type ThemePref = 'system' | 'light' | 'dark';

interface AppContextValue {
  isPro: boolean;
  setPro: (v: boolean) => void;
  user: AppUser | null;
  login: (user: AppUser) => void;
  logout: () => void;
  repository: ExamResultRepository;
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

function readUser(): AppUser | null {
  try {
    const raw = localStorage.getItem('csat-timer:user');
    return raw ? (JSON.parse(raw) as AppUser) : null;
  } catch {
    return null;
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [isPro, setProState] = useState<boolean>(() => loadPrimitive('pro', false));
  const [user, setUser] = useState<AppUser | null>(readUser);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
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
  // 개발 서버에서는 기본 표시, 배포본에서는 숨김. 주소에 ?debug=1 을 붙이거나 계정 화면에서 켤 수 있음
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

  const setPro = useCallback((v: boolean) => {
    setProState(v);
    savePref('pro', v);
  }, []);

  const login = useCallback((u: AppUser) => {
    setUser(u);
    savePref('user', u);
    setLoginModalOpen(false);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    try {
      localStorage.removeItem('csat-timer:user');
    } catch {
      /* ignore */
    }
  }, []);

  const repository = useMemo(() => createResultRepository(user?.id ?? null), [user?.id]);

  const value = useMemo<AppContextValue>(
    () => ({
      isPro: SITE.betaFree ? false : isPro,
      setPro,
      user,
      login,
      logout,
      repository,
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
    [isPro, setPro, user, login, logout, repository, loginModalOpen, tutorialOpen, closeTutorial, showDebug, setShowDebug, theme, setTheme, isDark],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp must be used inside AppProvider');
  return v;
}
