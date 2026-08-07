import { requireSupabase, USE_MOCK } from './supabase'
import { mockApi } from '@/mocks/api'
import {
  ApiError,
  type ApiErrorCode,
  type BuyItemResult,
  type CollectionEntry,
  type FinishGameResult,
  type GameMode,
  type ItemId,
  type ItemStock,
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

  /**
   * 게임 시작. useItems에 넣은 아이템은 서버가 검사하고 소모한다.
   * 실제로 쓰인 아이템은 응답의 items_used로만 판단한다.
   */
  startGame(mode: GameMode, useItems?: ItemId[]): Promise<StartGameResult>
  finishGame(sessionId: string, caught: number): Promise<FinishGameResult>
  getCollection(): Promise<CollectionEntry[]>
  sellDoll(dollId: number, count: number): Promise<SellDollResult>
  transferGold(toNickname: string, amount: number): Promise<TransferResult>
  getLeaderboard(mode: RankMode): Promise<Leaderboard>

  /** 보유 아이템. 수량 0인 것도 포함해서 내려온다. (REQ-SHOP-02) */
  getInventory(): Promise<ItemStock[]>
  buyItem(itemId: ItemId, count: number): Promise<BuyItemResult>

  /** 본인 gold 변경을 구독한다. 해제 함수를 반환. (REQ-LOBBY-01) */
  subscribeGold(userId: string, onChange: (gold: number) => void): () => void
}

const KNOWN_CODES: ApiErrorCode[] = [
  'INSUFFICIENT_GOLD',
  'SESSION_NOT_FOUND',
  'INVALID_TARGET',
  'INVALID_AMOUNT',
  'NOT_ENOUGH_DOLLS',
  'NOT_ENOUGH_ITEMS',
  'ITEM_NOT_ALLOWED',
]

/** Postgres 예외 메시지에서 계약된 에러 코드를 뽑아낸다. */
function toApiError(error: { message?: string } | null): ApiError {
  const message = error?.message ?? ''
  const code = KNOWN_CODES.find((c) => message.includes(c)) ?? 'UNKNOWN'
  return new ApiError(code, message)
}

interface SupabaseAuthError {
  code?: string
  status?: number
  message?: string
}

/**
 * Supabase Auth 에러를 화면에 쓸 코드로 옮긴다.
 *
 * error.code는 supabase-js가 비교적 최근에 채우기 시작한 값이라 비어 있는 경로가 남아 있다.
 * 그래서 코드로 먼저 보고, 없으면 메시지 문자열로 한 번 더 본다.
 * 둘 다 못 맞히면 UNKNOWN으로 두되 원문 message는 ApiError에 담아 콘솔에서 추적할 수 있게 한다.
 */
function toAuthError(error: SupabaseAuthError): ApiError {
  const code = error.code ?? ''
  const message = error.message ?? ''
  const lower = message.toLowerCase()
  const of = (c: ApiErrorCode) => new ApiError(c, message)

  // 없는 계정인지 틀린 비밀번호인지는 서버가 알려주지 않는다. 계정 존재 여부가 새는 걸 막기 위해서다.
  if (code === 'invalid_credentials' || lower.includes('invalid login credentials')) {
    return of('INVALID_CREDENTIALS')
  }
  if (code === 'email_not_confirmed' || lower.includes('email not confirmed')) {
    return of('EMAIL_NOT_CONFIRMED')
  }
  if (
    code === 'user_already_exists' ||
    code === 'email_exists' ||
    lower.includes('already registered') ||
    lower.includes('user already exists')
  ) {
    return of('EMAIL_ALREADY_REGISTERED')
  }
  if (code === 'weak_password' || lower.includes('password should')) {
    return of('WEAK_PASSWORD')
  }
  if (code === 'validation_failed' || lower.includes('unable to validate email')) {
    return of('INVALID_EMAIL')
  }
  if (error.status === 429 || code.includes('rate_limit') || lower.includes('rate limit')) {
    return of('TOO_MANY_REQUESTS')
  }
  return of('UNKNOWN')
}

async function rpc<T>(fn: string, params: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await requireSupabase().rpc(fn, params)
  if (error) throw toApiError(error)
  return data as T
}

const supabaseApi: GameApi = {
  async signUp(email, password, nickname) {
    const { data, error } = await requireSupabase().auth.signUp({
      email,
      password,
      options: { data: { nickname } },
    })

    if (error) {
      /*
       * 닉네임이 겹치면 profiles의 unique 제약에 걸려 가입 트리거가 실패하고,
       * Supabase는 "Database error saving new user"라는 500만 돌려준다.
       * 원인을 구분할 단서가 이것뿐이라 닉네임 중복으로 단정해 안내한다.
       * 서버에서 중복 닉네임을 별도 코드로 돌려주면 이 분기는 지울 수 있다.
       */
      if (error.message?.includes('Database error saving new user')) {
        throw new ApiError('NICKNAME_TAKEN', error.message)
      }
      throw toAuthError(error)
    }

    /*
     * 이메일 확인이 켜져 있으면 이미 가입된 이메일로 가입해도 에러가 아니라
     * '성공'이 돌아온다. 가입 여부가 새는 걸 막으려고 서버가 일부러 뭉개기 때문이다.
     * 이때 identities만 빈 배열로 오므로, 그 신호로 중복 가입을 판별한다.
     */
    if (data.user && data.user.identities?.length === 0) {
      throw new ApiError('EMAIL_ALREADY_REGISTERED')
    }
  },

  async signIn(email, password) {
    const { error } = await requireSupabase().auth.signInWithPassword({ email, password })
    if (error) throw toAuthError(error)
  },

  async signOut() {
    const { error } = await requireSupabase().auth.signOut()
    if (error) throw new ApiError('SIGNOUT_FAILED', error.message)
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

  /*
   * 아이템을 고르지 않았을 때는 p_items를 아예 보내지 않는다.
   * 서버에 아직 아이템 인자가 없어도 기존과 똑같이 동작해야 하기 때문이다.
   */
  startGame: (mode, useItems) =>
    rpc<StartGameResult>(
      'start_game',
      useItems && useItems.length > 0
        ? { p_mode: mode, p_items: useItems }
        : { p_mode: mode },
    ).then((result) => ({ ...result, items_used: result.items_used ?? [] })),

  finishGame: (sessionId, caught) =>
    rpc<FinishGameResult>('finish_game', { p_session_id: sessionId, p_caught: caught }),

  getCollection: () => rpc<CollectionEntry[]>('get_collection'),

  sellDoll: (dollId, count) =>
    rpc<SellDollResult>('sell_doll', { p_doll_id: dollId, p_count: count }),

  transferGold: (toNickname, amount) =>
    rpc<TransferResult>('transfer_gold', { p_to_nickname: toNickname, p_amount: amount }),

  getLeaderboard: (mode) => rpc<Leaderboard>('get_leaderboard', { p_mode: mode }),

  getInventory: () => rpc<ItemStock[]>('get_inventory'),

  buyItem: (itemId, count) =>
    rpc<BuyItemResult>('buy_item', { p_item_id: itemId, p_count: count }),

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
