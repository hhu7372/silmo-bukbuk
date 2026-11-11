import type { SupabaseClient } from '@supabase/supabase-js';
import type { ExamResult } from '../types';
import { LocalStorageResultRepository, type ExamResultRepository } from './resultRepository';

/**
 * 로그인 회원용 저장소: 서버(Supabase) + 이 기기 사본
 * - 저장: 기기에 먼저 저장하고 서버에 올림 (서버 실패 시 다음 로그인 때 다시 올림)
 * - 목록: 서버 기록 + 아직 못 올린 기기 기록 + 예시 데이터
 * - 예시 데이터(sample)는 서버에 올리지 않음
 */
export class SyncedResultRepository implements ExamResultRepository {
  readonly kind = 'remote' as const;
  private local = new LocalStorageResultRepository();

  constructor(
    private readonly client: SupabaseClient,
    private readonly userId: string,
  ) {}

  /** 이 사용자에게 보여줄 기기 기록: 내 것 + 주인 없는(비회원 때) 기록 + 예시 */
  private async localMine(): Promise<ExamResult[]> {
    return (await this.local.list()).filter((r) => r.sample || !r.ownerId || r.ownerId === this.userId);
  }

  async list(): Promise<ExamResult[]> {
    const local = await this.localMine();
    try {
      const { data, error } = await this.client.from('exam_results').select('data').order('created_at', { ascending: false });
      if (error) throw error;
      const remote = (data ?? []).map((row) => row.data as ExamResult);
      const ids = new Set(remote.map((r) => r.id));
      return [...remote, ...local.filter((r) => !ids.has(r.id))].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } catch {
      return local;
    }
  }

  async get(id: string): Promise<ExamResult | null> {
    return (await this.list()).find((r) => r.id === id) ?? null;
  }

  async save(result: ExamResult): Promise<ExamResult> {
    const saved = await this.local.save(result.sample ? result : { ...result, ownerId: this.userId });
    if (!saved.sample) await this.upload([saved]).catch(() => undefined);
    return saved;
  }

  async remove(id: string): Promise<void> {
    await this.local.remove(id);
    await this.client.from('exam_results').delete().eq('id', id);
  }

  async clear(): Promise<void> {
    for (const r of await this.localMine()) await this.local.remove(r.id);
    await this.client.from('exam_results').delete().eq('user_id', this.userId);
  }

  private async upload(results: ExamResult[]): Promise<void> {
    for (let i = 0; i < results.length; i += 50) {
      const rows = results.slice(i, i + 50).map((r) => ({
        user_id: this.userId,
        id: r.id,
        data: { ...r, ownerId: this.userId },
        created_at: r.createdAt,
        updated_at: new Date().toISOString(),
      }));
      const { error } = await this.client.from('exam_results').upsert(rows, { onConflict: 'user_id,id' });
      if (error) throw error;
    }
  }

  /**
   * 로그인 직후: 이 기기의 비회원 기록과 못 올린 내 기록을 서버로 올리고 내 것으로 표시
   * 반환: 올린 개수
   */
  async syncLocal(): Promise<number> {
    const pending = (await this.local.list()).filter((r) => !r.sample && (!r.ownerId || r.ownerId === this.userId));
    if (!pending.length) return 0;
    await this.upload(pending);
    for (const r of pending) if (r.ownerId !== this.userId) await this.local.save({ ...r, ownerId: this.userId });
    return pending.length;
  }

  /** 로그아웃: 공용 기기에서 다른 사람이 보지 않도록, 서버에 있는 내 기록의 기기 사본을 지움 */
  async forgetLocal(): Promise<void> {
    for (const r of await this.local.list()) if (r.ownerId === this.userId) await this.local.remove(r.id);
  }
}
