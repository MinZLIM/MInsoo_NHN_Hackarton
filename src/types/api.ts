/**
 * docs/SCHEMA.md 의 계약을 그대로 옮긴 타입 정의.
 * 스키마가 바뀌면 SCHEMA.md를 먼저 고치고 이 파일을 맞춘다.
 */

export type DollSize = 'small' | 'medium' | 'large'
export type GameMode = 'small' | 'medium' | 'large'
/** 랭킹 대상 모드 — large 제외 (REQ-RANK-01) */
export type RankMode = Extract<GameMode, 'small' | 'medium'>

export type TierName =
  | 'bronze'
  | 'silver'
  | 'gold'
  | 'platinum'
  | 'diamond'
  | 'master'
  | 'challenger'

export interface Profile {
  id: string
  nickname: string
  gold: number
}

/** get_collection() — 미보유 인형도 포함해서 내려온다 (마스킹 렌더링용) */
export interface CollectionEntry {
  id: number
  name: string
  size: DollSize
  image_path: string
  count: number
  owned: boolean
}

/** finish_game() 응답에 포함되는 획득 인형 */
export interface AcquiredDoll {
  id: number
  name: string
  size: DollSize
  image_path: string
  is_new: boolean
}

/** 상점에서 파는 게임 아이템 (REQ-SHOP-02) */
export type ItemId = 'grip_boost' | 'extra_time'

/** get_inventory() — 보유 수량 0인 아이템도 내려온다 (상점에서 잔량 표시용) */
export interface ItemStock {
  id: ItemId
  count: number
}

export interface BuyItemResult {
  id: ItemId
  count: number
  gold_after: number
}

export interface StartGameResult {
  session_id: string
  mode: GameMode
  cost: number
  gold_after: number
  /** 이번 판에 실제로 소모된 아이템. 서버가 확정해 준 값만 믿는다. */
  items_used: ItemId[]
}

export interface RankChange {
  mode: RankMode
  before: TierName
  after: TierName
  changed: 'promote' | 'demote' | 'none'
}

export interface FinishGameResult {
  score: number
  dolls: AcquiredDoll[]
  rank: RankChange | null
}

export interface SellDollResult {
  sold: number
  earned: number
  gold_after: number
  remain: number
}

export interface TransferResult {
  to: string
  amount: number
  gold_after: number
}

export interface LeaderboardRow {
  rank: number
  nickname: string
  tier: TierName
  best_score: number
}

export interface Leaderboard {
  top: LeaderboardRow[]
  me: LeaderboardRow | null
}

/** RPC가 던지는 에러 코드 (SCHEMA.md §4 공통 에러 코드) */
export type ApiErrorCode =
  | 'INSUFFICIENT_GOLD'
  | 'SESSION_NOT_FOUND'
  | 'INVALID_TARGET'
  | 'INVALID_AMOUNT'
  | 'NOT_ENOUGH_DOLLS'
  | 'NOT_ENOUGH_ITEMS'
  | 'ITEM_NOT_ALLOWED'
  | 'SIGNUP_FAILED'
  | 'UNKNOWN'

export class ApiError extends Error {
  code: ApiErrorCode

  constructor(code: ApiErrorCode, message?: string) {
    super(message ?? code)
    this.name = 'ApiError'
    this.code = code
  }
}

const ERROR_MESSAGES: Record<ApiErrorCode, string> = {
  INSUFFICIENT_GOLD: '골드가 부족합니다.',
  SESSION_NOT_FOUND: '게임 세션을 찾을 수 없습니다.',
  INVALID_TARGET: '대상 유저를 찾을 수 없습니다.',
  INVALID_AMOUNT: '금액을 올바르게 입력해 주세요.',
  NOT_ENOUGH_DOLLS: '보유 수량이 부족합니다.',
  NOT_ENOUGH_ITEMS: '아이템이 부족합니다.',
  ITEM_NOT_ALLOWED: '이 모드에서는 사용할 수 없는 아이템입니다.',
  SIGNUP_FAILED: '가입에 실패했습니다. 닉네임이 이미 사용 중일 수 있으니 다른 닉네임으로 시도해 주세요.',
  UNKNOWN: '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.',
}

export function messageOf(error: unknown): string {
  if (error instanceof ApiError) return ERROR_MESSAGES[error.code]
  return ERROR_MESSAGES.UNKNOWN
}
