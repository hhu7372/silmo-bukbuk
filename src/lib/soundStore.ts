/**
 * 사용자 타종/안내 음원 저장소 (IndexedDB)
 * - 키: `${scope}:${event}`  scope = '*'(모든 과목 공통) 또는 과목 id
 * - 브라우저에만 저장되며 서버로 전송되지 않습니다.
 */
import type { ExamAudioEvent } from './audio';

export interface StoredSound {
  key: string;
  name: string;
  type: string;
  size: number;
  data: ArrayBuffer;
  savedAt: string;
}

const DB_NAME = 'csat-timer-sounds';
const STORE = 'sounds';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('이 브라우저는 음원 저장(IndexedDB)을 지원하지 않습니다.'));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, { keyPath: 'key' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('음원 저장소를 열 수 없습니다.'));
  });
}

async function tx<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const req = run(t.objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('음원 저장소 작업에 실패했습니다.'));
    t.oncomplete = () => db.close();
  });
}

export function soundKey(scope: string, event: ExamAudioEvent): string {
  return `${scope}:${event}`;
}

export async function saveSound(scope: string, event: ExamAudioEvent, file: File): Promise<StoredSound> {
  const item: StoredSound = {
    key: soundKey(scope, event),
    name: file.name,
    type: file.type || 'audio/mpeg',
    size: file.size,
    data: await file.arrayBuffer(),
    savedAt: new Date().toISOString(),
  };
  await tx('readwrite', (s) => s.put(item));
  return item;
}

export async function deleteSound(scope: string, event: ExamAudioEvent): Promise<void> {
  await tx('readwrite', (s) => s.delete(soundKey(scope, event)));
}

export async function listSounds(): Promise<StoredSound[]> {
  try {
    return await tx<StoredSound[]>('readonly', (s) => s.getAll() as IDBRequest<StoredSound[]>);
  } catch {
    return [];
  }
}

/** 과목 전용 음원이 있으면 그것을, 없으면 공통 음원을 고른다 */
export function pickSound(all: StoredSound[], subjectId: string, event: ExamAudioEvent): StoredSound | undefined {
  return all.find((x) => x.key === soundKey(subjectId, event)) ?? all.find((x) => x.key === soundKey('*', event));
}
