/**
 * docs/SCHEMA.md 의 계약을 그대로 옮긴 타입 정의.
 * 스키마가 바뀌면 SCHEMA.md를 먼저 고치고 이 파일을 맞춘다.
 */
import { PASSWORD_RULE_TEXT } from '@/lib/password'

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
  // 인증 관련. 실패 원인을 화면에서 구분해 안내하기 위한 코드들이다.
  | 'ACCOUNT_NOT_FOUND'
  | 'WRONG_PASSWORD'
  | 'INVALID_CREDENTIALS'
  | 'EMAIL_NOT_CONFIRMED'
  | 'EMAIL_ALREADY_REGISTERED'
  | 'NICKNAME_TAKEN'
  | 'WEAK_PASSWORD'
  | 'INVALID_EMAIL'
  | 'TOO_MANY_REQUESTS'
  | 'SIGNUP_FAILED'
  | 'SIGNOUT_FAILED'
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

  ACCOUNT_NOT_FOUND: '가입되지 않은 이메일입니다. 이메일을 확인하거나 회원가입해 주세요.',
  WRONG_PASSWORD: '비밀번호가 올바르지 않습니다. 다시 확인해 주세요.',
  /*
   * 실제 Supabase는 '없는 계정'과 '틀린 비밀번호'를 구분해 주지 않는다.
   * 어느 쪽인지 알려주면 가입 여부를 캐낼 수 있기 때문이고, 이건 의도된 동작이다.
   * 그래서 실 연동 모드에서는 이 뭉뚱그린 문구가 나온다. (mock은 구분해 준다)
   */
  INVALID_CREDENTIALS: '이메일 또는 비밀번호가 올바르지 않습니다.',
  EMAIL_NOT_CONFIRMED: '이메일 인증이 아직 완료되지 않았습니다. 받은 메일함을 확인해 주세요.',
  EMAIL_ALREADY_REGISTERED: '이미 가입된 이메일입니다. 로그인하거나 다른 이메일을 사용해 주세요.',
  NICKNAME_TAKEN: '이미 사용 중인 닉네임입니다. 다른 닉네임으로 시도해 주세요.',
  WEAK_PASSWORD: `비밀번호가 규칙에 맞지 않습니다. ${PASSWORD_RULE_TEXT}이어야 합니다.`,
  INVALID_EMAIL: '이메일 형식을 확인해 주세요.',
  TOO_MANY_REQUESTS: '요청이 너무 잦습니다. 잠시 후 다시 시도해 주세요.',
  SIGNUP_FAILED: '가입에 실패했습니다. 잠시 후 다시 시도해 주세요.',
  SIGNOUT_FAILED: '로그아웃하지 못했습니다. 잠시 후 다시 시도해 주세요.',
  UNKNOWN: '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.',
}

export function messageOf(error: unknown): string {
  if (error instanceof ApiError) return ERROR_MESSAGES[error.code]
  return ERROR_MESSAGES.UNKNOWN
}
