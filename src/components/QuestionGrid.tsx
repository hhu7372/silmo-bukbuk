import type { QuestionStatus } from '../lib/lapTracker';
import { cx } from './ui';

const STATUS_CLS: Record<QuestionStatus, string> = {
  untried: 'bg-slate-200 text-slate-600 hover:bg-slate-300',
  active: 'bg-blue-600 text-white ring-2 ring-blue-300 ring-offset-1',
  skipped: 'bg-orange-500 text-white hover:bg-orange-600',
  completed: 'bg-emerald-500 text-white hover:bg-emerald-600',
};

export const STATUS_LABEL: Record<QuestionStatus, string> = {
  untried: '미시도',
  active: '풀이중',
  skipped: '보류중',
  completed: '완료',
};

export function StatusLegend() {
  return (
    <div className="flex flex-wrap gap-3 text-xs text-slate-600">
      {(Object.keys(STATUS_LABEL) as QuestionStatus[]).map((s) => (
        <span key={s} className="flex items-center gap-1">
          <span className={cx('inline-block h-3 w-3 rounded', STATUS_CLS[s].split(' ')[0])} />
          {STATUS_LABEL[s]}
        </span>
      ))}
    </div>
  );
}

export function QuestionGrid({
  total,
  statusOf,
  onSelect,
  disabled,
}: {
  total: number;
  statusOf: (q: number) => QuestionStatus;
  onSelect: (q: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-9 gap-1 sm:grid-cols-10 sm:gap-1.5">
      {Array.from({ length: total }, (_, i) => i + 1).map((q) => {
        const st = statusOf(q);
        return (
          <button
            key={q}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(q)}
            className={cx('h-8 rounded-md text-xs sm:h-9 md:h-11 md:text-sm [@media(min-width:1024px)_and_(max-height:760px)]:h-9 font-bold tabular-nums transition disabled:cursor-not-allowed disabled:opacity-50', STATUS_CLS[st])}
            aria-label={`${q}번 문항 (${STATUS_LABEL[st]})`}
          >
            {q}
          </button>
        );
      })}
    </div>
  );
}

/** 결과 화면 OMR: 틀린 문항 체크 */
export function OmrGrid({ total, wrong, onToggle }: { total: number; wrong: Set<number>; onToggle: (q: number) => void }) {
  return (
    <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-10">
      {Array.from({ length: total }, (_, i) => i + 1).map((q) => {
        const isWrong = wrong.has(q);
        return (
          <button
            key={q}
            type="button"
            onClick={() => onToggle(q)}
            className={cx(
              'relative flex h-10 items-center justify-center rounded-lg border-2 text-sm font-bold tabular-nums transition',
              isWrong ? 'border-red-500 bg-red-50 text-red-600' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400',
            )}
            aria-pressed={isWrong}
          >
            {q}
            {isWrong && (
              <svg viewBox="0 0 40 40" className="pointer-events-none absolute inset-0 h-full w-full">
                <path d="M8 22 L17 31 L33 9" fill="none" stroke="#ef4444" strokeWidth="3.5" strokeLinecap="round" opacity="0.85" />
              </svg>
            )}
          </button>
        );
      })}
    </div>
  );
}
