import type { ExamResult } from '../types';

/**
 * 결과 저장소 추상화 (Repository 패턴)
 * ------------------------------------------------------------
 * UI는 이 인터페이스에만 의존합니다. Supabase/Firebase 연동 시
 * 같은 인터페이스를 구현하는 클래스를 추가하고 createResultRepository()에서 분기하면 됩니다.
 *
 *   class SupabaseResultRepository implements ExamResultRepository {
 *     list = async () => (await supabase.from('exam_results').select('*')).data ?? [];
 *     ...
 *   }
 */
export interface ExamResultRepository {
  readonly kind: 'local' | 'remote';
  list(): Promise<ExamResult[]>;
  get(id: string): Promise<ExamResult | null>;
  save(result: ExamResult): Promise<ExamResult>;
  remove(id: string): Promise<void>;
  clear(): Promise<void>;
}

const RESULTS_KEY = 'csat-timer:results:v1';

export class LocalStorageResultRepository implements ExamResultRepository {
  readonly kind = 'local' as const;

  constructor(private readonly storageKey: string = RESULTS_KEY) {}

  private readAll(): ExamResult[] {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed) ? (parsed as ExamResult[]) : [];
    } catch {
      return [];
    }
  }

  private writeAll(items: ExamResult[]): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(items));
    } catch (e) {
      throw new Error(`브라우저 저장소에 기록하지 못했습니다: ${(e as Error).message}`);
    }
  }

  async list(): Promise<ExamResult[]> {
    return this.readAll().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async get(id: string): Promise<ExamResult | null> {
    return this.readAll().find((r) => r.id === id) ?? null;
  }

  async save(result: ExamResult): Promise<ExamResult> {
    const items = this.readAll();
    const saved: ExamResult = { ...result, savedAt: new Date().toISOString() };
    const idx = items.findIndex((r) => r.id === result.id);
    if (idx >= 0) items[idx] = saved;
    else items.push(saved);
    this.writeAll(items);
    return saved;
  }

  async remove(id: string): Promise<void> {
    this.writeAll(this.readAll().filter((r) => r.id !== id));
  }

  async clear(): Promise<void> {
    this.writeAll([]);
  }
}

/** 비회원: 이 기기 기록 중 주인 없는 것(비회원 때 저장)과 예시 데이터만 */
export class GuestResultRepository extends LocalStorageResultRepository {
  async list(): Promise<ExamResult[]> {
    return (await super.list()).filter((r) => r.sample || !r.ownerId);
  }
}

/** 간단한 key-value 설정 저장 */
export function loadPref<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(`csat-timer:${key}`);
    return raw ? ({ ...fallback, ...(JSON.parse(raw) as object) } as T) : fallback;
  } catch {
    return fallback;
  }
}

export function loadPrimitive<T extends string | boolean | number>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(`csat-timer:${key}`);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function savePref(key: string, value: unknown): void {
  try {
    localStorage.setItem(`csat-timer:${key}`, JSON.stringify(value));
  } catch {
    /* 저장 불가 환경 무시 */
  }
}
