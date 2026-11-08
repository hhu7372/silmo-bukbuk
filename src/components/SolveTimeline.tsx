import { History } from 'lucide-react';
import type { Lap } from '../lib/lapTracker';
import { OUTCOME_LABEL } from '../lib/stats';
import { msToKorean } from '../lib/time';
import { Card, SectionTitle, cx } from './ui';

const COLOR: Record<Lap['outcome'], string> = {
  completed: 'bg-emerald-500',
  skipped: 'bg-orange-400',
  switched: 'bg-orange-300',
  exam_end: 'bg-slate-400',
};

/** 어떤 순서로 문제를 풀었는지: 시간축 막대 + 순서 목록 */
export function SolveTimeline({ laps, totalMs, wrong }: { laps: Lap[]; totalMs: number; wrong: Set<number> }) {
  const sorted = [...laps].sort((a, b) => a.lapNo - b.lapNo);
  const span = Math.max(totalMs, sorted[sorted.length - 1]?.endMs ?? 0, 1);
  const tickMin = span > 90 * 60_000 ? 20 : 10;
  const ticks: number[] = [];
  for (let m = 0; m * 60_000 <= span; m += tickMin) ticks.push(m);
  const seen = new Set<number>();

  return (
    <Card>
      <SectionTitle icon={<History size={18} />}>풀이 순서 타임라인</SectionTitle>
      <p className="mb-3 text-xs text-slate-500">시험 시작부터 어떤 순서로 문항을 풀었는지 보여줍니다. 막대 위 숫자는 문항 번호입니다.</p>

      <div className="overflow-x-auto">
        <div className="min-w-[560px]">
          <div className="relative h-11 overflow-hidden rounded-lg bg-slate-100">
            {sorted.map((l) => {
              const left = (l.startMs / span) * 100;
              const width = Math.max((l.durationMs / span) * 100, 0.25);
              return (
                <div
                  key={l.lapNo}
                  title={`Lap #${l.lapNo} · ${l.questionNo}번 · ${msToKorean(l.durationMs)} · ${OUTCOME_LABEL[l.outcome]}`}
                  className={cx('absolute top-0 flex h-full items-center justify-center border-r border-white text-[10px] font-bold text-white', COLOR[l.outcome])}
                  style={{ left: `${left}%`, width: `${width}%` }}
                >
                  {width > 2.2 && <span className={cx(wrong.has(l.questionNo) && 'rounded bg-red-600 px-0.5')}>{l.questionNo}</span>}
                </div>
              );
            })}
          </div>
          <div className="relative mt-1 h-4 text-[10px] tabular-nums text-slate-400">
            {ticks.map((m) => (
              <span key={m} className={cx('absolute', m === 0 ? '' : '-translate-x-1/2')} style={{ left: `${((m * 60_000) / span) * 100}%` }}>
                {m}분
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-1 gap-y-1.5 text-xs">
        {sorted.map((l, i) => {
          const retry = seen.has(l.questionNo);
          seen.add(l.questionNo);
          return (
            <span key={l.lapNo} className="flex items-center gap-1">
              {i > 0 && <span className="text-slate-300">→</span>}
              <span
                title={`${msToKorean(l.durationMs)} · ${OUTCOME_LABEL[l.outcome]}`}
                className={cx(
                  'rounded-md px-1.5 py-0.5 font-bold tabular-nums',
                  l.outcome === 'completed' ? 'bg-emerald-50 text-emerald-700' : l.outcome === 'exam_end' ? 'bg-slate-100 text-slate-600' : 'bg-orange-50 text-orange-700',
                  wrong.has(l.questionNo) && 'ring-1 ring-red-400',
                )}
              >
                {retry && '↺'}
                {l.questionNo}
              </span>
            </span>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-slate-500">
        <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-500" /> 풀이 완료</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-orange-400" /> 보류·이동</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-slate-400" /> 시험 종료</span>
        <span>↺ 다시 돌아와 푼 문항 · 빨간 테두리 = 오답</span>
      </div>
    </Card>
  );
}
