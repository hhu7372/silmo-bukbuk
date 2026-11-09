import { ArrowDown, ArrowUp, ListOrdered } from 'lucide-react';
import type { ExamSection } from '../data/examConfigData';
import { orderLabel, parseRanges, sectionsOrder, type OrderMode } from '../lib/questionOrder';
import { cx } from './ui';

/**
 * EXP 모드 풀이 순서
 * - 번호순 / 파트 순서(▲▼로 바꾸기) / 직접 입력(35-45, 18-34, 1-17)
 */
export function QuestionOrderPicker({
  sections,
  total,
  mode,
  sectionIds,
  customText,
  onChange,
}: {
  sections: ExamSection[];
  total: number;
  mode: OrderMode;
  sectionIds: string[];
  customText: string;
  onChange: (patch: { mode?: OrderMode; sectionIds?: string[]; customText?: string }) => void;
}) {
  const ids = [...sectionIds.filter((id) => sections.some((s) => s.id === id)), ...sections.filter((s) => !sectionIds.includes(s.id)).map((s) => s.id)];
  const ordered = ids.map((id) => sections.find((s) => s.id === id)!);
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= ids.length) return;
    const next = ids.slice();
    [next[i], next[j]] = [next[j], next[i]];
    onChange({ sectionIds: next });
  };
  const parsed = mode === 'custom' ? parseRanges(customText, total) : null;
  const preview =
    mode === 'sections' ? orderLabel(sectionsOrder(sections, ids, total)) : mode === 'custom' && parsed && !parsed.error && parsed.list.length ? orderLabel(parsed.list) : null;
  const missing = mode === 'custom' && parsed && !parsed.error ? total - parsed.list.length : 0;

  return (
    <div className="mt-4 rounded-2xl bg-slate-50 p-3">
      <div className="mb-2 flex items-center gap-1.5 text-sm font-bold text-slate-800">
        <ListOrdered size={16} /> 풀이 순서
      </div>
      <div className="grid grid-cols-3 gap-1 rounded-full bg-slate-200 p-1">
        {(
          [
            ['number', '번호순'],
            ['sections', '파트 순서'],
            ['custom', '직접 입력'],
          ] as Array<[OrderMode, string]>
        ).map(([m, label]) => (
          <button
            key={m}
            type="button"
            onClick={() => onChange({ mode: m })}
            aria-pressed={mode === m}
            className={cx('h-9 rounded-full text-xs font-bold sm:text-sm', mode === m ? 'bg-white text-slate-900 shadow' : 'text-slate-600')}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === 'number' && <p className="mt-2 text-xs text-slate-500">1번부터 차례대로 풉니다.</p>}

      {mode === 'sections' && (
        <ol className="mt-3 space-y-1.5">
          {ordered.map((s, i) => (
            <li key={s.id} className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-black text-white">{i + 1}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-slate-800">{s.name}</span>
                <span className="text-xs tabular-nums text-slate-500">
                  {s.q_start}~{Math.min(s.q_end, total)}번
                </span>
              </span>
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30" aria-label={`${s.name} 앞으로`}>
                <ArrowUp size={16} />
              </button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === ordered.length - 1} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30" aria-label={`${s.name} 뒤로`}>
                <ArrowDown size={16} />
              </button>
            </li>
          ))}
        </ol>
      )}

      {mode === 'custom' && (
        <div className="mt-3">
          <label htmlFor="custom-order" className="text-xs font-semibold text-slate-600">
            문항 범위를 푸는 순서대로 적어주세요
          </label>
          <input
            id="custom-order"
            value={customText}
            onChange={(e) => onChange({ customText: e.target.value })}
            placeholder="예: 35-45, 18-34, 1-17"
            inputMode="text"
            autoComplete="off"
            className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 font-mono text-sm outline-none focus:border-blue-500"
          />
          {parsed?.error && customText.trim() && <p className="mt-1 text-xs font-semibold text-red-600">{parsed.error}</p>}
          {missing > 0 && <p className="mt-1 text-xs text-slate-500">적지 않은 {missing}문항은 마지막에 번호순으로 이어집니다.</p>}
        </div>
      )}

      {preview && (
        <p className="mt-2 text-xs text-slate-600">
          순서: <b className="tabular-nums text-blue-700">{preview}</b>
        </p>
      )}
      {mode !== 'number' && <p className="mt-1 text-[11px] text-slate-500">풀이 완료·보류를 누르면 이 순서대로 다음 문항으로 넘어갑니다. 번호판을 눌러 언제든 다른 문항으로 갈 수 있어요.</p>}
    </div>
  );
}
