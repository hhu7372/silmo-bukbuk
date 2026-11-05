import { useEffect, useState } from 'react';

/** window.confirm 대체 (WebView/iframe 등 네이티브 대화상자가 막힌 환경 대응) */
type Req = { message: string; confirmLabel: string; danger: boolean; resolve: (v: boolean) => void };
let push: ((r: Req) => void) | null = null;

export function confirmAsync(message: string, opts: { confirmLabel?: string; danger?: boolean } = {}): Promise<boolean> {
  return new Promise((resolve) => {
    if (!push) {
      resolve(false);
      return;
    }
    push({ message, confirmLabel: opts.confirmLabel ?? '확인', danger: opts.danger ?? false, resolve });
  });
}

export function ConfirmHost() {
  const [req, setReq] = useState<Req | null>(null);
  useEffect(() => {
    push = setReq;
    return () => {
      push = null;
    };
  }, []);
  if (!req) return null;
  const close = (v: boolean) => {
    req.resolve(v);
    setReq(null);
  };
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={() => close(false)}>
      <div role="alertdialog" aria-modal className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <p className="text-sm font-semibold text-slate-800">{req.message}</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => close(false)} className="h-11 rounded-xl border border-slate-300 text-sm font-bold text-slate-700">
            취소
          </button>
          <button
            type="button"
            autoFocus
            onClick={() => close(true)}
            className={`h-11 rounded-xl text-sm font-bold text-white ${req.danger ? 'bg-red-600' : 'bg-slate-900'}`}
          >
            {req.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
