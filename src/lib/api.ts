import { requireSupabase, USE_MOCK } from './supabase'
import { mockApi } from '@/mocks/api'
import {
  ApiError,
  type ApiErrorCode,
  type CollectionEntry,
  type FinishGameResult,
  type GameMode,
  type Leaderboard,
  type Profile,
  type RankMode,
  type SellDollResult,
  type StartGameResult,
  type TransferResult,
} from '@/types/api'

/**
 * FE가 사용하는 유일한 서버 인터페이스.
 * mock ↔ 실제 Supabase 전환이 이 파일 안에서만 일어나므로 화면 코드는 바뀌지 않는다.
 */
export interface GameApi {
  signUp(email: string, password: string, nickname: string): Promise<void>
  signIn(email: string, password: string): Promise<void>
  signOut(): Promise<void>
  getProfile(): Promise<Profile | null>

  startGame(mode: GameMode): Promise<StartGameResult>
  finishGame(sessionId: string, caught: number): Promise<FinishGameResult>
  getCollection(): Promise<CollectionEntry[]>
  sellDoll(dollId: number, count: number): Promise<SellDollResult>
  transferGold(toNickname: string, amount: number): Promise<TransferResult>
  getLeaderboard(mode: RankMode): Promise<Leaderboard>

  /** 본인 gold 변경을 구독한다. 해제 함수를 반환. (REQ-LOBBY-01) */
  subscribeGold(userId: string, onChange: (gold: number) => void): () => void
}

const KNOWN_CODES: ApiErrorCode[] = [
  'INSUFFICIENT_GOLD',
  'SESSION_NOT_FOUND',
  'INVALID_TARGET',
  'INVALID_AMOUNT',
  'NOT_ENOUGH_DOLLS',
]

/** Postgres 예외 메시지에서 계약된 에러 코드를 뽑아낸다. */
function toApiError(error: { message?: string } | null): ApiError {
  const message = error?.message ?? ''
  const code = KNOWN_CODES.find((c) => message.includes(c)) ?? 'UNKNOWN'
  return new ApiError(code, message)
}

async function rpc<T>(fn: string, params: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await requireSupabase().rpc(fn, params)
  if (error) throw toApiError(error)
  return data as T
}

const supabaseApi: GameApi = {
  async signUp(email, password, nickname) {
    const { error } = await requireSupabase().auth.signUp({
      email,
      password,
      options: { data: { nickname } },
    })
    if (error) throw toApiError(error)
  },

  async signIn(email, password) {
    const { error } = await requireSupabase().auth.signInWithPassword({ email, password })
    if (error) throw toApiError(error)
  },

  async signOut() {
    const { error } = await requireSupabase().auth.signOut()
    if (error) throw toApiError(error)
  },

  async getProfile() {
    const client = requireSupabase()
    const { data: auth } = await client.auth.getUser()
    if (!auth.user) return null

    const { data, error } = await client
      .from('profiles')
      .select('id, nickname, gold')
      .eq('id', auth.user.id)
      .single()
    if (error) throw toApiError(error)
    return data as Profile
  },

  startGame: (mode) => rpc<StartGameResult>('start_game', { p_mode: mode }),

  finishGame: (sessionId, caught) =>
    rpc<FinishGameResult>('finish_game', { p_session_id: sessionId, p_caught: caught }),

  getCollection: () => rpc<CollectionEntry[]>('get_collection'),

  sellDoll: (dollId, count) =>
    rpc<SellDollResult>('sell_doll', { p_doll_id: dollId, p_count: count }),

  transferGold: (toNickname, amount) =>
    rpc<TransferResult>('transfer_gold', { p_to_nickname: toNickname, p_amount: amount }),

  getLeaderboard: (mode) => rpc<Leaderboard>('get_leaderboard', { p_mode: mode }),

  subscribeGold(userId, onChange) {
    const channel = requireSupabase()
      .channel(`profile-gold-${userId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` },
        (payload) => {
          const next = (payload.new as Profile | undefined)?.gold
          if (typeof next === 'number') onChange(next)
        },
      )
      .subscribe()

    return () => {
      void requireSupabase().removeChannel(channel)
    }
  },
}

export const api: GameApi = USE_MOCK ? mockApi : supabaseApi
