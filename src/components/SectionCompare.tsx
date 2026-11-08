import { Gauge } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import type { ExamSection } from '../data/examConfigData';
import { compareSections, MIN_COMPARE_RECORDS, type SectionCompareRow } from '../lib/sectionTimes';
import { msToKorean } from '../lib/time';
import type { ExamResult } from '../types';
import { Card, SectionTitle, cx } from './ui';

/** 파트별(예: 독서·문학·화작/언매) 평균 풀이 시간 vs 이번 회차 */
export function SectionCompare({ result, sections }: { result: ExamResult; sections: ExamSection[] }) {
  const { repository } = useApp();
  const [data, setData] = useState<{ rows: SectionCompareRow[]; samples: number } | null>(null);

  useEffect(() => {
    let alive = true;
    void repository.list().then((all) => alive && setData(compareSections(result, all, sections)));
    return () => {
      alive = false;
    };
  }, [repository, result, sections]);

  if (!data) return null;
  const ready = data.samples >= MIN_COMPARE_RECORDS;
  const max = Math.max(1, ...data.rows.flatMap((r) => [r.currentMs, r.averageMs]));

  return (
    <Card>
      <SectionTitle icon={<Gauge size={18} />}>파트별 시간: 평균 vs 이번 회차</SectionTitle>
      {!ready ? (
        <div className="rounded-xl bg-slate-50 p-4 text-center text-sm text-slate-600">
          같은 과목{result.electiveName ? `(${result.electiveName})` : ''}을 EXP 모드로 <b>{MIN_COMPARE_RECORDS}회</b> 이상 저장하면 파트별 평균과 비교할 수 있어요.
          <div className="mx-auto mt-3 h-2 max-w-xs overflow-hidden rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-blue-500" style={{ width: `${(data.samples / MIN_COMPARE_RECORDS) * 100}%` }} />
          </div>
          <div className="mt-1 text-xs text-slate-500">
            이전 기록 {data.samples}/{MIN_COMPARE_RECORDS}회
          </div>
        </div>
      ) : (
        <>
          <p className="mb-3 text-xs text-slate-500">이전 {data.samples}회 평균과 비교했습니다. "화작 ○분컷"처럼 파트별 목표 시간을 세울 때 참고하세요.</p>
          <ul className="space-y-3">
            {data.rows.map((r) => {
              const faster = r.diffMs < 0;
              const same = Math.abs(r.diffMs) < 5_000;
              return (
                <li key={r.id}>
                  <div className="flex flex-wrap items-baseline justify-between gap-x-2 text-sm">
                    <span className="font-bold text-slate-800">{r.name}</span>
                    <span className="tabular-nums">
                      <b>{msToKorean(r.currentMs)}</b>
                      <span className="text-slate-400"> / 평균 {msToKorean(r.averageMs)}</span>
                      <span className={cx('ml-2 rounded px-1.5 py-0.5 text-xs font-bold', same ? 'bg-slate-100 text-slate-600' : faster ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600')}>
                        {same ? '평균과 비슷' : `${faster ? '−' : '+'}${msToKorean(Math.abs(r.diffMs))}`}
                      </span>
                    </span>
                  </div>
                  <div className="mt-1 space-y-1">
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-slate-400" style={{ width: `${(r.averageMs / max) * 100}%` }} />
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className={cx('h-full rounded-full', faster ? 'bg-emerald-500' : 'bg-blue-600')} style={{ width: `${(r.currentMs / max) * 100}%` }} />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="mt-3 flex gap-3 text-[11px] text-slate-500">
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-4 rounded-full bg-slate-400" /> 평균</span>
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-4 rounded-full bg-blue-600" /> 이번 회차</span>
          </div>
        </>
      )}
    </Card>
  );
}
