import { supabase } from './supabase'
import { DOLL_EMOJI } from '@/mocks/dolls'

/** docs/SCHEMA.md §6 — 인형 이미지가 올라가는 Storage 버킷 */
const BUCKET = 'assets'

/**
 * image_path를 실제 표시 가능한 URL로 바꾼다.
 * mock 모드이거나 Storage에 에셋이 아직 없으면 null → 호출부가 이모지로 대체한다.
 */
export function dollImageUrl(imagePath: string): string | null {
  if (!supabase) return null
  return supabase.storage.from(BUCKET).getPublicUrl(imagePath).data.publicUrl
}

/** 이미지가 없을 때 쓰는 이모지 대체 표시 (C-3) */
export function dollEmoji(imagePath: string): string {
  return DOLL_EMOJI[imagePath] ?? '🧸'
}
