import { useApp } from '../context/AppContext';
import { Code2, Flame, HelpCircle, Languages, Monitor, Shield, Sparkles, BookOpen, Calculator, ChevronDown, ChevronRight, Clock, FlaskConical, Globe2, Landmark, ListOrdered, Scale, Users } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { EXAM_CATEGORIES, examsInCategory, getExamConfig, subjectLabel, type ExamSubject } from '../data/examConfigData';
import { cx } from '../components/ui';

const ICONS: Record<string, ReactNode> = {
  kor: <BookOpen size={22} />,
  math: <Calculator size={22} />,
  eng: <Globe2 size={22} />,
  hist: <Landmark size={22} />,
  sci: <FlaskConical size={22} />,
  soc: <Users size={22} />,
};

/** 과목 id 접두어로 아이콘 선택 (새 시험을 추가해도 기본 아이콘으로 동작) */
function iconFor(id: string): ReactNode {
  if (ICONS[id]) return ICONS[id];
  const prefix: Array<[string, ReactNode]> = [
    ['toeic', <Globe2 key="t" size={22} />],
    ['cl', <Monitor key="c" size={22} />],
    ['kh', <Landmark key="k" size={22} />],
    ['eip', <Code2 key="e" size={22} />],
    ['jlpt', <Languages key="j" size={22} />],
    ['police', <Shield key="p" size={22} />],
    ['fire', <Flame key="f" size={22} />],
  ];
  return prefix.find(([p]) => id.startsWith(p))?.[1] ?? <Scale size={22} />;
}

const ACCENT: Record<NonNullable<ExamSubject['accent']>, string> = {
  blue: 'bg-blue-100 text-blue-700',
  violet: 'bg-violet-100 text-violet-700',
  emerald: 'bg-emerald-100 text-emerald-700',
  amber: 'bg-amber-100 text-amber-700',
  sky: 'bg-sky-100 text-sky-700',
  rose: 'bg-rose-100 text-rose-700',
  slate: 'bg-slate-200 text-slate-700',
};

export function HomeScreen({ examId, onExamChange, onSelect }: { examId: string; onExamChange: (id: string) => void; onSelect: (subjectId: string) => void }) {
  const config = getExamConfig(examId);
  const { openTutorial } = useApp();
  const [showSchedule, setShowSchedule] = useState(false);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-700 p-5 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-300">시험 카테고리</span>
          <button type="button" onClick={openTutorial} className="flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-white/20">
            <HelpCircle size={13} /> 사용법
          </button>
        </div>
        {/* 1단계: 분류 */}
        <div role="tablist" aria-label="시험 분류" className="mt-2 grid grid-cols-3 gap-1 rounded-xl bg-white/10 p-1">
          {EXAM_CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={config.category === c.id}
              onClick={() => onExamChange(examsInCategory(c.id)[0].exam_id)}
              className={cx(
                'h-10 rounded-lg text-sm font-black transition',
                config.category === c.id ? 'bg-white text-slate-900 shadow' : 'text-white/75 hover:text-white',
              )}
            >
              {c.name}
            </button>
          ))}
        </div>
        {/* 2단계: 시험 (응시 규모가 큰 순) */}
        {examsInCategory(config.category).length > 1 && (
          <div className="-mx-1 mt-2 flex flex-wrap gap-1.5 px-1">
            {examsInCategory(config.category).map((c) => (
              <button
                key={c.exam_id}
                type="button"
                onClick={() => onExamChange(c.exam_id)}
                aria-pressed={c.exam_id === examId}
                className={cx(
                  'rounded-full border px-3 py-1.5 text-xs font-bold transition',
                  c.exam_id === examId ? 'border-white bg-white text-slate-900' : 'border-white/25 text-white/85 hover:border-white/60',
                )}
              >
                {c.short_title ?? c.exam_title}
              </button>
            ))}
          </div>
        )}
        <div className="mt-3 text-lg font-black">{config.exam_title}</div>
        {config.notice && <p className="mt-1 text-xs leading-relaxed text-slate-300">{config.notice}</p>}
        <p className="mt-2 flex items-center gap-1.5 text-xs text-amber-200">
          <Sparkles size={13} className="shrink-0" /> 국가고시 등 다른 시험도 계속 추가될 예정입니다.
        </p>
        <p className="mt-3 text-sm text-slate-300">과목을 선택하면 실제 시험 시간표 그대로 시계가 흐르고, EXP 모드로 문항별 풀이 시간을 기록합니다.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {config.subjects.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onSelect(s.id)}
            className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-400 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <span className={cx('flex h-10 w-10 items-center justify-center rounded-xl', ACCENT[s.accent ?? 'slate'])}>{iconFor(s.id)}</span>
              <ChevronRight size={18} className="text-slate-300 transition group-hover:text-blue-500" />
            </div>
            <div className="mt-3 text-[11px] font-semibold text-slate-500">{s.period}</div>
            <div className="text-lg font-black text-slate-900">{subjectLabel(s)}</div>
            <div className="mt-2 space-y-1 text-xs text-slate-600">
              {s.sub_modes ? (
                s.sub_modes.map((m) => (
                  <div key={m.id} className="flex items-center gap-1 tabular-nums">
                    <Clock size={12} className="shrink-0 text-slate-400" />
                    {m.id === 'sub1' ? '제1' : m.id === 'sub2' ? '제2' : m.id} {m.start_time} ~ {m.end_time}
                  </div>
                ))
              ) : (
                <div className="flex items-center gap-1 tabular-nums">
                  <Clock size={12} className="shrink-0 text-slate-400" />
                  {s.start_time} ~ {s.end_time}
                </div>
              )}
              <div className="flex items-center gap-1">
                <ListOrdered size={12} className="shrink-0 text-slate-400" />
                {s.duration_min}분 · {s.total_questions}문항
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <button type="button" onClick={() => setShowSchedule((v) => !v)} className="flex w-full items-center justify-between px-4 py-3 text-sm font-bold text-slate-800">
          전체 시간표 보기
          <ChevronDown size={18} className={cx('transition', showSchedule && 'rotate-180')} />
        </button>
        {showSchedule && (
          <div className="overflow-x-auto px-4 pb-4">
            <table className="w-full min-w-[480px] text-left text-xs">
              <thead className="text-slate-500">
                <tr className="border-b">
                  <th className="py-2">구분</th>
                  <th>영역</th>
                  <th>시간</th>
                  <th>시간(분)</th>
                  <th>문항</th>
                  <th>입실</th>
                </tr>
              </thead>
              <tbody>
                {config.schedule_summary.map((r, i) => (
                  <tr key={i} className={cx('border-b last:border-0', r.type !== 'exam' && 'text-slate-400')}>
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
      </div>
    </div>
  );
}
