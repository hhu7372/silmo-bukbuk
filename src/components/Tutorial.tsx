import { BarChart3, CheckCircle2, ChevronLeft, ChevronRight, ClipboardCheck, Clock, Crown, FolderKanban, PauseCircle, Settings2, Timer, Volume2, X } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { useApp } from '../context/AppContext';
import { SITE } from '../config/site';
import { cx } from './ui';

interface Step {
  icon: ReactNode;
  tint: string;
  title: string;
  body: ReactNode;
  visual: ReactNode;
}

function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="inline-flex min-w-[2rem] items-center justify-center rounded-md border border-slate-300 bg-white px-1.5 py-0.5 font-mono text-xs font-bold text-slate-700 shadow-sm">{children}</kbd>;
}

const STEPS: Step[] = [
  {
    icon: <Timer size={26} />,
    tint: 'bg-slate-900 text-white',
    title: '실모벅벅에 오신 걸 환영해요',
    body: '실모벅벅은 실제 수능 시간표대로 흐르는 시계로 모의고사를 풀고, 문항마다 걸린 시간과 오답을 기록해 약점을 찾는 앱입니다.',
    visual: (
      <div className="grid grid-cols-3 gap-2 text-center text-[11px] font-semibold text-slate-600">
        {[
          ['1', '과목 선택·설정'],
          ['2', '시험 응시'],
          ['3', '채점·분석'],
        ].map(([n, t]) => (
          <div key={n} className="rounded-xl bg-white p-2 shadow-sm">
            <div className="mx-auto mb-1 flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-xs font-black text-white">{n}</div>
            {t}
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: <Settings2 size={26} />,
    tint: 'bg-blue-600 text-white',
    title: '과목을 고르고 시험 환경 설정',
    body: '홈에서 과목을 누르면 시계 모양(수능 표준형·교실 벽걸이형), 실제 시각/카운트다운, 대기 시작 시점(없음·준비령부터·직접 설정)을 고를 수 있습니다.',
    visual: (
      <div className="space-y-1.5 text-xs">
        <div className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 shadow-sm">
          <Clock size={14} className="text-blue-600" /> 국어 · 08:40 ~ 10:00 · 80분 · 45문항
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 shadow-sm">
          <Volume2 size={14} className="text-blue-600" /> 소리를 켜면 수능 방송 음원으로 준비령·본령·종료령 재생
        </div>
      </div>
    ),
  },
  {
    icon: <CheckCircle2 size={26} />,
    tint: 'bg-emerald-600 text-white',
    title: 'EXP 모드로 문항별 시간 측정',
    body: '한 문제를 풀 때마다 "풀이 완료", 막히면 "보류"를 누르세요. 건너뛰었다가 돌아와 푼 시간까지 나눠서 기록됩니다.' + (SITE.betaFree ? ' 베타 기간에는 무료로 무제한 쓸 수 있습니다.' : ' 회원은 10회 무료, Pro 구독은 무제한입니다.'),
    visual: (
      <div className="space-y-2">
        <div className="flex gap-2">
          <div className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-blue-600 py-2 text-xs font-black text-white">
            <CheckCircle2 size={14} /> 풀이 완료
          </div>
          <div className="flex items-center justify-center gap-1 rounded-xl border-2 border-orange-400 bg-orange-50 px-3 text-xs font-bold text-orange-700">
            <PauseCircle size={14} /> 보류
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-600">
          <span>
            <Kbd>Space</Kbd> 완료
          </span>
          <span>
            <Kbd>→</Kbd> 보류
          </span>
          <span>
            <Kbd>←</Kbd> 최근 보류
          </span>
          <span>
            <Kbd>↓</Kbd> 다음 보류
          </span>
        </div>
      </div>
    ),
  },
  {
    icon: <ClipboardCheck size={26} />,
    tint: 'bg-violet-600 text-white',
    title: '정답과 내 답을 넣으면 자동 채점',
    body: '시험이 끝나면 모의고사 이름을 적고, 정답과 내 답을 "12345 51512" 처럼 빠르게 입력하세요. 수학 단답형은 칸이 따로 있습니다.',
    visual: (
      <div className="space-y-1.5 font-mono text-xs">
        <div className="rounded-lg bg-white px-3 py-2 shadow-sm">
          <span className="mr-2 font-sans text-[11px] font-semibold text-slate-500">정답</span>12345 51512 31312
        </div>
        <div className="rounded-lg bg-white px-3 py-2 shadow-sm">
          <span className="mr-2 font-sans text-[11px] font-semibold text-slate-500">내 답</span>12345 5151<span className="font-bold text-red-600">3</span> 31312
        </div>
      </div>
    ),
  },
  {
    icon: <BarChart3 size={26} />,
    tint: 'bg-amber-500 text-white',
    title: '누적 기록으로 약점 찾기',
    body: '파트별 누적 오답률, 점수·시간 추이, 시간을 가장 많이 쓴 문항을 확인하세요. 평가원·학평·사설 모의고사처럼 원하는 묶음으로 나눠 볼 수도 있습니다. 처음이라면 "예시 데이터 채우기"로 미리 둘러보세요.',
    visual: (
      <div className="flex items-center gap-2 text-xs">
        <div className="flex items-center gap-1 rounded-lg bg-white px-2.5 py-2 font-semibold shadow-sm">
          <FolderKanban size={14} className="text-amber-600" /> 평가원 모의평가
        </div>
        <div className="flex items-center gap-1 rounded-lg bg-white px-2.5 py-2 font-semibold shadow-sm">
          <FolderKanban size={14} className="text-amber-600" /> 학력평가
        </div>
        <div className="flex items-center gap-1 rounded-lg bg-white px-2.5 py-2 font-semibold shadow-sm">
          <Crown size={14} className="text-amber-600" /> 사설
        </div>
      </div>
    ),
  },
];

export function Tutorial() {
  const { tutorialOpen, closeTutorial } = useApp();
  const [i, setI] = useState(0);

  useEffect(() => {
    if (tutorialOpen) setI(0);
  }, [tutorialOpen]);

  useEffect(() => {
    if (!tutorialOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeTutorial();
      if (e.key === 'ArrowRight') setI((v) => Math.min(STEPS.length - 1, v + 1));
      if (e.key === 'ArrowLeft') setI((v) => Math.max(0, v - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tutorialOpen, closeTutorial]);

  if (!tutorialOpen) return null;
  const step = STEPS[i];
  const last = i === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/55 p-0 sm:items-center sm:p-4">
      <div role="dialog" aria-modal aria-labelledby="tutorial-title" className="w-full max-w-md overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        <div className="flex items-center justify-between px-5 pt-4">
          <span className="text-xs font-bold text-slate-400">
            사용법 {i + 1} / {STEPS.length}
          </span>
          <button type="button" onClick={closeTutorial} className="rounded-full p-1 text-slate-400 hover:bg-slate-100" aria-label="튜토리얼 닫기">
            <X size={20} />
          </button>
        </div>
        <div className="px-5 pb-4 pt-2">
          <div className={cx('mb-3 flex h-12 w-12 items-center justify-center rounded-2xl', step.tint)}>{step.icon}</div>
          <h2 id="tutorial-title" className="text-lg font-black text-slate-900">
            {step.title}
          </h2>
          <p className="mt-1.5 min-h-[72px] text-sm leading-relaxed text-slate-600">{step.body}</p>
          <div className="mt-3 rounded-2xl bg-slate-100 p-3">{step.visual}</div>
        </div>
        <div className="flex justify-center gap-1.5 pb-3">
          {STEPS.map((_, k) => (
            <button
              key={k}
              type="button"
              onClick={() => setI(k)}
              aria-label={`${k + 1}단계로`}
              className={cx('h-2 rounded-full transition-all', k === i ? 'w-6 bg-slate-900' : 'w-2 bg-slate-300')}
            />
          ))}
        </div>
        <div className="flex items-center gap-2 border-t border-slate-100 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {i === 0 ? (
            <button type="button" onClick={closeTutorial} className="h-11 rounded-xl px-3 text-sm font-semibold text-slate-500 hover:bg-slate-100">
              건너뛰기
            </button>
          ) : (
            <button type="button" onClick={() => setI(i - 1)} className="flex h-11 items-center gap-1 rounded-xl px-3 text-sm font-semibold text-slate-600 hover:bg-slate-100">
              <ChevronLeft size={16} /> 이전
            </button>
          )}
          <button
            type="button"
            autoFocus
            onClick={() => (last ? closeTutorial() : setI(i + 1))}
            className="ml-auto flex h-11 items-center gap-1 rounded-xl bg-slate-900 px-5 text-sm font-bold text-white"
          >
            {last ? '시작하기' : '다음'} {!last && <ChevronRight size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}
