import type { GameApi } from '@/lib/api'
import {
  ApiError,
  type AcquiredDoll,
  type CollectionEntry,
  type DollSize,
  type FinishGameResult,
  type GameMode,
  type Leaderboard,
  type Profile,
  type RankMode,
  type SellDollResult,
  type StartGameResult,
  type TierName,
  type TransferResult,
} from '@/types/api'
import { ENTRY_COST, SCORE_PER_DOLL, TIER_LABEL } from '@/lib/constants'
import { MOCK_DOLLS } from './dolls'

/**
 * BE 준비 전까지 화면을 끝까지 돌리기 위한 인메모리 mock.
 * localStorage에 저장해 새로고침해도 상태가 유지된다.
 * ⚠️ 08.04 Meeting 2에서 실제 Supabase로 전환하면 이 파일은 개발용으로만 남는다.
 */

const STORAGE_KEY = 'claw-mock-state'
const LATENCY_MS = 200

interface MockState {
  signedIn: boolean
  profile: Profile
  /** doll_id → 보유 수량 */
  owned: Record<number, number>
  sessions: Record<string, { mode: GameMode; cost: number; done: boolean }>
  ranks: Record<RankMode, { tier: TierName; best: number }>
}

/**
 * 게임 화면이 나오기 전까지 콜렉터함/상점을 확인할 수 있도록 몇 개를 미리 쥐여준다.
 * ⚠️ mock 전용. 실제 Supabase에서는 신규 유저의 보유 인형이 0이다.
 */
const STARTER_DOLLS: Record<number, number> = { 1: 2, 4: 1, 101: 1, 201: 1 }

const initialState = (): MockState => ({
  signedIn: false,
  profile: { id: 'mock-user-0001', nickname: '테스터', gold: 10000 },
  owned: { ...STARTER_DOLLS },
  sessions: {},
  ranks: { small: { tier: 'bronze', best: 0 }, medium: { tier: 'bronze', best: 0 } },
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
  async signUp(_email, _password, nickname) {
    state = initialState()
    state.signedIn = true
    state.profile.nickname = nickname
    save()
    await delay(null)
  },

  async signIn(_email, _password) {
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

  async startGame(mode) {
    const cost = ENTRY_COST[mode]
    if (state.profile.gold < cost) throw new ApiError('INSUFFICIENT_GOLD')

    const sessionId = `mock-session-${Object.keys(state.sessions).length + 1}`
    state.sessions[sessionId] = { mode, cost, done: false }
    setGold(state.profile.gold - cost)

    return delay<StartGameResult>({
      session_id: sessionId,
      mode,
      cost,
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

    if (session.mode !== 'large') {
      const mode = session.mode as RankMode
      const current = state.ranks[mode]
      if (score > current.best) current.best = score
      rank = { mode, before: current.tier, after: current.tier, changed: 'none' }
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
