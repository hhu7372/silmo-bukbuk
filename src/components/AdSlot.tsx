import { useEffect, useRef } from 'react';
import { ADS } from '../config/site';
import { cx } from './ui';

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

/** AdSense 광고 단위. 게시자 ID와 슬롯 ID가 설정되지 않았으면 자리표시자를 보여줌 */
export function AdSlot({ label, slot, className, size }: { label: string; slot: string; className?: string; size?: [number, number] }) {
  const pushed = useRef(false);
  const live = Boolean(ADS.client && slot);
  useEffect(() => {
    if (!live || pushed.current) return;
    pushed.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      /* 광고 차단기 등 */
    }
  }, [live]);

  if (live) {
    return (
      <div className={cx('overflow-hidden', className)}>
        {size ? (
          <ins className="adsbygoogle mx-auto" style={{ display: 'block', width: size[0], height: size[1] }} data-ad-client={ADS.client} data-ad-slot={slot} />
        ) : (
          <ins
            className="adsbygoogle"
            style={{ display: 'block', width: '100%', height: '100%' }}
            data-ad-client={ADS.client}
            data-ad-slot={slot}
            data-ad-format="auto"
            data-full-width-responsive="true"
          />
        )}
      </div>
    );
  }
  return (
    <div
      className={cx(
        'flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 text-center text-slate-400',
        className,
      )}
      data-ad-slot={label}
    >
      <span className="text-[10px] font-bold uppercase tracking-widest">Advertisement</span>
      <span className="mt-1 text-xs font-semibold">{label}</span>
    </div>
  );
}

