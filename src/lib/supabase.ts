import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * BE 환경이 아직 준비되지 않았거나 .env가 비어 있으면 mock 모드로 동작한다.
 * VITE_USE_MOCK=true 로 강제 전환도 가능하다. (08.04 Meeting 2에서 실 연동으로 전환)
 */
export const USE_MOCK =
  import.meta.env.VITE_USE_MOCK === 'true' || !url || !anonKey

export const supabase = USE_MOCK
  ? null
  : createClient(url as string, anonKey as string, {
      auth: { persistSession: true, autoRefreshToken: true },
    })

/** mock 모드가 아닐 때만 클라이언트를 꺼낸다. null 체크를 매번 하지 않기 위한 헬퍼. */
export function requireSupabase() {
  if (!supabase) {
    throw new Error(
      'Supabase 클라이언트가 없습니다. .env의 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY를 확인하세요.',
    )
  }
  return supabase
}
