import { ArrowDown, ArrowUp, Plus, RotateCcw, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { parseKeywords, PRESET_GROUPS, type RecordGroup } from '../lib/recordGroups';
import { uid } from '../lib/time';

/** 응시 기록 묶음 편집: 이름 + 키워드(모의고사 이름에 포함되면 해당 묶음) */
export function GroupEditor({ groups, onSave, onClose }: { groups: RecordGroup[]; onSave: (g: RecordGroup[]) => void; onClose: () => void }) {
  const [draft, setDraft] = useState(() => groups.map((g) => ({ ...g, text: g.keywords.join(', ') })));

  const update = (i: number, patch: Partial<(typeof draft)[number]>) => setDraft((d) => d.map((g, k) => (k === i ? { ...g, ...patch } : g)));
  const move = (i: number, dir: -1 | 1) =>
    setDraft((d) => {
      const j = i + dir;
      if (j < 0 || j >= d.length) return d;
      const next = d.slice();
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const save = () => {
    onSave(
      draft
        .map((g) => ({ id: g.id, name: g.name.trim(), keywords: parseKeywords(g.text) }))
        .filter((g) => g.name && g.keywords.length > 0),
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4" onClick={onClose}>
      <div role="dialog" aria-modal aria-labelledby="group-editor-title" className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 shadow-xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-1 flex items-center justify-between">
          <h2 id="group-editor-title" className="text-lg font-black text-slate-900">
            묶음 직접 설계
          </h2>
          <button type="button" onClick={onClose} className="rounded-full p-1 text-slate-400 hover:bg-slate-100" aria-label="닫기">
            <X size={20} />
          </button>
        </div>
        <p className="mb-3 text-xs text-slate-500">
          모의고사 이름에 키워드가 들어 있으면 그 묶음으로 분류됩니다. 여러 묶음에 해당하면 위에 있는 묶음이 우선입니다. 키워드는 쉼표로 구분하세요.
        </p>
        <ul className="space-y-2">
          {draft.map((g, i) => (
            <li key={g.id} className="rounded-xl border border-slate-200 p-3">
              <div className="flex items-center gap-2">
                <input
                  id={`group-name-${g.id}`}
                  value={g.name}
                  onChange={(e) => update(i, { name: e.target.value })}
                  placeholder="묶음 이름 (예: 더프리미엄 시리즈)"
                  className="h-9 min-w-0 flex-1 rounded-lg border border-slate-300 px-2 text-sm font-bold outline-none focus:border-blue-500"
                />
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30" aria-label="위로">
                  <ArrowUp size={15} />
                </button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === draft.length - 1} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30" aria-label="아래로">
                  <ArrowDown size={15} />
                </button>
                <button type="button" onClick={() => setDraft((d) => d.filter((_, k) => k !== i))} className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label="묶음 삭제">
                  <Trash2 size={15} />
                </button>
              </div>
              <input
                id={`group-kw-${g.id}`}
                value={g.text}
                onChange={(e) => update(i, { text: e.target.value })}
                placeholder="키워드 (예: 더프리미엄, 더프)"
                className="mt-2 h-9 w-full rounded-lg border border-slate-300 px-2 text-sm outline-none focus:border-blue-500"
              />
            </li>
          ))}
        </ul>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setDraft((d) => [...d, { id: uid('g'), name: '', keywords: [], text: '' }])}
            className="flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            <Plus size={14} /> 묶음 추가
          </button>
          <button
            type="button"
            onClick={() => setDraft(PRESET_GROUPS.map((g) => ({ ...g, text: g.keywords.join(', ') })))}
            className="flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-50"
          >
            <RotateCcw size={14} /> 기본 묶음으로
          </button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button type="button" onClick={onClose} className="h-11 rounded-xl border border-slate-300 text-sm font-bold text-slate-700">
            취소
          </button>
          <button type="button" onClick={save} className="h-11 rounded-xl bg-slate-900 text-sm font-bold text-white">
            저장
          </button>
        </div>
      </div>
    </div>
  );
}
