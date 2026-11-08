import { ArrowDown, ArrowLeft, ArrowLeftRight, Bug, Maximize2, Minimize2, CheckCircle2, FastForward, Lock, PauseCircle, Square, SkipForward, Sun, Zap } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AdSlot } from '../components/AdSlot';
import { ClockDisplay } from '../components/ClockDisplay';
import { ADS, adReady } from '../config/site';
import { confirmAsync } from '../components/ConfirmHost';
import { QuestionGrid, StatusLegend } from '../components/QuestionGrid';
import { Segmented, cx } from '../components/ui';
import { useApp } from '../context/AppContext';
import { getExamConfig, getSubject, subjectLabel } from '../data/examConfigData';
import { useWakeLock } from '../hooks/useWakeLock';
import { examAudio, type ExamAudioEvent } from '../lib/audio';
import {
  completeCurrent,
  createTracker,
  finalizeTracker,
  getStatus,
  jumpTo,
  mostRecentSkipped,
  nextLapNo,
  nextSkipped,
  skipCurrent,
  skippedQuestions,
  type Stamp,
  type TrackerState,
} from '../lib/lapTracker';
import { minToHM, msToKorean, msToMMSS, uid } from '../lib/time';
import { resolveTiming, waitMinutes } from '../lib/timing';
import type { ExamResult, ExamSettings, SpeedMultiplier } from '../types';
import { loadPref, savePref } from '../repository/resultRepository';

type Phase = 'waiting' | 'running' | 'warning' | 'ended';

const PHASE_BADGE: Record<Phase, { text: string; cls: string }> = {
  waiting: { text: '대기 중', cls: 'bg-amber-400 text-amber-950' },
  running: { text: '시험 진행 중', cls: 'bg-emerald-500 text-white' },
  warning: { text: '', cls: 'bg-red-600 text-white' },
  ended: { text: '시험 종료', cls: 'bg-slate-500 text-white' },
};

/** 경고 시점 점멸 지속 시간 (tailwind animate-warning-flash: 0.6s × 5회) */
const FLASH_MS = 3000;

export function ExamScreen({ settings, onFinish }: { settings: ExamSettings; onFinish: (r: ExamResult) => void }) {
  const { user, showDebug, isPro } = useApp();
  const config = getExamConfig(settings.examId);
  const subject = getSubject(settings.examId, settings.subjectId);
  if (!subject) throw new Error(`알 수 없는 과목: ${settings.subjectId}`);

  const timing = useMemo(() => resolveTiming(subject, settings.subModeId), [subject, settings.subModeId]);
  const label = subjectLabel(subject);
  const elective = subject.electives?.find((e) => e.id === settings.electiveId);
  const waitMin = waitMinutes(settings.waitOption, settings.customWaitMin);
  const durationMs = timing.durationMin * 60_000;
  const warnMs = timing.warningMin * 60_000;
  const initialMs = -waitMin * 60_000;
  const total = settings.questionCount && settings.questionCount > 0 ? settings.questionCount : subject.total_questions;

  useWakeLock(true);

  // ───────────── 가상 시계 (배속 지원) ─────────────
  const [speed, setSpeed] = useState<SpeedMultiplier>(1);
  const [clockSide, setClockSide] = useState<'left' | 'right'>(settings.clockSide ?? 'left');
  const toggleSide = () => {
    const next = clockSide === 'left' ? 'right' : 'left';
    setClockSide(next);
    savePref('setup-prefs', { ...loadPref<Record<string, unknown>>('setup-prefs', {}), clockSide: next });
  };
  const speedRef = useRef<SpeedMultiplier>(1);
  const virtualRef = useRef(initialMs);
  const lastRealRef = useRef(performance.now());
  const endedRef = useRef(false);
  const [virtualMs, setVirtualMs] = useState(initialMs);
  const [endOverlay, setEndOverlay] = useState(false);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  useEffect(() => {
    lastRealRef.current = performance.now();
    // setInterval 은 백그라운드 탭에서도 (느리게나마) 동작하므로 rAF 대신 사용
    const id = window.setInterval(() => {
      const now = performance.now();
      const dt = now - lastRealRef.current;
      lastRealRef.current = now;
      if (endedRef.current) return;
      virtualRef.current = Math.min(virtualRef.current + dt * speedRef.current, durationMs);
      setVirtualMs(virtualRef.current);
    }, 50);
    return () => window.clearInterval(id);
  }, [durationMs]);

  const setVirtual = (ms: number) => {
    virtualRef.current = Math.min(ms, durationMs);
    lastRealRef.current = performance.now();
    setVirtualMs(virtualRef.current);
  };

  const phase: Phase =
    virtualMs < 0 ? 'waiting' : virtualMs >= durationMs ? 'ended' : durationMs - virtualMs <= warnMs ? 'warning' : 'running';
  const remainingMs = Math.max(0, Math.min(durationMs, durationMs - virtualMs));
  const clockSeconds = timing.startMin * 60 + virtualMs / 1000;
  const locked = phase === 'waiting' || phase === 'ended';

  // ───────────── 종료 N분 전 시각 알림: 붉게 점멸 후 원래 화면으로 복귀 ─────────────
  const [flashing, setFlashing] = useState(false);
  const flashedRef = useRef(false);
  useEffect(() => {
    if (!settings.visualAlert || phase !== 'warning' || flashedRef.current) return;
    flashedRef.current = true;
    setFlashing(true);
    const id = window.setTimeout(() => setFlashing(false), FLASH_MS);
    return () => window.clearTimeout(id);
  }, [phase, settings.visualAlert]);

  // ───────────── EXP 트래커 ─────────────
  const [tracker, setTracker] = useState<TrackerState | null>(null);
  const trackerRef = useRef<TrackerState | null>(null);
  useEffect(() => {
    trackerRef.current = tracker;
  }, [tracker]);

  const stamp = useCallback(
    (): Stamp => ({ exam: Math.max(0, Math.min(virtualRef.current, durationMs)), real: performance.now() }),
    [durationMs],
  );

  // 본 시험 시작(00:00) 순간 1번 문항 Lap #1 자동 시작
  useEffect(() => {
    if (settings.expMode && !tracker && virtualMs >= 0) {
      setTracker(createTracker(total, { exam: 0, real: performance.now() }));
    }
  }, [settings.expMode, tracker, virtualMs, total]);

  const canAct = () => virtualRef.current >= 0 && !endedRef.current;

  const doComplete = useCallback(() => {
    if (!canAct()) return;
    setTracker((t) => (t ? completeCurrent(t, stamp()) : t));
  }, [stamp]);

  const doSkip = useCallback(() => {
    if (!canAct()) return;
    setTracker((t) => (t ? skipCurrent(t, stamp()) : t));
  }, [stamp]);

  const doJump = useCallback(
    (q: number) => {
      if (!canAct()) return;
      setTracker((t) => (t ? jumpTo(t, q, stamp()) : t));
    },
    [stamp],
  );

  /** ← : 보류중 문항 중 가장 최근 문항으로 */
  const doRecentSkipped = useCallback(() => {
    if (!canAct()) return;
    setTracker((t) => {
      if (!t) return t;
      const q = mostRecentSkipped(t);
      return q === null ? t : jumpTo(t, q, stamp());
    });
  }, [stamp]);

  /** ↓ : 보류중 문항 중 (현재 번호 기준) 다음 문항으로 */
  const doNextSkipped = useCallback(() => {
    if (!canAct()) return;
    setTracker((t) => {
      if (!t) return t;
      const q = nextSkipped(t, t.current?.questionNo ?? 0);
      return q === null ? t : jumpTo(t, q, stamp());
    });
  }, [stamp]);

  // ───────────── 타종 / 안내 음성 ─────────────
  const audioEvents = useMemo(() => {
    const evs: Array<{ at: number; ev: ExamAudioEvent }> = [];
    if (waitMin >= 15) evs.push({ at: -15 * 60_000, ev: 'yebi' });
    if (waitMin > 0) evs.push({ at: Math.max(-5 * 60_000, initialMs), ev: 'prep' });
    evs.push({ at: 0, ev: 'start' }, { at: durationMs - warnMs, ev: 'warning' }, { at: durationMs, ev: 'end' });
    return evs;
  }, [waitMin, initialMs, durationMs, warnMs]);

  const prevVirtualRef = useRef(initialMs - 1);
  useEffect(() => {
    const prev = prevVirtualRef.current;
    prevVirtualRef.current = virtualMs;
    if (!settings.soundAlert || virtualMs <= prev) return;
    // 시간 점프로 여러 이벤트를 한 번에 지나간 경우 마지막 이벤트만 재생
    const crossed = audioEvents.filter((e) => prev < e.at && e.at <= virtualMs);
    const last = crossed[crossed.length - 1];
    if (last) examAudio.announce(last.ev, label, timing.warningMin);
  }, [virtualMs, settings.soundAlert, audioEvents, label, timing.warningMin]);

  // ───────────── 종료 처리 ─────────────
  const finish = useCallback(
    (early: boolean) => {
      if (endedRef.current) return;
      endedRef.current = true;
      const at = stamp();
      const finalTracker = trackerRef.current ? finalizeTracker(trackerRef.current, at) : null;
      if (finalTracker) setTracker(finalTracker);
      const result: ExamResult = {
        id: uid('exam'),
        createdAt: new Date().toISOString(),
        examId: config.exam_id,
        examTitle: config.exam_title,
        subjectId: subject.id,
        subjectName: label,
        subModeId: settings.subModeId,
        subModeName: timing.subModeName,
        electiveId: elective?.id,
        electiveName: elective?.name,
        settings,
        totalQuestions: total,
        durationMin: timing.durationMin,
        elapsedMs: Math.max(0, at.exam),
        endedEarly: early,
        expMode: settings.expMode,
        laps: finalTracker?.laps ?? [],
        score: null,
        wrongQuestions: [],
        ownerId: user?.id ?? null,
      };
      if (early) {
        examAudio.stop();
        onFinish(result);
      } else {
        setEndOverlay(true);
        window.setTimeout(() => onFinish(result), 1800);
      }
    },
    [stamp, config, subject.id, label, settings, timing, elective, total, user?.id, onFinish],
  );

  useEffect(() => {
    if (phase === 'ended') finish(false);
  }, [phase, finish]);

  const endNow = () => {
    void confirmAsync('시험을 즉시 종료하고 결과 화면으로 이동할까요?', { confirmLabel: '시험 종료', danger: true }).then((ok) => ok && finish(true));
  };

  // 키보드 단축키 (웹): Space = 풀이 완료, → = 보류, ← = 가장 최근 보류 문항, ↓ = 다음 보류 문항
  useEffect(() => {
    if (!settings.expMode) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if (e.repeat || e.altKey || e.ctrlKey || e.metaKey) return;
      if (document.querySelector('[role="alertdialog"]')) return;
      const actions: Record<string, () => void> = {
        Space: doComplete,
        ArrowRight: doSkip,
        ArrowLeft: doRecentSkipped,
        ArrowDown: doNextSkipped,
      };
      const action = actions[e.code];
      if (!action) return;
      e.preventDefault();
      // 스페이스가 포커스된 버튼을 한 번 더 누르는 것을 방지
      (document.activeElement as HTMLElement | null)?.blur?.();
      action();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [settings.expMode, doComplete, doSkip, doRecentSkipped, doNextSkipped]);

  // 실수로 새로고침/닫기 방지
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (endedRef.current) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  // ───────────── 파생 값 ─────────────
  const current = tracker?.current ?? null;
  const currentLapMs = current ? Math.max(0, Math.min(virtualMs, durationMs) - current.startMs) : 0;
  const currentQuestionPrevMs = current
    ? (tracker?.laps ?? []).filter((l) => l.questionNo === current.questionNo).reduce((s, l) => s + l.durationMs, 0)
    : 0;
  const currentVisits = current ? (tracker?.laps ?? []).filter((l) => l.questionNo === current.questionNo).length : 0;
  const completedCount = tracker ? tracker.completed.filter(Boolean).length : 0;
  const skippedList = tracker ? skippedQuestions(tracker) : [];
  const recentSkipped = tracker ? mostRecentSkipped(tracker) : null;
  const nextSkippedQ = tracker ? nextSkipped(tracker, current?.questionNo ?? 0) : null;
  const badge = PHASE_BADGE[phase];
  const badgeText = phase === 'warning' ? `종료 ${timing.warningMin}분 전` : badge.text;

  const muted = 'text-slate-500';
  const panel = 'border-slate-200 bg-white';

  // 태블릿·PC 시험 화면 광고 (휴대폰은 공간이 좁아 표시하지 않음, Pro 는 숨김)
  const examAd = !isPro && (import.meta.env.DEV || showDebug || adReady(ADS.slots.exam)) ? <AdSlot label="AdSense Exam Slot (가로 배너)" slot={ADS.slots.exam} className="hidden h-[72px] w-full shrink-0 md:flex lg:h-[90px]" /> : null;

  // 태블릿 이상: 시험 중 페이지가 위아래로 밀리지 않도록 스크롤 잠금
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('exam-lock');
    return () => root.classList.remove('exam-lock');
  }, []);

  // 시계를 눌러도 '풀이 완료' (버튼을 조준할 필요 없이). 연속 터치 실수 방지를 위해 0.8초 간격 제한
  const [tapFlash, setTapFlash] = useState(false);
  const lastTapRef = useRef(0);
  const clockTappable = settings.expMode && !locked && !!current;
  const onClockTap = () => {
    if (!clockTappable) return;
    const now = performance.now();
    if (now - lastTapRef.current < 800) return;
    lastTapRef.current = now;
    doComplete();
    setTapFlash(true);
    window.setTimeout(() => setTapFlash(false), 180);
  };

  // 전체 화면 (브라우저 주소창까지 숨김, 지원하는 기기만)
  const [isFullscreen, setIsFullscreen] = useState(false);
  const fullscreenSupported = typeof document !== 'undefined' && !!document.fullscreenEnabled;
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    };
  }, []);
  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    else void document.documentElement.requestFullscreen().catch(() => undefined);
  };

  const clockFace = (
    <ClockDisplay
      clockType={settings.clockType}
      timeMode={settings.timeMode}
      model={settings.clockModel}
      clockSeconds={clockSeconds}
      remainingMs={remainingMs}
      durationMs={durationMs}
      waiting={phase === 'waiting'}
      warning={false}
      subjectLabel={`${label} ${minToHM(timing.startMin)}~${minToHM(timing.endMin)}`}
      compact={settings.expMode}
    />
  );
  const clock = settings.expMode ? (
    <div
      role="button"
      tabIndex={-1}
      aria-label="시계를 눌러 풀이 완료"
      onClick={onClockTap}
      className={cx(
        'flex w-full flex-col items-center rounded-2xl transition md:min-h-0 lg:flex-1',
        clockTappable && 'cursor-pointer active:scale-[0.99]',
        tapFlash && 'bg-blue-100',
      )}
    >
      {clockFace}
      {clockTappable && <div className="mt-1 hidden text-[11px] font-semibold text-blue-500 sm:block">시계를 눌러도 풀이 완료</div>}
    </div>
  ) : (
    clockFace
  );

  return (
    <div className="relative select-none space-y-3 [-webkit-touch-callout:none] md:flex md:h-[calc(100dvh-24px)] md:flex-col md:gap-3 md:space-y-0">
      {/* 종료 N분 전: Vignette Glow 점멸 (약 3초) 후 원래 화면으로 복귀 */}
      {flashing && (
        <div className="pointer-events-none fixed inset-0 z-40 animate-warning-flash" aria-hidden />
      )}

      {endOverlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-6 text-center text-white">
          <div>
            <Square size={40} className="mx-auto mb-3 fill-white" />
            <div className="text-2xl font-black">종료령 — 시험이 종료되었습니다</div>
            <div className="mt-2 text-sm text-slate-300">필기구를 내려놓으세요. 결과 화면으로 이동합니다…</div>
          </div>
        </div>
      )}

      {/* 상단 바 */}
      <div className="shrink-0 rounded-2xl bg-slate-900 px-3 py-2 text-white shadow-lg sm:px-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
            <h1 className="text-base font-black sm:text-lg">{label}</h1>
            {timing.subModeName && <span className="rounded-md bg-white/15 px-1.5 py-0.5 text-[11px] font-semibold">{timing.subModeName.split(' (')[0]}</span>}
            {elective && <span className="rounded-md bg-white/15 px-1.5 py-0.5 text-[11px] font-semibold">{elective.name}</span>}
            <span className={cx('rounded-full px-2.5 py-0.5 text-[11px] font-black', badge.cls)}>{badgeText}</span>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
          {fullscreenSupported && (
            <button
              type="button"
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? '전체 화면 끝내기' : '전체 화면'}
              title={isFullscreen ? '전체 화면 끝내기' : '전체 화면'}
              className="flex shrink-0 items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1.5 text-xs font-bold hover:bg-white/20"
            >
              {isFullscreen ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
            </button>
          )}
          {settings.expMode && (
            <button
              type="button"
              onClick={toggleSide}
              className="flex shrink-0 items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1.5 text-xs font-bold hover:bg-white/20"
              title="시계와 풀이 버튼의 좌우 위치를 바꿉니다"
              aria-label="좌우 바꾸기"
            >
              <ArrowLeftRight size={12} /> <span className="hidden sm:inline">좌우 바꾸기</span>
            </button>
          )}
          <button
            type="button"
            onClick={endNow}
            disabled={phase === 'ended'}
            className="flex shrink-0 items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1.5 text-xs font-bold hover:bg-white/20 disabled:opacity-40"
          >
            <Square size={11} className="fill-white" /> 시험 즉시 종료
          </button>
          </div>
        </div>

        {/* 디버그 / 테스트 컨트롤 (배포본에서는 계정 화면에서 켜야 표시) */}
        {showDebug && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-white/10 pt-2">
          <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-white/50">
            <Bug size={12} /> 테스트
          </span>
          <Segmented<SpeedMultiplier>
            dark
            size="sm"
            value={speed}
            onChange={setSpeed}
            options={[
              { value: 1, label: '1x' },
              { value: 10, label: '10x' },
              { value: 60, label: '60x' },
            ]}
          />
          <button
            type="button"
            onClick={() => setVirtual(Math.max(virtualRef.current, durationMs - warnMs))}
            disabled={phase === 'warning' || phase === 'ended'}
            className="flex items-center gap-1 rounded-md bg-red-500/80 px-2 py-1 text-xs font-semibold hover:bg-red-500 disabled:opacity-40"
          >
            <Zap size={12} /> 종료 {timing.warningMin}분 전으로 점프
          </button>
          <button
            type="button"
            onClick={() => setVirtual(Math.max(virtualRef.current, durationMs - 30_000))}
            disabled={phase === 'ended'}
            className="flex items-center gap-1 rounded-md bg-white/10 px-2 py-1 text-xs font-semibold hover:bg-white/20 disabled:opacity-40"
          >
            <FastForward size={12} /> 종료 30초 전
          </button>
          {speed !== 1 && <span className="text-[11px] font-bold text-amber-300">⚡ {speed}배속</span>}
        </div>
        )}
      </div>

      {/* 대기 배지 */}
      {phase === 'waiting' && (
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-2xl border-2 border-amber-400 bg-amber-50 px-3 py-2 text-amber-900">
          <div className="flex items-center gap-2 text-sm font-black">
            <Lock size={15} /> [시험 시작 대기 중 - 문제지 표지 확인]
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-bold tabular-nums">
              {minToHM(timing.startMin)} 시작까지 {msToMMSS(-virtualMs)}
            </span>
            {/* 테스트 도구와 상관없이 항상 표시 */}
            <button
              type="button"
              onClick={() => setVirtual(0)}
              className="flex items-center gap-1 rounded-lg bg-amber-500 px-2.5 py-1 text-xs font-bold text-white hover:bg-amber-600"
            >
              <SkipForward size={12} /> 대기 건너뛰고 바로 시작
            </button>
          </div>
        </div>
      )}

      {!settings.expMode ? (
        <>
          <div className="flex flex-col items-center justify-center gap-3 rounded-3xl bg-white p-4 shadow-sm sm:p-6 md:min-h-0 md:flex-1">
            {examAd}
            {clock}
          </div>
          <div className={cx('shrink-0 rounded-2xl border p-4 text-center text-sm', panel, muted)}>
            EXP 모드 OFF — 시계만 표시됩니다. 시험 종료 후 점수와 오답 문항을 기록할 수 있습니다.
          </div>
        </>
      ) : (
        /*
         * 휴대폰·태블릿 세로: [시계 | 컨트롤] 위, 문항 그리드 아래
         * 태블릿 가로·데스크톱(lg): 한쪽에 큰 시계, 반대쪽 위에 문항 그리드·아래에 컨트롤
         * 시계 위치(왼쪽/오른쪽)는 설정 또는 상단 [좌우 바꾸기] 로 변경
         */
        <div
          className={
            clockSide === 'left'
              ? "grid grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-2 [grid-template-areas:'clock_ctrl'_'grid_grid'] sm:grid-cols-2 sm:gap-3 md:min-h-0 md:flex-1 md:grid-rows-[auto_minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)_auto] lg:gap-4 lg:[grid-template-areas:'clock_grid'_'clock_ctrl']"
              : "grid grid-cols-[minmax(0,7fr)_minmax(0,5fr)] gap-2 [grid-template-areas:'ctrl_clock'_'grid_grid'] sm:grid-cols-2 sm:gap-3 md:min-h-0 md:flex-1 md:grid-rows-[auto_minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)_auto] lg:gap-4 lg:[grid-template-areas:'grid_clock'_'ctrl_clock']"
          }
        >
            <div className="flex flex-col items-center justify-center gap-2 rounded-3xl bg-white p-2 shadow-sm [grid-area:clock] sm:p-4 lg:min-h-0 lg:gap-3 lg:p-5">
              {/* 광고: 시계 위쪽 = 풀이 완료 버튼(아래·반대편)과 가장 먼 자리 */}
              {examAd}
              {clock}
            </div>

            <div className={cx('flex min-w-0 flex-col rounded-3xl border p-3 shadow-sm [grid-area:ctrl] sm:p-4', panel)}>
              {phase === 'waiting' ? (
                <div className={cx('flex flex-1 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-3 text-center', 'border-slate-300 text-slate-500')}>
                  <Lock size={24} />
                  <div className="text-xs font-bold sm:text-sm">시험 시작 전에는 풀이 버튼이 잠겨 있습니다</div>
                  <div className="text-[11px] sm:text-xs">{minToHM(timing.startMin)} 정각에 1번 문항 (Lap #1) 측정이 자동 시작됩니다.</div>
                </div>
              ) : (
                <>
                  {current && (
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className={cx('text-[11px] font-semibold sm:text-xs', muted)}>현재 문항 · Lap #{tracker ? nextLapNo(tracker) : 1}</div>
                        <div className="text-3xl font-black leading-tight tabular-nums sm:text-4xl">{current.questionNo}번</div>
                        {currentVisits > 0 && (
                          <span className="inline-block rounded bg-orange-500 px-1.5 py-0.5 text-[10px] font-bold text-white">{currentVisits + 1}회차 재도전</span>
                        )}
                      </div>
                      <div className="text-right">
                        <div className={cx('text-[11px] font-semibold sm:text-xs', muted)}>이번 Lap</div>
                        <div className="font-mono text-xl font-black tabular-nums text-blue-500 sm:text-3xl">{msToMMSS(currentLapMs)}</div>
                        {currentQuestionPrevMs > 0 && <div className={cx('text-[10px] tabular-nums sm:text-[11px]', muted)}>누적 {msToKorean(currentQuestionPrevMs + currentLapMs)}</div>}
                      </div>
                    </div>
                  )}
                  {/* 보류 문항 이동 */}
                  <div className="mt-2 grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={doRecentSkipped}
                      disabled={locked || recentSkipped === null}
                      className={cx(
                        'flex h-9 items-center justify-center gap-1 rounded-xl border text-[11px] font-bold transition disabled:opacity-35 sm:text-xs',
                        'border-slate-300 text-slate-700 hover:bg-slate-50',
                      )}
                      title="키보드 ←"
                    >
                      <ArrowLeft size={13} /> 최근 보류{recentSkipped !== null && <span className="hidden sm:inline">&nbsp;({recentSkipped}번)</span>}
                    </button>
                    <button
                      type="button"
                      onClick={doNextSkipped}
                      disabled={locked || nextSkippedQ === null}
                      className={cx(
                        'flex h-9 items-center justify-center gap-1 rounded-xl border text-[11px] font-bold transition disabled:opacity-35 sm:text-xs',
                        'border-slate-300 text-slate-700 hover:bg-slate-50',
                      )}
                      title="키보드 ↓"
                    >
                      <ArrowDown size={13} /> 다음 보류{nextSkippedQ !== null && <span className="hidden sm:inline">&nbsp;({nextSkippedQ}번)</span>}
                    </button>
                  </div>

                  {current ? (
                    <>
                      {/*
                       * 보류 : 풀이 완료 = 3 : 4, 같은 높이로 좌우 배치
                       * 풀이 완료는 화면 바깥쪽(손이 닿는 쪽), 보류는 시계 쪽. [좌우 바꾸기]를 따라 같이 바뀜
                       */}
                      <div className={cx('mt-2 grid flex-1 gap-2', clockSide === 'left' ? 'grid-cols-[3fr_4fr]' : 'grid-cols-[4fr_3fr]')}>
                        <button
                          type="button"
                          onClick={doSkip}
                          disabled={locked}
                          className={cx(
                            'flex min-h-[72px] flex-col items-center justify-center gap-0.5 rounded-2xl border-2 border-orange-400 bg-orange-50 px-1 text-orange-700 transition hover:bg-orange-100 active:scale-[0.97] disabled:opacity-40 sm:min-h-[84px] lg:min-h-[96px]',
                            clockSide === 'left' ? 'order-1' : 'order-2',
                          )}
                        >
                          <span className="flex items-center gap-1 text-base font-black sm:text-lg">
                            <PauseCircle size={18} className="shrink-0" /> 보류
                          </span>
                          <span className="text-[10px] font-semibold opacity-80 sm:text-xs">{current.questionNo}번 넘어가기</span>
                        </button>
                        <button
                          type="button"
                          onClick={doComplete}
                          disabled={locked}
                          className={cx(
                            'flex min-h-[72px] flex-col items-center justify-center gap-0.5 rounded-2xl bg-blue-600 px-1 text-white shadow-lg shadow-blue-600/30 transition hover:bg-blue-700 active:scale-[0.97] disabled:opacity-40 sm:min-h-[84px] lg:min-h-[96px]',
                            clockSide === 'left' ? 'order-2' : 'order-1',
                          )}
                        >
                          <span className="flex items-center gap-1 text-base font-black sm:text-xl">
                            <CheckCircle2 size={20} className="shrink-0" /> 풀이 완료
                          </span>
                          <span className="text-[10px] font-semibold opacity-90 sm:text-xs">{current.questionNo}번 → 다음 문제</span>
                        </button>
                      </div>
                    </>
                  ) : tracker?.finalized ? (
                    <div className="flex flex-1 items-center justify-center text-center text-sm font-bold">시험이 종료되어 기록이 확정되었습니다.</div>

                  ) : (
                    <div className={cx('flex flex-1 flex-col items-center justify-center gap-1.5 rounded-2xl p-3 text-center', 'bg-emerald-50 text-emerald-800')}>
                      <Sun size={22} />
                      <div className="text-sm font-black">{completedCount === total ? '모든 문항 풀이 완료!' : '남은 문항이 모두 보류 상태입니다.'}</div>
                      <div className="text-[11px] sm:text-xs">다시 풀 문항을 그리드에서 선택하거나 ← / ↓ 키로 보류 문항으로 이동하세요.</div>
                    </div>

                  )}
                </>
              )}
            </div>

          {/* 문항 미니 그리드 – 시계와 한 화면 */}
          <div className={cx('rounded-3xl border p-3 shadow-sm [grid-area:grid] sm:p-4 md:min-h-0 md:overflow-y-auto md:overscroll-contain', panel)}>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <StatusLegend />
              <div className={cx('text-xs font-semibold tabular-nums', muted)}>
                완료 {completedCount}/{total} · 보류 {skippedList.length}
              </div>
            </div>
            <QuestionGrid total={total} statusOf={(q) => (tracker ? getStatus(tracker, q) : 'untried')} onSelect={doJump} disabled={locked} />
            <div className={cx('mt-2 hidden flex-wrap gap-x-3 gap-y-1 text-[11px] sm:flex [@media(hover:none)]:hidden', muted)}>
              <span>
                <Kbd>Space</Kbd> 풀이 완료
              </span>
              <span>
                <Kbd>→</Kbd> 보류
              </span>
              <span>
                <Kbd>←</Kbd> 가장 최근 보류 문항
              </span>
              <span>
                <Kbd>↓</Kbd> 다음 보류 문항
              </span>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

function Kbd({ children }: { children: string }) {
  return (
    <kbd
      className={cx(
        'mr-1 inline-block min-w-[1.5rem] rounded border px-1 text-center font-mono text-[10px] font-bold',
        'border-slate-300 bg-slate-100 text-slate-700',
      )}
    >
      {children}
    </kbd>
  );
}
