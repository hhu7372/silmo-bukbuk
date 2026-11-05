import { AlarmClock, ArrowLeft, Bell, Clock3, Crown, Eye, Gauge, Hourglass, ListOrdered, Lock, Play, Watch } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { canUseExp, consumeExp, FREE_EXP_SESSIONS, getExpAccess } from '../lib/expQuota';
import { useMemo, useState } from 'react';
import { AnalogClock } from '../components/AnalogClock';
import { Card, ChoiceGroup, SectionTitle, Toggle, cx } from '../components/ui';
import { getExamConfig, getSubject, subjectLabel } from '../data/examConfigData';
import { examAudio } from '../lib/audio';
import { minToHM } from '../lib/time';
import { clampWait, MAX_CUSTOM_WAIT_MIN, resolveTiming, WAIT_OPTION_LABELS, WAIT_OPTIONS, waitMinutes } from '../lib/timing';
import { loadPref, savePref } from '../repository/resultRepository';
import type { ClockModel, ClockType, ExamSettings, TimeMode, WaitOption } from '../types';

interface StoredPrefs {
  clockType: ClockType;
  timeMode: TimeMode;
  clockModel: ClockModel;
  waitOption: WaitOption;
  customWaitMin: number;
  visualAlert: boolean;
  soundAlert: boolean;
  expMode: boolean;
  electives: Record<string, string>;
  subModes: Record<string, string>;
  /** 과목별 사용자 지정 문항 수 (문항 수 조정 가능한 시험) */
  questionCounts: Record<string, number>;
}

const DEFAULT_PREFS: StoredPrefs = {
  clockType: 'analog',
  timeMode: 'real',
  clockModel: 'A',
  waitOption: 'prep',
  customWaitMin: 10,
  visualAlert: true,
  soundAlert: false,
  expMode: true,
  electives: {},
  subModes: {},
  questionCounts: {},
};

const MODEL_NAMES: Record<ClockModel, string> = {
  A: '수능 표준형',
  B: '교실 벽걸이형',
};

/** 이전 버전에 저장된 설정(다크 시계, 1/3분·입실 대기 등)을 현재 옵션으로 보정 */
function normalizePrefs(p: StoredPrefs): StoredPrefs {
  const clockModel: ClockModel = p.clockModel === 'B' ? 'B' : 'A';
  const waitOption: WaitOption = p.waitOption === 'none' || p.waitOption === 'prep' || p.waitOption === 'custom' ? p.waitOption : 'prep';
  return { ...p, clockModel, waitOption, customWaitMin: clampWait(p.customWaitMin ?? DEFAULT_PREFS.customWaitMin), questionCounts: p.questionCounts ?? {} };
}

export function SetupScreen({ examId, subjectId, onBack, onStart }: { examId: string; subjectId: string; onBack: () => void; onStart: (s: ExamSettings) => void }) {
  const config = getExamConfig(examId);
  const subject = getSubject(examId, subjectId);
  const [prefs, setPrefs] = useState<StoredPrefs>(() => normalizePrefs(loadPref('setup-prefs', DEFAULT_PREFS)));
  const [starting, setStarting] = useState(false);
  const { user, isPro, setPro, openLogin } = useApp();
  const expAccess = getExpAccess(user?.id ?? null, isPro);
  const expAllowed = canUseExp(expAccess);
  const expOn = prefs.expMode && expAllowed;

  const subModeId = subject?.sub_modes ? prefs.subModes[subjectId] ?? subject.sub_modes[0].id : undefined;
  const electiveId = subject?.electives ? prefs.electives[subjectId] ?? subject.electives[0].id : undefined;

  const timing = useMemo(() => (subject ? resolveTiming(subject, subModeId) : null), [subject, subModeId]);

  if (!subject || !timing) {
    return (
      <Card>
        <p className="text-sm">과목 정보를 찾을 수 없습니다.</p>
        <button type="button" onClick={onBack} className="mt-3 text-sm font-bold text-blue-600">
          홈으로
        </button>
      </Card>
    );
  }

  const update = <K extends keyof StoredPrefs>(key: K, value: StoredPrefs[K]) => setPrefs((p) => ({ ...p, [key]: value }));
  const wait = waitMinutes(prefs.waitOption, prefs.customWaitMin);
  const adjustable = !!config.adjustable_questions;
  const questionCount = adjustable ? Math.min(300, Math.max(1, Math.round(prefs.questionCounts[subject.id] ?? subject.total_questions))) : subject.total_questions;
  const label = subjectLabel(subject);

  const start = async () => {
    if (starting) return;
    setStarting(true);
    savePref('setup-prefs', prefs);
    if (expOn && expAccess.kind === 'member' && user) consumeExp(user.id);
    if (prefs.soundAlert) {
      examAudio.unlock(); // 사용자 제스처 안에서 오디오 잠금 해제
      await examAudio.prepareCustom(subject.id, subModeId); // 내장 음원 미리 디코딩
    }
    onStart({
      examId: config.exam_id,
      subjectId: subject.id,
      subModeId,
      electiveId,
      clockType: prefs.clockType,
      timeMode: prefs.timeMode,
      clockModel: prefs.clockModel,
      waitOption: prefs.waitOption,
      customWaitMin: clampWait(prefs.customWaitMin),
      visualAlert: prefs.visualAlert,
      soundAlert: prefs.soundAlert,
      expMode: expOn,
      questionCount: adjustable ? questionCount : undefined,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button type="button" onClick={onBack} className="rounded-full bg-white p-2 text-slate-600 shadow-sm hover:bg-slate-50" aria-label="뒤로">
          <ArrowLeft size={20} />
        </button>
        <div>
          <div className="text-xs font-semibold text-slate-500">
            {config.exam_title} · {subject.period}
          </div>
          <h1 className="text-xl font-black text-slate-900">{label} 시험 환경 설정</h1>
        </div>
      </div>

      {subject.sub_modes && (
        <Card>
          <SectionTitle icon={<Clock3 size={18} />}>탐구 영역 세부 선택</SectionTitle>
          <ChoiceGroup
            value={subModeId ?? ''}
            onChange={(v) => update('subModes', { ...prefs.subModes, [subjectId]: v })}
            options={subject.sub_modes.map((m) => ({ value: m.id, label: m.name, hint: `${m.duration_min}분` }))}
          />
        </Card>
      )}

      {subject.electives && (
        <Card>
          <SectionTitle icon={<Watch size={18} />}>{subject.elective_label ?? '선택과목'}</SectionTitle>
          <ChoiceGroup
            value={electiveId ?? ''}
            onChange={(v) => update('electives', { ...prefs.electives, [subjectId]: v })}
            options={subject.electives.map((e) => ({ value: e.id, label: e.name }))}
            columns={subject.electives.length >= 3 ? 3 : 2}
          />
          <p className="mt-2 text-xs text-slate-500">오답 분석 리포트에 선택과목이 함께 기록됩니다.</p>
        </Card>
      )}

      {adjustable && (
        <Card>
          <SectionTitle icon={<ListOrdered size={18} />}>문항 수</SectionTitle>
          <div className="flex flex-wrap items-center gap-2">
            <input
              id="question-count"
              type="number"
              inputMode="numeric"
              min={1}
              max={300}
              value={prefs.questionCounts[subject.id] ?? subject.total_questions}
              onChange={(e) => update('questionCounts', { ...prefs.questionCounts, [subject.id]: Number(e.target.value) || 1 })}
              className="h-10 w-24 rounded-lg border border-slate-300 px-2 text-center text-base font-bold tabular-nums outline-none focus:border-blue-500"
            />
            <span className="text-sm font-semibold text-slate-700">문항</span>
            <button
              type="button"
              onClick={() => {
                const next = { ...prefs.questionCounts };
                delete next[subject.id];
                update('questionCounts', next);
              }}
              className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              기본값 ({subject.total_questions})
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-500">회차마다 문항 수가 조금씩 다릅니다. 실제 시험지의 마지막 문항 번호에 맞춰주세요.</p>
        </Card>
      )}

      <Card>
        <SectionTitle icon={<Clock3 size={18} />}>시계 표시 방식 · 시간 흐름 기준</SectionTitle>
        <ChoiceGroup
          value={prefs.clockType}
          onChange={(v) => update('clockType', v)}
          options={[
            { value: 'analog', label: '아날로그 시계 (권장)', hint: '실제 시험장과 같은 벽시계' },
            { value: 'digital', label: '디지털 시계', hint: '숫자로 크게 표시' },
          ]}
        />
        <div className="mt-3">
          <ChoiceGroup
            value={prefs.timeMode}
            onChange={(v) => update('timeMode', v)}
            options={[
              { value: 'real', label: '실제 수능 시간 모드', hint: `${minToHM(timing.startMin)}부터 ${minToHM(timing.endMin)}까지 시침/분침이 흐름` },
              { value: 'countdown', label: '일반 카운트다운 타이머', hint: `${timing.durationMin}:00 → 00:00 감소` },
            ]}
          />
        </div>
      </Card>

      <Card>
        <SectionTitle icon={<Eye size={18} />}>{prefs.clockType === 'analog' ? '아날로그 시계 디자인' : '디지털 시계 테마'}</SectionTitle>
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          {(['A', 'B'] as ClockModel[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => update('clockModel', m)}
              className={cx(
                'flex flex-col items-center rounded-2xl border-2 p-2 transition sm:p-3',
                prefs.clockModel === m ? 'border-blue-600 bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300',
              )}
            >
              <div className="aspect-square w-full max-w-[140px] rounded-full">
                <AnalogClock displaySeconds={timing.startMin * 60 + 10 * 60 + 8} model={m} />
              </div>
              <span className="mt-2 text-center text-sm font-bold text-slate-800">{MODEL_NAMES[m]}</span>
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <SectionTitle icon={<Hourglass size={18} />}>시험 시작 전 대기시간</SectionTitle>
        <ChoiceGroup
          value={prefs.waitOption}
          onChange={(v) => update('waitOption', v)}
          options={WAIT_OPTIONS.map((w) => ({
            value: w,
            label: WAIT_OPTION_LABELS[w],
            hint:
              w === 'none'
                ? `${minToHM(timing.startMin)} 즉시 시작`
                : w === 'prep'
                  ? `준비령 ${minToHM(timing.startMin - waitMinutes(w, prefs.customWaitMin))}부터 (시작 5분 전)`
                  : `${minToHM(timing.startMin - waitMinutes(w, prefs.customWaitMin))}:00부터 대기 (${waitMinutes(w, prefs.customWaitMin)}분)`,
          }))}
          columns={3}
        />
        {prefs.waitOption === 'custom' && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <label htmlFor="custom-wait" className="text-sm font-semibold text-slate-700">
              시험 시작
            </label>
            <input
              id="custom-wait"
              type="number"
              inputMode="numeric"
              min={0}
              max={MAX_CUSTOM_WAIT_MIN}
              value={Number.isFinite(prefs.customWaitMin) ? prefs.customWaitMin : ''}
              onChange={(e) => update('customWaitMin', e.target.value === '' ? 0 : Number(e.target.value))}
              onBlur={() => update('customWaitMin', clampWait(prefs.customWaitMin))}
              className="h-10 w-20 rounded-lg border border-slate-300 px-2 text-center text-base font-bold tabular-nums outline-none focus:border-blue-500"
            />
            <span className="text-sm font-semibold text-slate-700">분 전부터 대기</span>
            <div className="flex gap-1">
              {[10, 15, 30].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => update('customWaitMin', m)}
                  className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  {m}분
                </button>
              ))}
              <button
                type="button"
                onClick={() => update('customWaitMin', Math.max(0, timing.startMin - timing.entryMin))}
                className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                입실 완료({subject.entry_deadline})부터
              </button>
            </div>
            <p className="w-full text-[11px] text-slate-500">0~{MAX_CUSTOM_WAIT_MIN}분. 15분 이상이면 예비령, 5분 전에는 준비령이 울립니다.</p>
          </div>
        )}
      </Card>

      <Card>
        <SectionTitle icon={<Bell size={18} />}>종료 {subject.warning_min}분 전 알림</SectionTitle>
        <div className="space-y-4">
          <Toggle
            checked={prefs.visualAlert}
            onChange={(v) => update('visualAlert', v)}
            label="시각 알림"
            description="경고 시점에 화면 테두리가 약 3초간 붉게 점멸한 뒤 원래 화면으로 복귀"
          />
          <Toggle
            checked={prefs.soundAlert}
            onChange={(v) => update('soundAlert', v)}
            label="소리 / 안내 음성"
            description="예비령 · 준비령 · 본령 · 종료 전 · 종료령 타종 및 안내 음성"
          />
          {prefs.soundAlert && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void examAudio.preview('start', subject.id, subModeId, label, subject.warning_min)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                ▶ 본령 소리 미리듣기
              </button>
              {config.category === 'csat' && <span className="text-[11px] text-slate-500">수능 방송 음원으로 재생됩니다.</span>}
            </div>
          )}
        </div>
      </Card>

      <Card>
        <SectionTitle icon={<Gauge size={18} />}>EXP 모드 (문항별 소요 시간 측정)</SectionTitle>
        <Toggle
          checked={expOn}
          onChange={(v) => update('expMode', v)}
          disabled={!expAllowed}
          label={expOn ? 'ON' : 'OFF'}
          description="문항마다 '풀이 완료 / 보류' 버튼을 눌러 Lap을 기록합니다. 건너뛰었다 돌아오는 풀이까지 구간별로 정확히 저장됩니다."
        />
        <div
          className={cx(
            'mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs',
            expAccess.kind === 'beta' ? 'bg-emerald-50 text-emerald-900' : expAccess.kind === 'pro' ? 'bg-amber-50 text-amber-900' : expAllowed ? 'bg-blue-50 text-blue-900' : 'bg-slate-100 text-slate-700',
          )}
        >
          {expAccess.kind === 'beta' && <span className="font-semibold">🎉 베타 기간 무료 · EXP 모드를 횟수 제한 없이 쓸 수 있습니다.</span>}
          {expAccess.kind === 'pro' && (
            <span className="flex items-center gap-1 font-semibold">
              <Crown size={14} className="fill-amber-400 text-amber-500" /> Pro 구독 중 · EXP 모드 무제한
            </span>
          )}
          {expAccess.kind === 'member' && (
            <>
              <span className="font-semibold">
                회원 무료 이용 · 남은 횟수 <b className="tabular-nums">{expAccess.remaining}</b>/{FREE_EXP_SESSIONS}회
                {expOn && <span className="font-normal text-blue-700"> (시작하면 1회 차감)</span>}
              </span>
              <button type="button" onClick={() => setPro(true)} className="font-bold text-amber-700 underline-offset-2 hover:underline">
                Pro 구독하면 무제한
              </button>
            </>
          )}
          {expAccess.kind === 'exhausted' && (
            <>
              <span className="flex items-center gap-1 font-semibold">
                <Lock size={13} /> 무료 {FREE_EXP_SESSIONS}회를 모두 사용했습니다.
              </span>
              <button type="button" onClick={() => setPro(true)} className="rounded-lg bg-amber-500 px-2.5 py-1 font-bold text-white">
                Pro 구독하고 무제한 이용
              </button>
            </>
          )}
          {expAccess.kind === 'guest' && (
            <>
              <span className="flex items-center gap-1 font-semibold">
                <Lock size={13} /> 회원가입하면 EXP 모드를 {FREE_EXP_SESSIONS}회 무료로 쓸 수 있습니다.
              </span>
              <button type="button" onClick={openLogin} className="rounded-lg bg-slate-900 px-2.5 py-1 font-bold text-white">
                회원가입 / 로그인
              </button>
            </>
          )}
        </div>
      </Card>

      <Card className="border-blue-200 bg-blue-50">
        <div className="flex items-start gap-3">
          <AlarmClock className="mt-0.5 shrink-0 text-blue-700" size={20} />
          <div className="text-sm text-blue-900">
            <div className="font-bold">
              {label}
              {timing.subModeName ? ` · ${timing.subModeName.split(' ')[0]}` : ''} · {timing.durationMin}분 · {questionCount}문항
            </div>
            <ul className="mt-1 space-y-0.5 text-xs tabular-nums">
              <li>
                시계 시작: {minToHM(timing.startMin - wait)}:00 {wait > 0 && `(대기 ${wait}분)`}
              </li>
              <li>
                본 시험: {minToHM(timing.startMin)} ~ {minToHM(timing.endMin)}
              </li>
              <li>
                경고 시점: {minToHM(timing.endMin - timing.warningMin)} (종료 {timing.warningMin}분 전)
              </li>
            </ul>
          </div>
        </div>
      </Card>

      <button
        type="button"
        onClick={() => void start()}
        disabled={starting}
        className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 text-lg font-black text-white shadow-lg transition hover:bg-slate-800 active:scale-[0.99]"
      >
        <Play size={20} className="fill-white" /> 시험 시작
      </button>
    </div>
  );
}
