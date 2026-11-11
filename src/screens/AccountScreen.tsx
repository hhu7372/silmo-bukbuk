import { Crown, Download, LogIn, LogOut, Mail, MessageSquareHeart, MonitorSmartphone, Trash2, UserRound } from 'lucide-react';
import { formatDateTime } from '../lib/time';
import { useEffect, useState } from 'react';
import { confirmAsync } from '../components/ConfirmHost';
import { Card, SectionTitle, Toggle } from '../components/ui';
import { getExpAccess } from '../lib/expQuota';
import { SITE } from '../config/site';
import { useApp } from '../context/AppContext';

export function AccountScreen({ onFeedback }: { onFeedback: (kind: 'feedback' | 'inquiry') => void }) {
  const { user, authEnabled, authReady, openLogin, logout, deleteAccount, isPro, entitlement, redeemCode, lastSyncCount, repository, openTutorial, showDebug, setShowDebug, theme, setTheme } = useApp();
  const [count, setCount] = useState<number | null>(null);
  const [code, setCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [codeMsg, setCodeMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const redeem = async () => {
    setRedeeming(true);
    const r = await redeemCode(code);
    setRedeeming(false);
    if (r.ok) {
      setCode('');
      setCodeMsg({ ok: true, text: `Pro ${r.days}일이 적용됐어요. ${formatDateTime(r.proUntil).slice(0, 10)}까지 이용할 수 있어요.` });
      return;
    }
    const reasons: Record<string, string> = {
      not_found: '없는 코드예요. 철자를 확인해주세요.',
      expired: '사용 기한이 지난 코드예요.',
      already_used: '이미 이 계정에서 사용한 코드예요.',
      used_up: '사용 가능 횟수가 모두 끝난 코드예요.',
      login: '로그인 후 사용할 수 있어요.',
      error: '확인하지 못했어요. 잠시 후 다시 시도해주세요.',
    };
    setCodeMsg({ ok: false, text: reasons[r.reason] });
  };

  const removeAccount = async () => {
    const ok = await confirmAsync('회원 탈퇴하면 계정과 서버에 저장된 모든 기록, 남은 Pro 기간이 즉시 삭제되고 되돌릴 수 없어요. 탈퇴할까요?', { confirmLabel: '탈퇴하기', danger: true });
    if (!ok) return;
    const done = await deleteAccount();
    if (!done) await confirmAsync('탈퇴를 처리하지 못했어요. 잠시 후 다시 시도하거나 문의하기로 알려주세요.', { confirmLabel: '확인' });
  };
  const wakeLockSupported = typeof navigator !== 'undefined' && 'wakeLock' in navigator;
  const audioSupported = typeof window !== 'undefined' && 'AudioContext' in window;
  const speechSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  useEffect(() => {
    void repository.list().then((r) => setCount(r.length));
  }, [repository]);

  const exportData = async () => {
    const data = await repository.list();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `exam-results-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearAll = async () => {
    if (!(await confirmAsync('저장된 모든 시험 기록을 삭제합니다. 되돌릴 수 없습니다. 계속할까요?', { confirmLabel: '전체 삭제', danger: true }))) return;
    await repository.clear();
    setCount(0);
  };

  return (
    <div className="space-y-4">
      <h1 className="flex items-center gap-2 text-xl font-black text-slate-900">
        <UserRound size={22} /> 내 계정 · 설정
      </h1>

      {/* 계정 */}
      <Card>
        {!authEnabled ? (
          <p className="text-sm text-slate-600">로그인 기능을 준비하고 있어요. 지금은 기록이 이 기기의 브라우저에만 저장됩니다.</p>
        ) : !authReady ? (
          <p className="text-sm text-slate-400">계정 정보를 불러오는 중…</p>
        ) : user ? (
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-900 text-lg font-black text-white">
                {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" /> : user.name.slice(0, 1)}
              </div>
              <div className="min-w-0">
                <div className="truncate font-bold text-slate-900">{user.name}</div>
                <div className="truncate text-xs text-slate-500">
                  {user.provider === 'kakao' ? '카카오' : user.provider === 'google' ? 'Google' : user.provider} 로그인{user.email ? ` · ${user.email}` : ''}
                </div>
              </div>
            </div>
            <button type="button" onClick={() => void logout()} className="flex shrink-0 items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">
              <LogOut size={14} /> 로그아웃
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              지금은 <b>비회원</b>이라 기록이 이 기기에만 저장돼요. 로그인하면 휴대폰·태블릿·PC에서 같은 기록을 보고, 이 기기의 기록도 계정으로 옮겨집니다.
            </p>
            <button type="button" onClick={openLogin} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 text-sm font-bold text-white">
              <LogIn size={16} /> 카카오 · Google로 로그인
            </button>
          </div>
        )}
        {user && lastSyncCount !== null && lastSyncCount > 0 && (
          <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">이 기기에 있던 기록 {lastSyncCount}개를 계정에 저장했어요.</p>
        )}
      </Card>

      {/* 이용권 */}
      <Card>
        <SectionTitle icon={<Crown size={18} className="text-amber-500" />}>실모벅벅 Pro</SectionTitle>
        <ul className="mb-3 space-y-1 text-sm text-slate-600">
          <li>· EXP 모드(문항별 시간 측정) 무제한</li>
          <li>· 광고 없이 이용</li>
          <li>· 휴대폰·태블릿·PC 기록 동기화 (로그인 회원 모두 제공)</li>
        </ul>
        <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
          {(() => {
            const a = getExpAccess(user, entitlement);
            if (a.kind === 'beta') return '🎉 지금은 베타 기간이라 모든 기능이 무료입니다.';
            if (a.kind === 'pro') return `Pro 이용 중${a.until ? ` · ${formatDateTime(a.until).slice(0, 10)}까지` : ''}`;
            if (a.kind === 'guest') return '로그인하면 EXP 모드를 무료로 10회 쓸 수 있어요.';
            if (a.kind === 'member') return `무료 회원 · EXP 모드 ${a.limit}회 중 ${a.remaining}회 남음`;
            return `무료 회원 · EXP 모드 무료 ${a.limit}회를 모두 사용했어요.`;
          })()}
          {isPro && entitlement?.proUntil && SITE.betaFree && <div className="mt-1 text-xs text-amber-700">Pro 이용권: {formatDateTime(entitlement.proUntil).slice(0, 10)}까지</div>}
        </div>

        {user && (
          <form
            className="mt-3"
            onSubmit={(e) => {
              e.preventDefault();
              void redeem();
            }}
          >
            <label htmlFor="pro-code" className="text-xs font-semibold text-slate-600">
              이용권 코드
            </label>
            <div className="mt-1 flex gap-2">
              <input
                id="pro-code"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase());
                  setCodeMsg(null);
                }}
                placeholder="SILBUK-XXXX-XXXX"
                autoComplete="off"
                className="h-11 min-w-0 flex-1 rounded-xl border border-slate-300 px-3 font-mono text-sm tracking-wider outline-none focus:border-blue-500"
              />
              <button type="submit" disabled={!code.trim() || redeeming} className="h-11 shrink-0 rounded-xl bg-amber-500 px-4 text-sm font-bold text-white disabled:opacity-50">
                {redeeming ? '확인 중…' : '사용하기'}
              </button>
            </div>
            {codeMsg && <p className={`mt-1 text-xs font-semibold ${codeMsg.ok ? 'text-emerald-700' : 'text-red-600'}`}>{codeMsg.text}</p>}
          </form>
        )}
        <p className="mt-3 text-[11px] text-slate-500">구독 결제는 준비 중입니다. 이벤트 등으로 받은 이용권 코드를 {user ? '위에 입력하면' : '로그인 후 이곳에 입력하면'} Pro가 바로 적용됩니다.</p>
      </Card>

      <Card>
        <SectionTitle>데이터 관리</SectionTitle>
        <p className="mb-3 text-sm text-slate-600">저장된 기록: {count === null ? '…' : `${count}개`}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <button type="button" onClick={() => void exportData()} className="flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 text-sm font-bold text-slate-700 hover:bg-slate-50">
            <Download size={16} /> JSON 내보내기
          </button>
          <button type="button" onClick={() => void clearAll()} className="flex h-11 items-center justify-center gap-2 rounded-xl border border-red-300 text-sm font-bold text-red-600 hover:bg-red-50">
            <Trash2 size={16} /> 전체 기록 삭제
          </button>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => onFeedback('feedback')} className="flex flex-col items-start rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm hover:border-blue-400">
          <MessageSquareHeart size={22} className="text-rose-500" />
          <span className="mt-2 text-sm font-black text-slate-900">의견 보내기</span>
          <span className="text-xs text-slate-500">개선 아이디어, 불편한 점</span>
        </button>
        <button type="button" onClick={() => onFeedback('inquiry')} className="flex flex-col items-start rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm hover:border-blue-400">
          <Mail size={22} className="text-blue-600" />
          <span className="mt-2 text-sm font-black text-slate-900">문의하기</span>
          <span className="text-xs text-slate-500">사용 방법, 오류 신고</span>
        </button>
      </div>

      <Card>
        <SectionTitle>화면 테마</SectionTitle>
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-200 p-1">
          {(
            [
              ['system', '기기 설정'],
              ['light', '라이트'],
              ['dark', '다크'],
            ] as const
          ).map(([v, label]) => (
            <button
              key={v}
              type="button"
              onClick={() => setTheme(v)}
              aria-pressed={theme === v}
              className={`h-10 rounded-lg text-sm font-bold ${theme === v ? 'bg-white text-slate-900 shadow' : 'text-slate-600'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-500">"기기 설정"은 휴대폰·태블릿의 다크 모드 설정을 따라갑니다.</p>
      </Card>

      <Card>
        <SectionTitle>테스트 도구</SectionTitle>
        <Toggle
          checked={showDebug}
          onChange={setShowDebug}
          label="시험 화면에 테스트 도구 표시"
          description="배속(1x/10x/60x), 종료 N분 전으로 점프, 대기 건너뛰기 버튼을 시험 화면 위쪽에 보여줍니다."
        />
      </Card>

      <button type="button" onClick={openTutorial} className="h-11 w-full rounded-xl border border-slate-300 bg-white text-sm font-bold text-slate-700 hover:bg-slate-50">
        사용법 다시 보기
      </button>

      <Card>
        <SectionTitle icon={<MonitorSmartphone size={18} />}>기기 호환성</SectionTitle>
        <ul className="space-y-1 text-sm">
          <li>화면 꺼짐 방지 (Wake Lock): {wakeLockSupported ? '✅ 지원' : '⚠️ 미지원 — 기기 화면 자동 잠금을 꺼주세요'}</li>
          <li>타종 소리 (Web Audio): {audioSupported ? '✅ 지원' : '⚠️ 미지원'}</li>
          <li>안내 음성 (Speech Synthesis): {speechSupported ? '✅ 지원' : '⚠️ 미지원 (타종만 재생)'}</li>
        </ul>
      </Card>

      {user && (
        <div className="px-1 pb-2 text-center">
          <button type="button" onClick={() => void removeAccount()} className="text-xs font-semibold text-slate-400 underline-offset-2 hover:text-red-600 hover:underline">
            회원 탈퇴
          </button>
        </div>
      )}
    </div>
  );
}
