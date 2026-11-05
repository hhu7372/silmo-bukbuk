/** "08:40" → 520 (자정 기준 분) */
export function parseHM(hm: string): number {
  const [h, m] = hm.split(':').map((v) => parseInt(v, 10));
  return (h || 0) * 60 + (m || 0);
}

/** 520 → "08:40" */
export function minToHM(min: number): string {
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

/** 자정 기준 초 → "HH:MM:SS" */
export function secondsToClock(totalSec: number): string {
  const s = ((Math.floor(totalSec) % 86400) + 86400) % 86400;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

/** ms → "MM:SS" (60분 이상이면 "HH:MM:SS" 대신 분을 그대로 누적, 예: "80:00") */
export function msToMMSS(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000 - 1e-6));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** ms → "1분 10초" / "50초" */
export function msToKorean(ms: number): string {
  const total = Math.round(ms / 1000);
  if (total < 60) return `${total}초`;
  const m = Math.floor(total / 60);
  const s = total % 60;
  return s === 0 ? `${m}분` : `${m}분 ${s}초`;
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(
    d.getHours(),
  ).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function uid(prefix = 'id'): string {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}_${rand}`;
}
