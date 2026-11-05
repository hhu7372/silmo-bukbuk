import { ArrowDownUp, BarChart3, ChevronRight, FolderKanban, History, Pencil, Trash2, TrendingUp } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { confirmAsync } from '../components/ConfirmHost';
import { Card, SectionTitle, Stat, cx } from '../components/ui';
import { useApp } from '../context/AppContext';
import { getExamConfig, getSubject, subjectLabel } from '../data/examConfigData';
import { SITE } from '../config/site';
import { GroupEditor } from '../components/GroupEditor';
import { DEFAULT_VIEW, groupOf, sortResults, UNGROUPED, type HistoryView } from '../lib/recordGroups';
import { loadPref, savePref } from '../repository/resultRepository';
import { generateSampleResults } from '../lib/sampleData';
import { buildQuestionLogs, summarize } from '../lib/stats';
import { formatDateTime, msToKorean } from '../lib/time';
import type { ExamResult } from '../types';

export function HistoryScreen({ examId, onOpen }: { examId: string; onOpen: (r: ExamResult) => void }) {
  const { repository, user, openLogin } = useApp();
  const [results, setResults] = useState<ExamResult[] | null>(null);
  const config = getExamConfig(examId);
  const [subjectId, setSubjectId] = useState<string>(config.subjects[0]?.id ?? '');
  const [query, setQuery] = useState('');

  useEffect(() => {
    let alive = true;
    void repository.list().then((r) => alive && setResults(r));
    return () => {
      alive = false;
    };
  }, [repository]);

  /** 현재 시험 데이터 + 개편으로 빠진 과목이라도 기록이 남아 있으면 목록에 유지 */
  const subjectTabs = useMemo(() => {
    const tabs: Array<{ id: string; label: string; legacy: boolean }> = config.subjects.map((s) => ({ id: s.id, label: subjectLabel(s), legacy: false }));
    for (const r of results ?? []) {
      if (r.examId === examId && !tabs.some((t) => t.id === r.subjectId)) tabs.push({ id: r.subjectId, label: r.subjectName, legacy: true });
    }
    return tabs;
  }, [config, results, examId]);
  // 저장된 기록을 불러오는 중에는 과목을 바꾸지 않음
  useEffect(() => {
    if (results !== null && !subjectTabs.some((s) => s.id === subjectId)) setSubjectId(subjectTabs[0]?.id ?? '');
  }, [subjectTabs, subjectId]);

  const subject = getSubject(examId, subjectId);
  const subjectResults = useMemo(
    () => (results ?? []).filter((r) => r.examId === examId && r.subjectId === subjectId),
    [results, examId, subjectId],
  );

  // 보기 방식: 기본은 최신순/오래된순, 추가 옵션으로 사용자 정의 묶음
  const [view, setViewState] = useState<HistoryView>(() => loadPref('history-view', DEFAULT_VIEW));
  const setView = (patch: Partial<HistoryView>) =>
    setViewState((v) => {
      const next = { ...v, ...patch };
      savePref('history-view', next);
      return next;
    });
  const [editingGroups, setEditingGroups] = useState(false);
  const groupNames = useMemo(() => new Map([...view.groups.map((g) => [g.id, g.name] as const), [UNGROUPED, '미분류']]), [view.groups]);
  const groupCount = (id: string) => subjectResults.filter((r) => groupOf(r, view.groups) === id).length;
  const activeGroup = view.grouped && (view.active === UNGROUPED || view.groups.some((g) => g.id === view.active)) ? view.active : 'all';

  /** 통계·목록에 쓰는 기록 (묶어서 보기에서 묶음을 고르면 그 묶음만) */
  const filtered = useMemo(
    () => (activeGroup === 'all' ? subjectResults : subjectResults.filter((r) => groupOf(r, view.groups) === activeGroup)),
    [subjectResults, activeGroup, view.groups],
  );

  const chronological = useMemo(() => [...filtered].sort((a, b) => a.createdAt.localeCompare(b.createdAt)), [filtered]);

  const trend = chronological.map((r, i) => {
    const s = r.expMode ? summarize(buildQuestionLogs(r.laps, r.totalQuestions)) : null;
    return {
      idx: `${i + 1}회`,
      date: formatDateTime(r.createdAt),
      score: r.score,
      wrong: r.wrongQuestions.length,
      avgSec: s && s.attemptedCount ? +(s.meanMs / 1000).toFixed(1) : null,
    };
  });

  const sectionStats = useMemo(() => {
    if (!subject) return [];
    return subject.sections.map((sec) => {
      const size = sec.q_end - sec.q_start + 1;
      let wrong = 0;
      for (const r of filtered) wrong += r.wrongQuestions.filter((q) => q >= sec.q_start && q <= sec.q_end).length;
      const totalQs = size * filtered.length;
      return { name: sec.name, rate: totalQs ? +((wrong / totalQs) * 100).toFixed(1) : 0, wrong, totalQs };
    });
  }, [subject, filtered]);

  /** 자주 틀린 문항 번호 */
  const frequentWrong = useMemo(() => {
    const cnt = new Map<number, number>();
    for (const r of filtered) for (const q of r.wrongQuestions) cnt.set(q, (cnt.get(q) ?? 0) + 1);
    return [...cnt.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0]).slice(0, 8);
  }, [filtered]);

  const scored = filtered.filter((r) => r.score !== null);
  const avgScore = scored.length ? scored.reduce((s, r) => s + (r.score ?? 0), 0) / scored.length : null;
  const avgWrong = filtered.length ? filtered.reduce((s, r) => s + r.wrongQuestions.length, 0) / filtered.length : 0;
  const avgSecs = trend.filter((t) => t.avgSec !== null).map((t) => t.avgSec as number);

  const remove = async (id: string) => {
    if (!(await confirmAsync('이 기록을 삭제할까요?', { confirmLabel: '삭제', danger: true }))) return;
    await repository.remove(id);
    setResults(await repository.list());
  };

  const [seeding, setSeeding] = useState(false);
  const seedSamples = async () => {
    setSeeding(true);
    for (const r of generateSampleResults()) await repository.save(r);
    setResults(await repository.list());
    setSeeding(false);
  };
  const clearSamples = async () => {
    if (!(await confirmAsync('예시 데이터를 모두 삭제할까요? 직접 저장한 기록은 그대로 남습니다.', { confirmLabel: '예시 삭제', danger: true }))) return;
    for (const r of (await repository.list()).filter((x) => x.sample)) await repository.remove(r.id);
    setResults(await repository.list());
  };
  const sampleCount = (results ?? []).filter((r) => r.sample).length;

  const listed = sortResults(
    filtered.filter((r) => !query.trim() || `${r.mockName ?? ''} ${r.memo ?? ''}`.toLowerCase().includes(query.trim().toLowerCase())),
    view.order,
  );
  const sections: Array<{ id: string; items: ExamResult[] }> =
    view.grouped && activeGroup === 'all'
      ? [...view.groups.map((g) => g.id), UNGROUPED].map((id) => ({ id, items: listed.filter((r) => groupOf(r, view.groups) === id) })).filter((x) => x.items.length > 0)
      : [{ id: 'flat', items: listed }];

  const countBySubject = (sid: string) => (results ?? []).filter((r) => r.examId === examId && r.subjectId === sid).length;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-black text-slate-900">
          <History size={22} /> 누적 기록 및 오답 통계
        </h1>
        <p className="text-xs text-slate-500">{config.exam_title}</p>
      </div>

      {!user && !SITE.betaFree && (
        <div className="flex items-center justify-between gap-2 rounded-xl bg-slate-200/70 px-3 py-2 text-xs text-slate-700">
          <span>비회원 기록은 이 브라우저에만 저장됩니다.</span>
          <button type="button" onClick={openLogin} className="shrink-0 font-bold text-blue-700">
            로그인
          </button>
        </div>
      )}

      {sampleCount > 0 ? (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs text-violet-900">
          <span>
            예시 데이터 <b>{sampleCount}개</b>가 함께 표시되고 있습니다. (2026년 3~10월 모의고사 8회 · 6과목)
          </span>
          <button type="button" onClick={() => void clearSamples()} className="shrink-0 font-bold text-violet-700 hover:underline">
            예시 데이터 삭제
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-dashed border-slate-300 bg-white px-3 py-2 text-xs text-slate-600">
          <span>기능을 먼저 살펴보고 싶다면 예시 기록을 채워보세요.</span>
          <button
            type="button"
            disabled={seeding}
            onClick={() => void seedSamples()}
            className="shrink-0 rounded-lg bg-violet-600 px-2.5 py-1 font-bold text-white disabled:opacity-50"
          >
            {seeding ? '채우는 중…' : '예시 데이터 채우기'}
          </button>
        </div>
      )}

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {subjectTabs.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSubjectId(s.id)}
            title={s.legacy ? '현재 시험 구성에는 없는 과목의 기록입니다' : undefined}
            className={cx(
              'shrink-0 rounded-full border px-3 py-1.5 text-sm font-bold',
              s.id === subjectId ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 bg-white text-slate-600',
            )}
          >
            {s.label}
            {s.legacy && <span className="ml-1 text-[10px] font-semibold opacity-70">(이전 구성)</span>} <span className="opacity-60">{countBySubject(s.id)}</span>
          </button>
        ))}
      </div>

      {/* 보기 방식 */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setView({ order: view.order === 'desc' ? 'asc' : 'desc' })}
          className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
        >
          <ArrowDownUp size={14} /> {view.order === 'desc' ? '최신순' : '오래된순'}
        </button>
        <button
          type="button"
          onClick={() => setView({ grouped: !view.grouped })}
          aria-pressed={view.grouped}
          className={cx(
            'flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-bold',
            view.grouped ? 'border-amber-400 bg-amber-50 text-amber-800' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
          )}
        >
          <FolderKanban size={14} /> 묶어서 보기 {view.grouped ? 'ON' : 'OFF'}
        </button>
        {view.grouped && (
          <button type="button" onClick={() => setEditingGroups(true)} className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200/60">
            <Pencil size={13} /> 묶음 설계
          </button>
        )}
      </div>
      {view.grouped && (
        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1">
          {['all', ...view.groups.map((g) => g.id), UNGROUPED].map((id) => {
            const count = id === 'all' ? subjectResults.length : groupCount(id);
            if (id === UNGROUPED && count === 0) return null;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setView({ active: id })}
                className={cx(
                  'shrink-0 rounded-lg border px-2.5 py-1 text-xs font-bold',
                  activeGroup === id ? 'border-amber-500 bg-amber-500 text-white' : 'border-amber-200 bg-white text-amber-800',
                )}
              >
                {id === 'all' ? '전체' : groupNames.get(id)} <span className="opacity-70">{count}</span>
              </button>
            );
          })}
        </div>
      )}
      {editingGroups && <GroupEditor groups={view.groups} onSave={(groups) => setView({ groups })} onClose={() => setEditingGroups(false)} />}

      {results === null ? (
        <Card>
          <div className="py-6 text-center text-sm text-slate-500">불러오는 중…</div>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <div className="py-10 text-center text-sm text-slate-500">
            {activeGroup !== 'all' ? `'${groupNames.get(activeGroup)}' 묶음에 해당하는 ` : '아직 저장된 '}
            {subject ? subjectLabel(subject) : ''} 기록이 없습니다.
            <br />
            시험을 마친 뒤 [결과 저장하기]를 누르면 여기에 쌓입니다.
          </div>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="응시 횟수" value={`${filtered.length}회`} />
            <Stat label="평균 점수" value={avgScore === null ? '-' : avgScore.toFixed(1)} tone="blue" />
            <Stat label="평균 오답" value={`${avgWrong.toFixed(1)}개`} tone="red" />
            <Stat
              label="문항당 평균 시간"
              value={avgSecs.length ? msToKorean((avgSecs.reduce((a, b) => a + b, 0) / avgSecs.length) * 1000) : '-'}
              sub={avgSecs.length >= 2 ? `첫 회 대비 ${(avgSecs[avgSecs.length - 1] - avgSecs[0]).toFixed(1)}초` : undefined}
              tone="amber"
            />
          </div>

          <Card>
            <SectionTitle icon={<BarChart3 size={18} />}>파트별 누적 오답률 (%)</SectionTitle>
            <div style={{ height: Math.max(140, sectionStats.length * 46) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sectionStats} layout="vertical" margin={{ left: 4, right: 20, top: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => [`${v}%`, '오답률']} />
                  <Bar dataKey="rate" fill="#ef4444" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            {frequentWrong.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
                <span className="font-semibold text-slate-600">자주 틀린 문항:</span>
                {frequentWrong.map(([q, c]) => (
                  <span key={q} className="rounded-full bg-red-100 px-2 py-0.5 font-bold text-red-700">
                    {q}번 ×{c}
                  </span>
                ))}
              </div>
            )}
          </Card>

          {trend.length >= 1 && (
            <Card>
              <SectionTitle icon={<TrendingUp size={18} />}>점수 · 시간 추이</SectionTitle>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trend} margin={{ left: -16, right: 8, top: 8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="idx" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="l" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 11 }} />
                    <Tooltip labelFormatter={(_l, p) => (p?.[0]?.payload as { date?: string } | undefined)?.date ?? ''} />
                    <Line yAxisId="l" type="monotone" dataKey="score" name="점수" stroke="#2563eb" strokeWidth={2} connectNulls dot />
                    <Line yAxisId="r" type="monotone" dataKey="avgSec" name="문항당 평균(초)" stroke="#f97316" strokeWidth={2} connectNulls dot />
                    <Line yAxisId="r" type="monotone" dataKey="wrong" name="오답 수" stroke="#ef4444" strokeDasharray="4 3" strokeWidth={1.5} dot />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="text-[11px] text-slate-500">파란선: 점수(좌축) · 주황선: 문항당 평균 시간 / 빨간 점선: 오답 수(우축)</p>
            </Card>
          )}

          <Card>
            <SectionTitle>응시 기록{activeGroup !== 'all' && <span className="ml-1 text-sm font-semibold text-amber-700">· {groupNames.get(activeGroup)}</span>}</SectionTitle>
            <input
              id="history-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="모의고사 이름 검색 (예: 9월, 2025, 학력평가)"
              className="mb-2 h-10 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-blue-500"
            />
            {sections.map((sec) => {
              const scoredItems = sec.items.filter((r) => r.score !== null);
              const avg = scoredItems.length ? scoredItems.reduce((a, r) => a + (r.score ?? 0), 0) / scoredItems.length : null;
              return (
                <div key={sec.id} className={cx(sec.id !== 'flat' && 'mt-3 first:mt-0')}>
                  {sec.id !== 'flat' && (
                    <div className="flex items-center justify-between rounded-lg bg-amber-50 px-3 py-1.5 text-xs">
                      <span className="flex items-center gap-1 font-black text-amber-900">
                        <FolderKanban size={13} /> {groupNames.get(sec.id)}
                      </span>
                      <span className="tabular-nums text-amber-800">
                        {sec.items.length}회{avg !== null && ` · 평균 ${avg.toFixed(1)}점`}
                      </span>
                    </div>
                  )}
                  <ul className="divide-y">
                    {sec.items.map((r) => (
                    <li key={r.id} className="flex items-center gap-2 py-2">
                      <button type="button" onClick={() => onOpen(r)} className="flex min-w-0 flex-1 items-center justify-between gap-2 text-left">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-bold text-slate-800">
                            {r.mockName ? <span className="mr-1 text-blue-700">{r.mockName}</span> : null}
                            <span className={r.mockName ? 'text-xs font-medium text-slate-500' : ''}>{formatDateTime(r.createdAt)}</span>
                            {r.electiveName && <span className="ml-1 text-xs font-medium text-slate-500">{r.electiveName}</span>}
                            {r.subModeName && <span className="ml-1 text-xs font-medium text-slate-500">{r.subModeName.split(' (')[0]}</span>}
                          </div>
                          <div className="text-xs text-slate-500">
                            {r.score !== null ? `${r.score}점 · ` : ''}오답 {r.wrongQuestions.length}개 · {r.expMode ? `EXP Lap ${r.laps.length}개` : 'EXP OFF'}
                            {r.endedEarly && ' · 조기 종료'}
                            {r.sample && <span className="ml-1 rounded bg-violet-100 px-1 text-[10px] font-bold text-violet-700">예시</span>}
                          </div>
                        </div>
                        <ChevronRight size={18} className="shrink-0 text-slate-300" />
                      </button>
                      <button type="button" onClick={() => void remove(r.id)} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label="삭제">
                        <Trash2 size={16} />
                      </button>
                    </li>
                    ))}
                  </ul>
                </div>
              );
            })}
            {listed.length === 0 && <p className="py-4 text-center text-xs text-slate-500">검색 결과가 없습니다.</p>}
          </Card>
        </>
      )}
    </div>
  );
}
