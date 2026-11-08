/**
 * 듣기 음원
 * - 사용자가 올린 듣기 파일(모의고사 듣기 mp3 등)을 과목별로 기기(IndexedDB)에 저장
 * - 시작 지점(초)을 정해 두면, 시험 본령에 맞춰 그 지점부터 재생
 * 파일은 서버로 보내지 않습니다.
 */
export interface StoredListening {
  subjectId: string;
  name: string;
  size: number;
  blob: Blob;
  startSec: number;
  savedAt: string;
}

const DB = 'silmo-listening';
const STORE = 'files';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('이 브라우저는 파일 저장을 지원하지 않습니다.'));
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'subjectId' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('저장소를 열 수 없습니다.'));
  });
}

async function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('저장소 작업 실패'));
    tx.oncomplete = () => db.close();
  });
}

export async function getListening(subjectId: string): Promise<StoredListening | null> {
  try {
    return ((await run('readonly', (s) => s.get(subjectId))) as StoredListening | undefined) ?? null;
  } catch {
    return null;
  }
}

export async function saveListening(item: StoredListening): Promise<void> {
  await run('readwrite', (s) => s.put(item));
}

export async function deleteListening(subjectId: string): Promise<void> {
  await run('readwrite', (s) => s.delete(subjectId));
}

type Listener = (state: { playing: boolean; currentSec: number; durationSec: number; active: boolean }) => void;

/** 시험 중 듣기 재생기 (앱 전체에서 하나) */
class ListeningPlayer {
  private audio: HTMLAudioElement | null = null;
  private url = '';
  private startSec = 0;
  private listeners = new Set<Listener>();
  private timer: number | undefined;
  active = false;

  /**
   * 시험 시작 버튼을 누른 순간(사용자 동작 안)에 호출해서 자동 재생 제한을 풀어 둔다.
   * 실제 재생은 start() 에서.
   */
  prime(blob: Blob, startSec: number): void {
    this.stop();
    this.url = URL.createObjectURL(blob);
    const a = new Audio(this.url);
    a.preload = 'auto';
    this.audio = a;
    this.startSec = Math.max(0, startSec);
    a.muted = true;
    a.play()
      .then(() => {
        a.pause();
        a.muted = false;
        a.currentTime = this.startSec;
      })
      .catch(() => {
        a.muted = false;
      });
    a.addEventListener('timeupdate', () => this.emit());
    a.addEventListener('play', () => this.emit());
    a.addEventListener('pause', () => this.emit());
    a.addEventListener('ended', () => {
      this.active = false;
      this.emit();
    });
    this.active = false;
  }

  hasTrack(): boolean {
    return !!this.audio;
  }

  /** 본령에 맞춰 시작 지점부터 재생 (delayMs 뒤) */
  start(delayMs = 0): void {
    const a = this.audio;
    if (!a) return;
    window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => {
      try {
        a.currentTime = this.startSec;
      } catch {
        /* 메타데이터 전 */
      }
      this.active = true;
      void a.play().catch(() => {
        this.active = false;
        this.emit();
      });
      this.emit();
    }, delayMs);
  }

  toggle(): void {
    const a = this.audio;
    if (!a) return;
    if (a.paused) {
      this.active = true;
      void a.play().catch(() => undefined);
    } else a.pause();
  }

  stop(): void {
    window.clearTimeout(this.timer);
    if (this.audio) {
      this.audio.pause();
      this.audio.src = '';
    }
    if (this.url) URL.revokeObjectURL(this.url);
    this.audio = null;
    this.url = '';
    this.active = false;
    this.emit();
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit(): void {
    const a = this.audio;
    const s = { playing: !!a && !a.paused, currentSec: a?.currentTime ?? 0, durationSec: a && Number.isFinite(a.duration) ? a.duration : 0, active: this.active };
    this.listeners.forEach((l) => l(s));
  }
}

export const listeningPlayer = new ListeningPlayer();
