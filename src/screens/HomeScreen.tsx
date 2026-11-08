import {
  BarChart3,
  BookOpen,
  Calculator,
  CalendarClock,
  ChevronDown,
  ChevronRight,
  Clock,
  Code2,
  Compass,
  Flame,
  FlaskConical,
  Globe2,
  HelpCircle,
  History,
  Landmark,
  Languages,
  ListOrdered,
  Mail,
  MessageSquareHeart,
  Monitor,
  Moon,
  Scale,
  Shield,
  Sparkles,
  Sun,
  Users,
} from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { HomeHeading } from '../components/ui';
import { cx } from '../components/ui';
import { useApp } from '../context/AppContext';
import { EXAM_CATEGORIES, examsInCategory, getExamConfig, subjectLabel, type ExamSubject } from '../data/examConfigData';
import { formatDateTime } from '../lib/time';
import type { ExamResult } from '../types';

const ICONS: Record<string, ReactNode> = {
  kor: <BookOpen size={20} />,
  math: <Calculator size={20} />,
  eng: <Globe2 size={20} />,
  hist: <Landmark size={20} />,
  sci: <FlaskConical size={20} />,
  soc: <Users size={20} />,
};

/** 과목 id 접두어로 아이콘 선택 (새 시험을 추가해도 기본 아이콘으로 동작) */
function iconFor(id: string): ReactNode {
  if (ICONS[id]) return ICONS[id];
  const prefix: Array<[string, ReactNode]> = [
    ['toeic', <Globe2 key="t" size={20} />],
    ['cl', <Monitor key="c" size={20} />],
    ['kh', <Landmark key="k" size={20} />],
    ['eip', <Code2 key="e" size={20} />],
    ['jlpt', <Languages key="j" size={20} />],
    ['police', <Shield key="p" size={20} />],
    ['fire', <Flame key="f" size={20} />],
  ];
  return prefix.find(([p]) => id.startsWith(p))?.[1] ?? <Scale size={20} />;
}

const ACCENT: Record<NonNullable<ExamSubject['accent']>, string> = {
  blue: 'bg-blue-50 text-blue-600',
  violet: 'bg-violet-50 text-violet-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  sky: 'bg-sky-50 text-sky-600',
  rose: 'bg-rose-50 text-rose-600',
  slate: 'bg-slate-100 text-slate-600',
};

const tile = 'rounded-[20px] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)]';

export function HomeScreen({
  examId,
  onExamChange,
  onSelect,
  onOpenHistory,
  onOpenResult,
  onFeedback,
  onSettings,
}: {
  examId: string;
  onExamChange: (id: string) => void;
  onSelect: (subjectId: string) => void;
  onOpenHistory: () => void;
  onOpenResult: (r: ExamResult) => void;
  onFeedback: (kind: 'feedback' | 'inquiry') => void;
  onSettings: () => void;
}) {
  const config = getExamConfig(examId);
  const { openTutorial, repository, isDark, setTheme } = useApp();
  const [showSchedule, setShowSchedule] = useState(false);
  const [recent, setRecent] = useState<ExamResult[] | null>(null);

  useEffect(() => {
    let alive = true;
    void repository.list().then((r) => alive && setRecent(r.slice(0, 4)));
    return () => {
      alive = false;
    };
  }, [repository]);

  const exams = examsInCategory(config.category);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
      {/* ───────── 왼쪽: 시험 선택 + 과목 ───────── */}
      <div className="min-w-0 space-y-6">
        {/* 분류·시험 선택 */}
        <section className={cx(tile, 'p-4 sm:p-5')}>
          <div role="tablist" aria-label="시험 분류" className="grid grid-cols-3 gap-1 rounded-full bg-slate-100 p-1">
            {EXAM_CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                role="tab"
                aria-selected={config.category === c.id}
                onClick={() => onExamChange(examsInCategory(c.id)[0].exam_id)}
                className={cx(
                  'h-10 rounded-full text-sm font-black transition',
                  config.category === c.id ? 'bg-white text-slate-900 shadow-[0_1px_3px_rgba(15,23,42,0.12)]' : 'text-slate-500 hover:text-slate-800',
                )}
              >
                {c.name}
              </button>
            ))}
          </div>
          {exams.length > 1 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {exams.map((c) => (
                <button
                  key={c.exam_id}
                  type="button"
                  onClick={() => onExamChange(c.exam_id)}
                  aria-pressed={c.exam_id === examId}
                  className={cx(
                    'rounded-full px-3.5 py-1.5 text-xs font-bold transition',
                    c.exam_id === examId ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                  )}
                >
                  {c.short_title ?? c.exam_title}
                </button>
              ))}
            </div>
          )}
        </section>

        {/* 과목 타일 */}
        <section>
          <HomeHeading icon={<CalendarClock size={20} className="text-blue-600" />} right={config.edition && <span className="text-xs font-semibold text-slate-500">{config.edition}</span>}>
            {config.exam_title}
          </HomeHeading>
          {config.notice && <p className="-mt-1 mb-3 text-xs leading-relaxed text-slate-500">{config.notice}</p>}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {config.subjects.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => onSelect(s.id)}
                className={cx(tile, 'group flex flex-col p-4 text-left transition hover:-translate-y-0.5 hover:shadow-[0_6px_16px_rgba(15,23,42,0.08)]')}
              >
                <span className={cx('flex h-9 w-9 items-center justify-center rounded-xl', ACCENT[s.accent ?? 'slate'])}>{iconFor(s.id)}</span>
                <span className="mt-4 text-[11px] font-semibold text-slate-400">{s.period}</span>
                <span className="text-[17px] font-black leading-snug text-slate-900">{subjectLabel(s)}</span>
                <span className="mt-2 space-y-0.5 text-xs text-slate-500">
                  {s.sub_modes ? (
                    s.sub_modes.map((m) => (
                      <span key={m.id} className="flex items-center gap-1 tabular-nums">
                        <Clock size={11} className="shrink-0" />
                        {m.id === 'sub1' ? '제1' : m.id === 'sub2' ? '제2' : m.id} {m.start_time}~{m.end_time}
                      </span>
                    ))
                  ) : (
                    <span className="flex items-center gap-1 tabular-nums">
                      <Clock size={11} className="shrink-0" />
                      {s.start_time} ~ {s.end_time}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <ListOrdered size={11} className="shrink-0" />
                    {s.duration_min}분 · {s.total_questions}문항
                  </span>
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* 전체 시간표 */}
        <section className={cx(tile, 'overflow-hidden')}>
          <button type="button" onClick={() => setShowSchedule((v) => !v)} className="flex w-full items-center justify-between px-5 py-4 text-sm font-black text-slate-800">
            전체 시간표
            <span className="flex items-center gap-1 text-xs font-semibold text-slate-500">
              {showSchedule ? '접기' : '펼치기'}
              <ChevronDown size={16} className={cx('transition', showSchedule && 'rotate-180')} />
            </span>
          </button>
          {showSchedule && (
            <div className="overflow-x-auto px-5 pb-4">
              <table className="w-full min-w-[480px] text-left text-xs">
                <thead className="text-slate-400">
                  <tr>
                    <th className="py-2 font-semibold">구분</th>
                    <th className="font-semibold">영역</th>
                    <th className="font-semibold">시간</th>
                    <th className="font-semibold">시간(분)</th>
                    <th className="font-semibold">문항</th>
                    <th className="font-semibold">입실</th>
                  </tr>
                </thead>
                <tbody>
                  {config.schedule_summary.map((r, i) => (
                    <tr key={i} className={cx('border-t border-slate-100', r.type !== 'exam' && 'text-slate-400')}>
                      <td className="py-2 font-semibold">{r.period}</td>
                      <td>{r.name}</td>
                      <td className="tabular-nums">{r.time}</td>
                      <td className="tabular-nums">{r.duration}</td>
                      <td className="tabular-nums">{r.questions ?? '-'}</td>
                      <td>{r.entry_deadline}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* ───────── 오른쪽: 최근 기록 + 가이드 ───────── */}
      <aside className="min-w-0 space-y-6">
        <section>
          <HomeHeading icon={<History size={20} className="text-orange-500" />}>최근 응시 기록</HomeHeading>
          <div className={cx(tile, 'overflow-hidden')}>
            {recent === null ? (
              <div className="p-5 text-sm text-slate-400">불러오는 중…</div>
            ) : recent.length === 0 ? (
              <div className="p-5 text-sm text-slate-500">
                아직 기록이 없어요.
                <br />
                과목을 골라 첫 모의고사를 시작해보세요.
              </div>
            ) : (
              <ul>
                {recent.map((r, i) => (
                  <li key={r.id} className={cx(i > 0 && 'border-t border-slate-100')}>
                    <button type="button" onClick={() => onOpenResult(r)} className="flex w-full items-center gap-3 px-5 py-3.5 text-left hover:bg-slate-50">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold text-slate-900">{r.mockName ?? `${r.subjectName} 모의고사`}</span>
                        <span className="block truncate text-xs text-slate-500">
                          {r.subjectName} · {formatDateTime(r.createdAt).slice(0, 10)}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block text-base font-black tabular-nums text-slate-900">{r.score !== null ? `${r.score}점` : `${r.totalQuestions - r.wrongQuestions.length}/${r.totalQuestions}`}</span>
                        {r.sample && <span className="text-[10px] font-bold text-violet-600">예시</span>}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <button type="button" onClick={onOpenHistory} className="flex w-full items-center justify-center gap-1 border-t border-slate-100 py-3 text-sm font-semibold text-slate-500 hover:bg-slate-50">
              누적 기록 더보기 <ChevronRight size={15} />
            </button>
          </div>
        </section>

        <section>
          <HomeHeading icon={<Compass size={20} className="text-emerald-600" />}>실모벅벅 가이드</HomeHeading>
          <div className={cx(tile, 'grid grid-cols-2 gap-1 p-3')}>
            {(
              [
                [<HelpCircle key="h" size={20} className="text-blue-600" />, '사용법', openTutorial],
                [<BarChart3 key="b" size={20} className="text-violet-600" />, '오답 통계', onOpenHistory],
                [<MessageSquareHeart key="m" size={20} className="text-rose-500" />, '의견 보내기', () => onFeedback('feedback')],
                [<Mail key="i" size={20} className="text-sky-600" />, '문의하기', () => onFeedback('inquiry')],
                [isDark ? <Sun key="s" size={20} className="text-amber-500" /> : <Moon key="d" size={20} className="text-slate-600" />, isDark ? '라이트 모드' : '다크 모드', () => setTheme(isDark ? 'light' : 'dark')],
                [<Sparkles key="t" size={20} className="text-amber-500" />, '설정', onSettings],
              ] as Array<[ReactNode, string, () => void]>
            ).map(([icon, label, onClick]) => (
              <button key={label} type="button" onClick={onClick} className="flex items-center gap-2.5 rounded-xl px-3 py-3 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50">
                {icon}
                {label}
              </button>
            ))}
          </div>
        </section>

        <p className="flex items-start gap-1.5 px-1 text-xs leading-relaxed text-slate-500">
          <Sparkles size={13} className="mt-0.5 shrink-0 text-amber-500" /> 국가고시 등 다른 시험도 계속 추가될 예정입니다.
        </p>
      </aside>
    </div>
  );
}
