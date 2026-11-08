import { AlertTriangle, BarChart3, CheckCircle2, ClipboardCheck, Home, Info, RotateCcw, Save, Timer, Trophy } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AnswerKeyPanel } from '../components/AnswerKeyPanel';
import { SectionCompare } from '../components/SectionCompare';
import { ShareCardPanel } from '../components/ShareCardPanel';
import { SolveTimeline } from '../components/SolveTimeline';
import { OmrGrid } from '../components/QuestionGrid';
import { Card, SectionTitle, Stat, cx } from '../components/ui';
import { useApp } from '../context/AppContext';
import { getSubject } from '../data/examConfigData';
import { SITE } from '../config/site';
import { ensureKey } from '../lib/grading';
import { buildQuestionLogs, findSection, sectionBreakdown, summarize } from '../lib/stats';
import { formatDateTime, msToKorean, msToMMSS } from '../lib/time';
import type { ExamResult } from '../types';

type Tab = 'score' | 'exp' | 'save';

const BLUE = '#2563eb';
const ORANGE = '#f97316';
const RED = '#ef4444';
const GREEN = '#10b981';

export function ReportScreen({
  result,
  initiallySaved,
  onSave,
  onHome,
  onRetry,
}: {
  result: ExamResult;
  initiallySaved: boolean;
  onSave: (r: ExamResult) => Promise<ExamResult>;
  onHome: () => void;
  onRetry: () => void;
}) {
  const { user, openLogin } = useApp();
  const subject = getSubject(result.examId, result.subjectId);
  const sections = useMemo(
    () =>
      (subject?.sections ?? [{ id: 'all', name: '전체', q_start: 1, q_end: result.totalQuestions }])
        .filter((sec) => sec.q_start <= result.totalQuestions)
        .map((sec) => ({ ...sec, q_end: Math.min(sec.q_end, result.totalQuestions) })),
    [subject, result.totalQuestions],
  );

  const [tab, setTab] = useState<Tab>('score');
  const [scoreText, setScoreText] = useState(result.score === null ? '' : String(result.score));
  const [wrong, setWrong] = useState<Set<number>>(() => new Set(result.wrongQuestions));
  const [memo, setMemo] = useState(result.memo ?? '');
  const shortSet = useMemo(() => new Set(subject?.short_answer_questions ?? []), [subject]);
  const [mockName, setMockName] = useState(result.mockName ?? '');
  const [answerKey, setAnswerKey] = useState(() => ensureKey(result.answerKey, result.totalQuestions, shortSet));
  const [myAnswers, setMyAnswers] = useState<string[]>(() => Array.from({ length: result.totalQuestions }, (_, i) => result.myAnswers?.[i] ?? ''));
  const markDirty = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v);
    setDirty(true);
  };
  const [saved, setSaved] = useState(initiallySaved);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const logs = useMemo(() => buildQuestionLogs(result.laps, result.totalQuestions), [result.laps, result.totalQuestions]);
  const summary = useMemo(() => summarize(logs), [logs]);
  const wrongList = useMemo(() => [...wrong].sort((a, b) => a - b), [wrong]);
  const breakdown = useMemo(() => sectionBreakdown(sections, wrongList, result.expMode ? logs : undefined), [sections, wrongList, logs, result.expMode]);

  const toggleWrong = (q: number) => {
    setWrong((prev) => {
      const next = new Set(prev);
      if (next.has(q)) next.delete(q);
      else next.add(q);
      return next;
    });
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const score = scoreText.trim() === '' ? null : Number(scoreText);
      if (score !== null && (!Number.isFinite(score) || score < 0)) throw new Error('점수는 0 이상의 숫자로 입력해주세요.');
      const hasKey = answerKey.some((k) => k.answer);
      await onSave({
        ...result,
        score,
        wrongQuestions: wrongList,
        memo: memo.trim() || undefined,
        mockName: mockName.trim() || undefined,
        answerKey: hasKey ? answerKey : undefined,
        myAnswers: myAnswers.some((a) => a) ? myAnswers : undefined,
        ownerId: user?.id ?? result.ownerId,
      });
      setSaved(true);
      setDirty(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const tabs: Array<{ id: Tab; label: string; icon: JSX.Element }> = [
    { id: 'score', label: '점수 · 오답 체크', icon: <ClipboardCheck size={16} /> },
    { id: 'exp', label: 'EXP 시간 통계', icon: <Timer size={16} /> },
    { id: 'save', label: '저장 · 공유', icon: <Save size={16} /> },
  ];

  const correctCount = result.totalQuestions - wrong.size;
  const chartData = logs.map((l) => ({
    q: l.questionNo,
    first: +(l.firstLapMs / 1000).toFixed(1),
    retry: +(l.retryMs / 1000).toFixed(1),
    wrong: wrong.has(l.questionNo),
  }));
  const sectionChart = breakdown.map((b) => ({ name: b.section.name, wrong: b.wrong, correct: b.total - b.wrong }));

  return (
    <div className="space-y-4">
      {saved && !user && !SITE.betaFree && (
        <div className="flex flex-col gap-2 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2">
            <Info size={18} className="mt-0.5 shrink-0" />
            <span>현재 비회원 모드로 브라우저에 임시 저장되었습니다. 로그인하면 모든 기기에서 파트별 누적 오답률과 시간 단축 추이를 확인할 수 있습니다.</span>
          </div>
          <button type="button" onClick={openLogin} className="shrink-0 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-600">
            로그인하기
          </button>
        </div>
      )}

      <div className="rounded-2xl bg-slate-900 p-5 text-white shadow-lg">
        <div className="text-xs text-white/60">
          {result.examTitle} · {formatDateTime(result.createdAt)}
        </div>
        {mockName.trim() && <div className="mt-1 text-sm font-bold text-blue-200">{mockName.trim()}</div>}
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-black">{result.subjectName} 결과 리포트</h1>
          {result.subModeName && <span className="rounded bg-white/15 px-2 py-0.5 text-xs">{result.subModeName.split(' (')[0]}</span>}
          {result.electiveName && <span className="rounded bg-white/15 px-2 py-0.5 text-xs">{result.electiveName}</span>}
          {result.endedEarly && <span className="rounded bg-amber-500 px-2 py-0.5 text-xs font-bold text-amber-950">조기 종료</span>}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-xl bg-white/10 p-2">
            <div className="text-white/60">사용 시간</div>
            <div className="mt-0.5 font-mono text-base font-bold">{msToMMSS(result.elapsedMs)}</div>
          </div>
          <div className="rounded-xl bg-white/10 p-2">
            <div className="text-white/60">제한 시간</div>
            <div className="mt-0.5 font-mono text-base font-bold">{result.durationMin}:00</div>
          </div>
          <div className="rounded-xl bg-white/10 p-2">
            <div className="text-white/60">정답 / 문항</div>
            <div className="mt-0.5 font-mono text-base font-bold">
              {correctCount}/{result.totalQuestions}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-200 p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cx(
              'flex items-center justify-center gap-1 rounded-lg py-2 text-xs font-bold sm:text-sm',
              tab === t.id ? 'bg-white text-slate-900 shadow' : 'text-slate-600',
            )}
          >
            {t.icon}
            <span className="truncate">{t.label}</span>
          </button>
        ))}
      </div>

      {tab === 'score' && (
        <>
          <AnswerKeyPanel
            total={result.totalQuestions}
            subjectName={result.subjectName}
            electiveName={result.electiveName}
            mockName={mockName}
            onMockName={markDirty(setMockName)}
            answerKey={answerKey}
            onAnswerKey={markDirty(setAnswerKey)}
            myAnswers={myAnswers}
            onMyAnswers={markDirty(setMyAnswers)}
            onGraded={(wrongQs, score) => {
              setWrong(new Set(wrongQs));
              if (score !== null) setScoreText(String(score));
              setDirty(true);
            }}
          />
          <Card>
            <SectionTitle icon={<Trophy size={18} />}>총점 입력</SectionTitle>
            <div className="flex items-center gap-2">
              <input
                inputMode="numeric"
                value={scoreText}
                onChange={(e) => {
                  setScoreText(e.target.value.replace(/[^0-9.]/g, ''));
                  setDirty(true);
                }}
                placeholder="예: 92"
                className="h-12 w-32 rounded-xl border border-slate-300 px-3 text-lg font-bold tabular-nums outline-none focus:border-blue-500"
              />
              <span className="text-sm text-slate-500">점</span>
            </div>
          </Card>

          <Card>
            <SectionTitle
              icon={<ClipboardCheck size={18} />}
              right={
                wrong.size > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setWrong(new Set());
                      setDirty(true);
                    }}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                  >
                    초기화
                  </button>
                )
              }
            >
              오답 문항 체크 (OMR)
            </SectionTitle>
            <p className="mb-3 text-xs text-slate-500">틀린 문항 번호를 눌러 빨간색으로 체크하세요. 오답 {wrong.size}개</p>
            <OmrGrid total={result.totalQuestions} wrong={wrong} onToggle={toggleWrong} />
          </Card>

          <Card>
            <SectionTitle icon={<BarChart3 size={18} />}>파트별 오답 분석</SectionTitle>
            <div style={{ height: Math.max(140, sectionChart.length * 48) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sectionChart} layout="vertical" margin={{ left: 4, right: 16, top: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="wrong" name="오답" stackId="s" fill={RED} radius={[4, 0, 0, 4]} />
                  <Bar dataKey="correct" name="정답" stackId="s" fill={GREEN} radius={[0, 4, 4, 0]} fillOpacity={0.35} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <ul className="mt-3 divide-y text-sm">
              {breakdown.map((b) => (
                <li key={b.section.id} className="flex items-center justify-between gap-2 py-2">
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-slate-800">{b.section.name}</div>
                    <div className="text-xs text-slate-500">
                      {b.section.q_start}~{b.section.q_end}번{b.wrongQuestions.length > 0 && ` · 오답: ${b.wrongQuestions.join(', ')}번`}
                      {result.expMode && b.timeMs > 0 && ` · 소요 ${msToKorean(b.timeMs)}`}
                    </div>
                  </div>
                  <div className={cx('shrink-0 text-right font-bold tabular-nums', b.wrong > 0 ? 'text-red-600' : 'text-emerald-600')}>
                    {b.wrong}/{b.total}
                    <div className="text-[11px] font-medium text-slate-500">오답률 {(b.wrongRate * 100).toFixed(0)}%</div>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}

      {tab === 'exp' &&
        (!result.expMode || result.laps.length === 0 ? (
          <Card>
            <div className="py-6 text-center text-sm text-slate-500">
              {result.expMode ? '기록된 Lap이 없습니다.' : '이번 시험은 EXP 모드 OFF로 진행되어 문항별 시간 기록이 없습니다.'}
            </div>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Stat label="문항당 평균" value={msToKorean(summary.meanMs)} sub={`시도 ${summary.attemptedCount}문항`} tone="blue" />
              <Stat label="표준편차" value={msToKorean(summary.stdMs)} sub="편차가 클수록 시간 분배 불균형" />
              <Stat label="완료 문항" value={`${summary.completedCount}/${result.totalQuestions}`} tone="emerald" />
              <Stat
                label="첫 포기까지 평균"
                value={summary.avgFirstGiveUpMs > 0 ? msToKorean(summary.avgFirstGiveUpMs) : '-'}
                sub={`회귀 문항 ${summary.regressions.length}개`}
                tone="amber"
              />
            </div>

            <SolveTimeline laps={result.laps} totalMs={result.elapsedMs || result.durationMin * 60_000} wrong={wrong} />
            <SectionCompare result={result} sections={sections} />

            <Card>
              <SectionTitle icon={<Timer size={18} />}>문항별 소요 시간 (초)</SectionTitle>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ left: -16, right: 8, top: 8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="q"
                      interval={result.totalQuestions > 30 ? 1 : 0}
                      tick={(props: { x: number; y: number; payload: { value: number } }) => {
                        const isWrong = wrong.has(props.payload.value);
                        return (
                          <text x={props.x} y={props.y + 12} textAnchor="middle" fontSize={10} fontWeight={isWrong ? 800 : 400} fill={isWrong ? RED : '#64748b'}>
                            {props.payload.value}
                          </text>
                        );
                      }}
                    />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(v: number, name: string) => [`${v}초`, name]}
                      labelFormatter={(q: number) => `${q}번 문항${wrong.has(q) ? ' (오답)' : ''}`}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="first" name="1차 풀이" stackId="t" fill={BLUE} />
                    <Bar dataKey="retry" name="재도전 (2차 이상)" stackId="t" fill={ORANGE} radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="mt-1 text-[11px] text-slate-500">X축의 빨간 번호는 오답으로 체크한 문항입니다.</p>
            </Card>

            <div className="grid gap-4 sm:grid-cols-2">
              <Card>
                <SectionTitle icon={<AlertTriangle size={18} className="text-red-500" />}>Time Killer Top 5</SectionTitle>
                <ol className="space-y-2">
                  {summary.timeKillers.map((l, i) => (
                    <li key={l.questionNo} className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2">
                      <span className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">{i + 1}</span>
                        <span className="font-bold">{l.questionNo}번</span>
                        {wrong.has(l.questionNo) && <span className="rounded bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">오답 ⚠</span>}
                      </span>
                      <span className="text-sm font-semibold tabular-nums">{msToKorean(l.totalMs)}</span>
                    </li>
                  ))}
                </ol>
              </Card>
              <Card>
                <SectionTitle icon={<RotateCcw size={18} className="text-orange-500" />}>보류 후 재도전 (회귀) 문항</SectionTitle>
                {summary.regressions.length === 0 ? (
                  <p className="text-sm text-slate-500">여러 번에 나눠 푼 문항이 없습니다.</p>
                ) : (
                  <>
                    <ul className="space-y-2">
                      {summary.regressions.map((l) => (
                        <li key={l.questionNo} className="rounded-xl bg-orange-50 px-3 py-2 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="font-bold">
                              {l.questionNo}번 <span className="text-xs font-medium text-slate-500">({l.visits}회 접근)</span>
                              {wrong.has(l.questionNo) && <span className="ml-1 rounded bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">오답</span>}
                            </span>
                            <span className="font-semibold tabular-nums">{msToKorean(l.totalMs)}</span>
                          </div>
                          <div className="text-xs text-slate-600">
                            첫 포기 {msToKorean(l.firstLapMs)} → 재도전 {msToKorean(l.retryMs)}
                          </div>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-3 rounded-lg bg-slate-100 p-2 text-xs text-slate-600">
                      손절 타이밍: 막힌 문항을 평균 <b>{msToKorean(summary.avgFirstGiveUpMs)}</b> 만에 보류했습니다.
                      {summary.avgFirstGiveUpMs > summary.meanMs * 1.5 && summary.meanMs > 0 && ' 평균 풀이 시간보다 훨씬 길어요 — 더 빨리 넘기는 연습이 필요합니다.'}
                    </p>
                  </>
                )}
              </Card>
            </div>

            <Card>
              <SectionTitle>문항별 상세 기록</SectionTitle>
              <div className="-mx-4 overflow-x-auto sm:mx-0">
                <table className="w-full min-w-[560px] text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-3 py-2">문항</th>
                      <th className="px-3 py-2">파트</th>
                      <th className="px-3 py-2">Lap 번호</th>
                      <th className="px-3 py-2">구간별 시간</th>
                      <th className="px-3 py-2 text-right">총 소요</th>
                      <th className="px-3 py-2 text-center">정오답</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {logs.map((l) => {
                      const isWrong = wrong.has(l.questionNo);
                      return (
                        <tr key={l.questionNo} className={cx(isWrong && 'bg-red-50/60', l.visits === 0 && 'text-slate-400')}>
                          <td className="px-3 py-2 font-bold">{l.questionNo}번</td>
                          <td className="max-w-[120px] truncate px-3 py-2">{findSection(sections, l.questionNo)?.name ?? '-'}</td>
                          <td className="px-3 py-2 tabular-nums">{l.lapNos.length ? l.lapNos.map((n) => `#${n}`).join(', ') : '-'}</td>
                          <td className="px-3 py-2 tabular-nums">
                            {l.lapDurations.length
                              ? l.lapDurations.map((d, i) => (
                                  <span key={i} className={i === 0 ? 'text-blue-700' : 'text-orange-600'}>
                                    {i > 0 && ' + '}
                                    {msToKorean(d)}
                                  </span>
                                ))
                              : '-'}
                          </td>
                          <td className="px-3 py-2 text-right font-semibold tabular-nums">{l.totalMs ? msToKorean(l.totalMs) : '-'}</td>
                          <td className="px-3 py-2 text-center">
                            {isWrong ? <span className="font-bold text-red-600">✕ 오답</span> : <span className="text-emerald-600">○</span>}
                            {!l.isCompleted && l.visits > 0 && <div className="text-[10px] text-orange-600">미완료</div>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        ))}

      {tab === 'save' && (
        <>
        <Card>
          <SectionTitle icon={<Save size={18} />}>결과 저장</SectionTitle>
          <textarea
            value={memo}
            onChange={(e) => {
              setMemo(e.target.value);
              setDirty(true);
            }}
            placeholder="메모 (예: 독서 2지문 시간 초과, 문학 선지 재확인 필요)"
            className="h-24 w-full rounded-xl border border-slate-300 p-3 text-sm outline-none focus:border-blue-500"
          />
          <div className="mt-2 text-xs text-slate-500">
            점수 {scoreText || '미입력'} · 오답 {wrong.size}개 · Lap {result.laps.length}개 · 저장 위치: {user ? `${user.name} 계정 (데모: 이 브라우저)` : '이 브라우저 (비회원)'}
          </div>
        </Card>
        <ShareCardPanel
          data={{
            title: mockName.trim() || result.examTitle,
            subject: [result.subjectName, result.electiveName].filter(Boolean).join(' · '),
            dateLabel: formatDateTime(result.createdAt).slice(0, 10),
            score: scoreText.trim() === '' ? null : Number(scoreText),
            correct: correctCount,
            total: result.totalQuestions,
            elapsedLabel: msToMMSS(result.elapsedMs),
            durationLabel: `${result.durationMin}:00`,
            sections: breakdown.map((b) => ({ name: b.section.name, time: result.expMode && b.timeMs > 0 ? msToKorean(b.timeMs) : null, wrong: b.wrong, total: b.total })),
            highlight: result.expMode && summary.attemptedCount ? `문항당 평균 ${msToKorean(summary.meanMs)} · 보류 후 다시 푼 문항 ${summary.regressions.length}개` : undefined,
          }}
        />
        </>
      )}

      {error && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <button
          type="button"
          onClick={save}
          disabled={saving || (saved && !dirty)}
          className="flex h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-black text-white shadow hover:bg-blue-700 disabled:bg-emerald-600 sm:col-span-1"
        >
          {saved && !dirty ? (
            <>
              <CheckCircle2 size={18} /> 저장 완료
            </>
          ) : (
            <>
              <Save size={18} /> {saved ? '변경 내용 저장' : '결과 저장하기'}
            </>
          )}
        </button>
        <button type="button" onClick={onRetry} className="flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white text-sm font-bold text-slate-700 hover:bg-slate-50">
          <RotateCcw size={18} /> 같은 과목 다시 응시
        </button>
        <button type="button" onClick={onHome} className="flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white text-sm font-bold text-slate-700 hover:bg-slate-50">
          <Home size={18} /> 홈으로
        </button>
      </div>
    </div>
  );
}
