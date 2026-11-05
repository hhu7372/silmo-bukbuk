import { useEffect, useRef, useState } from 'react';

type WakeLockSentinelLike = { released: boolean; release: () => Promise<void>; addEventListener: (t: 'release', cb: () => void) => void };

/** 시험 중 화면 꺼짐 방지 (Screen Wake Lock API). 탭 복귀 시 자동 재요청. */
export function useWakeLock(enabled: boolean): { supported: boolean; active: boolean } {
  const sentinelRef = useRef<WakeLockSentinelLike | null>(null);
  const [active, setActive] = useState(false);
  const supported = typeof navigator !== 'undefined' && 'wakeLock' in navigator;

  useEffect(() => {
    if (!enabled || !supported) return;
    let cancelled = false;
    const nav = navigator as Navigator & { wakeLock: { request: (t: 'screen') => Promise<WakeLockSentinelLike> } };

    const request = async () => {
      try {
        if (sentinelRef.current && !sentinelRef.current.released) return;
        const s = await nav.wakeLock.request('screen');
        if (cancelled) {
          await s.release();
          return;
        }
        sentinelRef.current = s;
        setActive(true);
        s.addEventListener('release', () => setActive(false));
      } catch {
        setActive(false);
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') void request();
    };

    void request();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      const s = sentinelRef.current;
      sentinelRef.current = null;
      if (s && !s.released) void s.release();
      setActive(false);
    };
  }, [enabled, supported]);

  return { supported, active };
}
