import type { GameApi } from '@/lib/api'
import {
  ApiError,
  type AcquiredDoll,
  type BuyItemResult,
  type CollectionEntry,
  type DollSize,
  type FinishGameResult,
  type GameMode,
  type ItemId,
  type ItemStock,
  type Leaderboard,
  type Profile,
  type RankMode,
  type SellDollResult,
  type StartGameResult,
  type TierName,
  type TransferResult,
} from '@/types/api'
import { ENTRY_COST, ITEM_BY_ID, SCORE_PER_DOLL, SHOP_ITEMS, TIER_LABEL } from '@/lib/constants'
import { MOCK_DOLLS } from './dolls'

/**
 * BE 준비 전까지 화면을 끝까지 돌리기 위한 인메모리 mock.
 * localStorage에 저장해 새로고침해도 상태가 유지된다.
 * ⚠️ 08.04 Meeting 2에서 실제 Supabase로 전환하면 이 파일은 개발용으로만 남는다.
 */

const STORAGE_KEY = 'claw-mock-state'
const LATENCY_MS = 200

interface MockRank {
  tier: TierName
  best: number
  promoteCnt: number
  demoteCnt: number
}

interface MockState {
  /** 현재 저장된 상태가 어떤 계정 것인지. 다른 계정으로 로그인하면 갈아끼운다. */
  email: string | null
  signedIn: boolean
  profile: Profile
  /** doll_id → 보유 수량 */
  owned: Record<number, number>
  /** item_id → 보유 수량 */
  items: Partial<Record<ItemId, number>>
  sessions: Record<string, { mode: GameMode; cost: number; done: boolean }>
  ranks: Record<RankMode, MockRank>
}

/**
 * 티어 기준표 (docs/SCHEMA.md §2.5).
 * 조건 점수를 필요 횟수만큼 먼저 달성하면 즉시 승급/강등한다. (REQ-RANK-02)
 */
const TIER_ORDER: TierName[] = [
  'bronze',
  'silver',
  'gold',
  'platinum',
  'diamond',
  'master',
  'challenger',
]

const TIER_RULES: Record<
  TierName,
  { promoteScore: number; promoteCount: number; demoteScore: number; demoteCount: number }
> = {
  bronze: { promoteScore: 20, promoteCount: 3, demoteScore: 0, demoteCount: 99 },
  silver: { promoteScore: 30, promoteCount: 3, demoteScore: 20, demoteCount: 4 },
  gold: { promoteScore: 40, promoteCount: 3, demoteScore: 25, demoteCount: 4 },
  platinum: { promoteScore: 50, promoteCount: 3, demoteScore: 30, demoteCount: 4 },
  diamond: { promoteScore: 60, promoteCount: 3, demoteScore: 35, demoteCount: 4 },
  master: { promoteScore: 70, promoteCount: 3, demoteScore: 40, demoteCount: 4 },
  challenger: { promoteScore: 999, promoteCount: 99, demoteScore: 50, demoteCount: 4 },
}

/** 한 판의 점수를 반영해 승·강등을 판정한다. 서버 로직(B2-7)의 mock 대응물. */
function applyRankChange(rank: MockRank, score: number): 'promote' | 'demote' | 'none' {
  const rule = TIER_RULES[rank.tier]
  const level = TIER_ORDER.indexOf(rank.tier)

  if (score >= rule.promoteScore) {
    rank.promoteCnt += 1
    if (rank.promoteCnt >= rule.promoteCount && level < TIER_ORDER.length - 1) {
      rank.tier = TIER_ORDER[level + 1]
      rank.promoteCnt = 0
      rank.demoteCnt = 0
      return 'promote'
    }
  } else if (score < rule.demoteScore) {
    rank.demoteCnt += 1
    if (rank.demoteCnt >= rule.demoteCount && level > 0) {
      rank.tier = TIER_ORDER[level - 1]
      rank.promoteCnt = 0
      rank.demoteCnt = 0
      return 'demote'
    }
  }
  return 'none'
}

/**
 * 게임 화면이 나오기 전까지 콜렉터함/상점을 확인할 수 있도록 몇 개를 미리 쥐여준다.
 * ⚠️ mock 전용. 실제 Supabase에서는 신규 유저의 보유 인형이 0이다.
 */
const STARTER_DOLLS: Record<number, number> = { 1: 2, 4: 1, 101: 1, 201: 1 }

/**
 * 시연용 게임 마스터 계정 (MASTER_ACCOUNT).
 * 인형 45종을 모두 보유하고 자금 1,000,000 Gold로 시작한다.
 *
 * ⚠️ mock 전용이다. 실제 Supabase로 넘어갈 때 이 분기를 그대로 옮기면 안 된다.
 *    비밀번호가 번들에 그대로 들어가므로, 서버에서는 마이그레이션 시드로 계정을 만들고
 *    일반 로그인으로 접속해야 한다. (docs/SCHEMA.md §7 참고)
 */
export const MASTER_ACCOUNT = {
  email: 'admin@admin.com',
  password: '1q2w3e',
  nickname: '게임마스터',
  gold: 1_000_000,
}

const isMaster = (email: string, password: string) =>
  email.trim().toLowerCase() === MASTER_ACCOUNT.email && password === MASTER_ACCOUNT.password

/** 인형 45종을 1개씩 보유한 상태 */
const allDolls = (): Record<number, number> =>
  Object.fromEntries(MOCK_DOLLS.map((d) => [d.id, 1]))

const initialState = (): MockState => ({
  email: null,
  signedIn: false,
  profile: { id: 'mock-user-0001', nickname: '테스터', gold: 10000 },
  owned: { ...STARTER_DOLLS },
  items: {},
  sessions: {},
  ranks: {
    small: { tier: 'bronze', best: 0, promoteCnt: 0, demoteCnt: 0 },
    medium: { tier: 'bronze', best: 0, promoteCnt: 0, demoteCnt: 0 },
  },
})

const masterState = (): MockState => ({
  email: MASTER_ACCOUNT.email,
  signedIn: false,
  profile: {
    id: 'mock-master-0000',
    nickname: MASTER_ACCOUNT.nickname,
    gold: MASTER_ACCOUNT.gold,
  },
  owned: allDolls(),
  // 시연용이라 아이템도 넉넉히 쥐여 준다
  items: { grip_boost: 9, extra_time: 9 },
  sessions: {},
  ranks: {
    small: { tier: 'challenger', best: 220, promoteCnt: 0, demoteCnt: 0 },
    medium: { tier: 'challenger', best: 180, promoteCnt: 0, demoteCnt: 0 },
  },
})

function load(): MockState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? { ...initialState(), ...(JSON.parse(raw) as MockState) } : initialState()
  } catch {
    return initialState()
  }
}

let state = load()
const goldListeners = new Set<(gold: number) => void>()

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

function setGold(next: number) {
  state.profile.gold = next
  save()
  goldListeners.forEach((fn) => fn(next))
}

const delay = <T,>(value: T): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), LATENCY_MS))

const pickRandom = <T,>(list: T[]): T => list[Math.floor(Math.random() * list.length)]

/** 모드별로 뽑힐 수 있는 인형 크기 (BE의 drop_weight 추첨을 단순화한 것) */
const DROP_POOL: Record<GameMode, DollSize> = {
  small: 'small',
  medium: 'medium',
  large: 'large',
}

export const mockApi: GameApi = {
  async signUp(email, _password, nickname) {
    state = initialState()
    state.email = email.trim().toLowerCase()
    state.signedIn = true
    state.profile.nickname = nickname
    save()
    await delay(null)
  },

  async signIn(email, password) {
    const normalized = email.trim().toLowerCase()

    if (isMaster(normalized, password)) {
      // 마스터 계정은 접속할 때마다 완비된 상태로 되돌린다. 시연 중 소모돼도 다시 로그인하면 복구된다.
      state = masterState()
    } else if (state.email !== normalized) {
      // 다른 계정으로 바꿔 로그인하면 이전 계정의 진행 상황을 물려받지 않는다.
      state = initialState()
      state.email = normalized
    }

    state.signedIn = true
    save()
    await delay(null)
  },

  async signOut() {
    state.signedIn = false
    save()
    await delay(null)
  },

  async getProfile() {
    return delay(state.signedIn ? { ...state.profile } : null)
  },

  async startGame(mode, useItems = []) {
    const cost = ENTRY_COST[mode]
    if (state.profile.gold < cost) throw new ApiError('INSUFFICIENT_GOLD')

    // 아이템은 골드를 깎기 전에 전부 검사한다. 중간에 실패하면 입장료만 날아간다.
    const wanted = [...new Set(useItems)]
    for (const id of wanted) {
      if (!ITEM_BY_ID[id]?.modes.includes(mode)) throw new ApiError('ITEM_NOT_ALLOWED')
      if ((state.items[id] ?? 0) < 1) throw new ApiError('NOT_ENOUGH_ITEMS')
    }
    wanted.forEach((id) => {
      state.items[id] = (state.items[id] ?? 0) - 1
    })

    const sessionId = `mock-session-${Object.keys(state.sessions).length + 1}`
    state.sessions[sessionId] = { mode, cost, done: false }
    setGold(state.profile.gold - cost)

    return delay<StartGameResult>({
      session_id: sessionId,
      mode,
      cost,
      gold_after: state.profile.gold,
      items_used: wanted,
    })
  },

  async getInventory() {
    return delay<ItemStock[]>(
      SHOP_ITEMS.map((item) => ({ id: item.id, count: state.items[item.id] ?? 0 })),
    )
  },

  async buyItem(itemId, count) {
    const item = ITEM_BY_ID[itemId]
    if (!item || count <= 0) throw new ApiError('INVALID_AMOUNT')

    const total = item.price * count
    if (state.profile.gold < total) throw new ApiError('INSUFFICIENT_GOLD')

    state.items[itemId] = (state.items[itemId] ?? 0) + count
    setGold(state.profile.gold - total)

    return delay<BuyItemResult>({
      id: itemId,
      count: state.items[itemId]!,
      gold_after: state.profile.gold,
    })
  },

  async finishGame(sessionId, caught) {
    const session = state.sessions[sessionId]
    if (!session || session.done) throw new ApiError('SESSION_NOT_FOUND')
    session.done = true

    const pool = MOCK_DOLLS.filter((d) => d.size === DROP_POOL[session.mode])
    const dolls: AcquiredDoll[] = Array.from({ length: caught }, () => {
      const doll = pickRandom(pool)
      const isNew = !state.owned[doll.id]
      state.owned[doll.id] = (state.owned[doll.id] ?? 0) + 1
      return {
        id: doll.id,
        name: doll.name,
        size: doll.size,
        image_path: doll.image_path,
        is_new: isNew,
      }
    })

    const score = caught * SCORE_PER_DOLL
    let rank: FinishGameResult['rank'] = null

    // 대형은 랭킹 대상이 아니다 (REQ-RANK-01)
    if (session.mode !== 'large') {
      const mode = session.mode as RankMode
      const current = state.ranks[mode]
      if (score > current.best) current.best = score

      const before = current.tier
      const changed = applyRankChange(current, score)
      rank = { mode, before, after: current.tier, changed }
    }

    save()
    return delay<FinishGameResult>({ score, dolls, rank })
  },

  async getCollection() {
    const entries: CollectionEntry[] = MOCK_DOLLS.map((doll) => {
      const count = state.owned[doll.id] ?? 0
      return {
        id: doll.id,
        name: doll.name,
        size: doll.size,
        image_path: doll.image_path,
        count,
        owned: count > 0,
      }
    })
    return delay(entries)
  },

  async sellDoll(dollId, count) {
    if (count <= 0) throw new ApiError('INVALID_AMOUNT')
    const have = state.owned[dollId] ?? 0
    if (have < count) throw new ApiError('NOT_ENOUGH_DOLLS')

    const doll = MOCK_DOLLS.find((d) => d.id === dollId)!
    const earned = doll.sell_price * count
    state.owned[dollId] = have - count
    setGold(state.profile.gold + earned)

    return delay<SellDollResult>({
      sold: count,
      earned,
      gold_after: state.profile.gold,
      remain: state.owned[dollId],
    })
  },

  async transferGold(toNickname, amount) {
    if (amount <= 0) throw new ApiError('INVALID_AMOUNT')
    if (!toNickname.trim() || toNickname === state.profile.nickname) {
      throw new ApiError('INVALID_TARGET')
    }
    if (state.profile.gold < amount) throw new ApiError('INSUFFICIENT_GOLD')

    setGold(state.profile.gold - amount)
    return delay<TransferResult>({
      to: toNickname,
      amount,
      gold_after: state.profile.gold,
    })
  },

  async getLeaderboard(mode) {
    const me = state.ranks[mode]
    const top: Leaderboard['top'] = (
      ['challenger', 'challenger', 'master', 'master', 'diamond'] as TierName[]
    ).map((tier, i) => ({
      rank: i + 1,
      nickname: `${TIER_LABEL[tier]}_${i + 1}`,
      tier,
      best_score: 200 - i * 15,
    }))

    return delay<Leaderboard>({
      top,
      me: {
        rank: 57,
        nickname: state.profile.nickname,
        tier: me.tier,
        best_score: me.best,
      },
    })
  },

  subscribeGold(_userId, onChange) {
    goldListeners.add(onChange)
    return () => goldListeners.delete(onChange)
  },
}
