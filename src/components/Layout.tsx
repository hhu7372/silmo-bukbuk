import { ArrowLeft, BarChart3, Crown, Moon, Settings, Sun, Timer, UserRound } from 'lucide-react';
import type { ReactNode } from 'react';
import { ADS, SITE } from '../config/site';
import { AdSlot } from './AdSlot';
import { useApp } from '../context/AppContext';
import { cx } from './ui';

export type NavTab = 'home' | 'history' | 'account';

function Header({ onBack }: { onBack?: () => void }) {
  const { isPro, setPro, user, isDark, setTheme } = useApp();
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between gap-3 px-4">
        <div className="flex min-w-0 items-center gap-2">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="-ml-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-700 hover:bg-slate-100"
              aria-label="뒤로가기"
              title="뒤로가기"
            >
              <ArrowLeft size={22} />
            </button>
          )}
          <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" className="h-8 w-8 shrink-0" width={32} height={32} />
          <div className="min-w-0 leading-tight">
            <div className="truncate text-base font-black tracking-tight text-slate-900">실모벅벅</div>
            <div className="truncate text-[11px] text-slate-500">모의고사 타이머{!SITE.betaFree && (user ? ` · ${user.name}님` : ' · 비회원')}</div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          className="flex h-9 w-9 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100"
          aria-label={isDark ? '라이트 모드로' : '다크 모드로'}
          title={isDark ? '라이트 모드로' : '다크 모드로'}
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        {SITE.betaFree ? (
          <span className="shrink-0 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700" title="베타 기간에는 모든 기능을 무료로 쓸 수 있습니다">
            BETA · 전 기능 무료
          </span>
        ) : (
        <button
          type="button"
          onClick={() => setPro(!isPro)}
          className={cx(
            'flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition',
            isPro ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-slate-300 bg-white text-slate-600',
          )}
          aria-pressed={isPro}
          title="Pro 구독 시뮬레이션: 광고 제거 + EXP 모드 무제한"
        >
          <Crown size={14} className={isPro ? 'fill-amber-400 text-amber-500' : ''} />
          Pro 모드 {isPro ? 'ON' : 'OFF'}
        </button>
        )}
        </div>
      </div>
    </header>
  );
}

function BottomNav({ tab, onTab }: { tab: NavTab; onTab: (t: NavTab) => void }) {
  const items: Array<{ id: NavTab; label: string; icon: ReactNode }> = [
    { id: 'home', label: '타이머 홈', icon: <Timer size={20} /> },
    { id: 'history', label: '누적 기록 및 오답 통계', icon: <BarChart3 size={20} /> },
    SITE.betaFree
      ? { id: 'account', label: '설정', icon: <Settings size={20} /> }
      : { id: 'account', label: '로그인/계정 설정', icon: <UserRound size={20} /> },
  ];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto grid h-16 max-w-3xl grid-cols-3">
        {items.map((it) => (
          <button
            key={it.id}
            type="button"
            onClick={() => onTab(it.id)}
            className={cx(
              'flex flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-semibold sm:text-xs',
              tab === it.id ? 'text-blue-700' : 'text-slate-500 hover:text-slate-800',
            )}
          >
            {it.icon}
            <span className="truncate">{it.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}

export function Layout({
  children,
  tab,
  onTab,
  onBack,
  onFeedback,
  showNav,
  immersive,
}: {
  children: ReactNode;
  tab: NavTab;
  onTab: (t: NavTab) => void;
  onBack?: () => void;
  onFeedback?: (kind: 'feedback' | 'inquiry') => void;
  showNav: boolean;
  /** 시험 진행 화면 등 */
  immersive?: boolean;
}) {
  const { isPro } = useApp();
  // 시험 중에는 집중을 위해 광고를 숨김 (태블릿 가로 화면은 넓은 2단 배치)
  const showAds = !isPro && !immersive;
  // 하단 여백: 네비(64px) + 모바일 띠 배너(50px)
  const bottomPad = cx(immersive ? 'pb-3' : showNav ? 'pb-20' : 'pb-6', showAds && (showNav ? 'max-lg:pb-[136px]' : 'max-lg:pb-[72px]'));

  return (
    <div className={cx('app-root min-h-screen', immersive && isPro ? 'bg-slate-950' : 'bg-slate-100')}>
      {/* 시험 화면은 시계와 풀이 버튼만 보이도록 상단 바를 숨김 */}
      {!immersive && <Header onBack={onBack} />}
      <div className="mx-auto flex w-full max-w-[1440px] justify-center gap-6 lg:px-4">
        {showAds && (
          <aside className="hidden w-[160px] shrink-0 pt-6 lg:block xl:w-[300px]">
            <div className="sticky top-20">
              <AdSlot label="AdSense Left Slot" slot={ADS.slots.left} className="h-[600px] w-full" />
            </div>
          </aside>
        )}
        <main className={cx('mx-auto w-full min-w-0 px-4', immersive ? 'pt-3' : 'pt-4 sm:pt-6', immersive ? 'max-w-3xl lg:max-w-6xl' : 'max-w-3xl', bottomPad)}>
          {children}
          {showNav && (
            <footer className="mt-10 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
              <span>© {new Date().getFullYear()} {SITE.name}</span>
              <a href="./privacy.html" className="underline-offset-2 hover:text-slate-600 hover:underline">
                개인정보 처리방침
              </a>
              {onFeedback && (
                <>
                  <button type="button" onClick={() => onFeedback('feedback')} className="underline-offset-2 hover:text-slate-600 hover:underline">
                    의견 보내기
                  </button>
                  <button type="button" onClick={() => onFeedback('inquiry')} className="underline-offset-2 hover:text-slate-600 hover:underline">
                    문의하기
                  </button>
                </>
              )}
              {SITE.betaFree && <span>베타 서비스</span>}
            </footer>
          )}
        </main>
        {showAds && (
          <aside className="hidden w-[160px] shrink-0 pt-6 lg:block xl:w-[300px]">
            <div className="sticky top-20">
              <AdSlot label="AdSense Right Slot" slot={ADS.slots.right} className="h-[600px] w-full" />
            </div>
          </aside>
        )}
      </div>
      {showAds && (
        <div className={cx('fixed inset-x-0 z-20 bg-white px-2 lg:hidden', showNav ? 'bottom-16' : 'bottom-0')}>
          <AdSlot label="AdSense Mobile Bottom Banner (320x50)" slot={ADS.slots.mobile} size={[320, 50]} className="mx-auto h-[50px] max-w-3xl rounded-none border-x-0" />
        </div>
      )}
      {showNav && <BottomNav tab={tab} onTab={onTab} />}
    </div>
  );
}
