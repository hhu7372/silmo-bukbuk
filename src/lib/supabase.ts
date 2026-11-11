/**
 * Supabase 연결 (로그인·기록 동기화·이용권)
 * 주소와 공개 키(anon key)가 설정되지 않으면 null → 로그인 없이 지금처럼 동작
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();

export const supabase: SupabaseClient | null =
  url && anonKey
    ? createClient(url, anonKey, {
        auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      })
    : null;

export const authEnabled = supabase !== null;
