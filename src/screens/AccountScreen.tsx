import { Crown, Download, LogIn, LogOut, Mail, MessageSquareHeart, MonitorSmartphone, Trash2, UserRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { confirmAsync } from '../components/ConfirmHost';
import { Card, SectionTitle, Toggle } from '../components/ui';
import { FREE_EXP_SESSIONS, getExpAccess } from '../lib/expQuota';
import { SITE } from '../config/site';
import { useApp } from '../context/AppContext';

export function AccountScreen({ onFeedback }: { onFeedback: (kind: 'feedback' | 'inquiry') => void }) {
  const { user, openLogin, logout, isPro, setPro, repository, openTutorial, showDebug, setShowDebug } = useApp();
  const [count, setCount] = useState<number | null>(null);
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
        <UserRound size={22} /> {SITE.betaFree ? '설정' : '로그인 / 계정 설정'}
      </h1>

      {SITE.betaFree ? (
        <Card className="border-emerald-200 bg-emerald-50">
          <div className="text-base font-black text-emerald-900">🎉 베타 기간 무료</div>
          <p className="mt-1 text-sm text-emerald-900/80">
            지금은 베타 기간이라 로그인 없이 EXP 모드(문항별 시간 측정)를 포함한 모든 기능을 무료로 쓸 수 있습니다. 기록은 이 브라우저에 저장되니, 같은 기기·같은 브라우저에서 이용해주세요.
          </p>
        </Card>
      ) : (
        <>
      <Card>
        {user ? (
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-lg font-black text-white">{user.name.slice(0, 1)}</div>
              <div>
                <div className="font-bold text-slate-900">{user.name}</div>
                <div className="text-xs text-slate-500">
                  {user.email} · {user.provider}
                </div>
              </div>
            </div>
            <button type="button" onClick={logout} className="flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">
              <LogOut size={14} /> 로그아웃
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              현재 <b>비회원 모드</b>입니다. 기록은 이 브라우저(localStorage)에만 저장됩니다. 로그인하면 모든 기기에서 파트별 누적 오답률과 시간 단축 추이를 확인할 수 있습니다.
            </p>
            <button type="button" onClick={openLogin} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 text-sm font-bold text-white">
              <LogIn size={16} /> 로그인 / 회원가입
            </button>
          </div>
        )}
      </Card>

      <Card>
        <SectionTitle icon={<Crown size={18} className="text-amber-500" />}>Pro 구독 (시뮬레이션)</SectionTitle>
        <Toggle checked={isPro} onChange={setPro} label={`Pro 구독 ${isPro ? 'ON' : 'OFF'}`} description="광고 제거 + EXP 모드(문항별 시간 측정) 무제한" />
        <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
          {(() => {
            const a = getExpAccess(user?.id ?? null, isPro);
            if (a.kind === 'pro') return 'EXP 모드: 무제한 (Pro)';
            if (a.kind === 'guest') return `EXP 모드: 회원가입 시 ${FREE_EXP_SESSIONS}회 무료`;
            if (a.kind === 'member') return `EXP 모드: 무료 ${FREE_EXP_SESSIONS}회 중 ${a.remaining}회 남음`;
            return `EXP 모드: 무료 ${FREE_EXP_SESSIONS}회를 모두 사용했습니다. Pro 구독 시 무제한`;
          })()}
        </div>
      </Card>

        </>
      )}

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
    </div>
  );
}
