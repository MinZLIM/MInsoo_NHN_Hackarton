import type { DollSize, GameMode, ItemId, TierName } from '@/types/api'

/** docs/SCHEMA.md §3 상수표. 값을 바꿀 때는 반드시 BE와 함께 바꾼다. */

export const ENTRY_COST: Record<GameMode, number> = {
  small: 1000,
  medium: 2000,
  large: 3000,
}

export const SELL_PRICE: Record<DollSize, number> = {
  small: 1000,
  medium: 3000,
  large: 5000,
}

export const DOLL_COUNT: Record<DollSize, number> = {
  small: 30,
  medium: 10,
  large: 5,
}

export const TOTAL_DOLLS = DOLL_COUNT.small + DOLL_COUNT.medium + DOLL_COUNT.large // 45

/** 인형 1개당 획득 점수 (REQ-GAME-01) */
export const SCORE_PER_DOLL = 10

/** 소형/중형 타임어택 제한 시간(초) */
export const TIME_ATTACK_SEC = 60

/** 대형 타이밍 게임: 이 시각(초)에 맞춰 눌러야 성공 */
export const LARGE_TARGET_SEC = 20
/** 대형 타이밍 게임 시작 시각(초) */
export const LARGE_START_SEC = 1
/** 20.00초 기준 이 오차(초) 안에 누르면 성공 */
export const LARGE_TOLERANCE_SEC = 0.15

/**
 * 모드별 난이도 값은 각 게임 쪽에 모여 있다. (F2-9)
 *   소형 — src/game/three/layout.ts 의 CLAW (grabRadius / grabChance / slipPerSec)
 *   중형 — 같은 파일의 CLIP (toleranceRad / spinSpeed)
 *   대형 — 이 파일의 LARGE_TOLERANCE_SEC
 */

/**
 * 상점 아이템 (REQ-SHOP-02).
 *
 * 가격과 효과는 서버와 반드시 같아야 한다. 소모는 start_game이 처리하고,
 * FE는 서버가 돌려준 items_used만 실제 효과에 반영한다.
 */
export interface ShopItem {
  id: ItemId
  name: string
  icon: string
  description: string
  price: number
  /** 이 아이템을 쓸 수 있는 모드 */
  modes: GameMode[]
}

export const SHOP_ITEMS: ShopItem[] = [
  {
    id: 'grip_boost',
    name: '집게 강화',
    icon: '💪',
    description: '집게가 버티는 힘이 60% 올라갑니다. 다리 끝을 물어도 잘 놓치지 않습니다.',
    price: 1500,
    modes: ['small'],
  },
  {
    id: 'extra_time',
    name: '시간 연장',
    icon: '⏱',
    description: '제한 시간이 20초 늘어납니다.',
    price: 1200,
    modes: ['small', 'medium'],
  },
]

export const ITEM_BY_ID: Record<ItemId, ShopItem> = Object.fromEntries(
  SHOP_ITEMS.map((item) => [item.id, item]),
) as Record<ItemId, ShopItem>

/** 아이템 효과값 — 게임 쪽에서 이 값만 보고 계산한다 */
export const ITEM_EFFECT = {
  /** 집게 강화: 버티는 토크 배율 */
  gripBoost: 1.6,
  /** 시간 연장: 더해지는 초 */
  extraTimeSec: 20,
}

export const SIZE_LABEL: Record<DollSize, string> = {
  small: '소형',
  medium: '중형',
  large: '대형',
}

export const MODE_LABEL: Record<GameMode, string> = {
  small: '소형 인형뽑기',
  medium: '중형 인형뽑기',
  large: '대형 인형뽑기',
}

export const MODE_DIFFICULTY: Record<GameMode, string> = {
  small: '하',
  medium: '중',
  large: '상',
}

export const TIER_LABEL: Record<TierName, string> = {
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  platinum: 'Platinum',
  diamond: 'Diamond',
  master: 'Master',
  challenger: 'Challenger',
}

export const TIER_COLOR: Record<TierName, string> = {
  bronze: '#a1673f',
  silver: '#9aa5b1',
  gold: '#e0aa3e',
  platinum: '#4fd1c5',
  diamond: '#6aa8ff',
  master: '#b07bff',
  challenger: '#ff6b6b',
}

export const formatGold = (n: number) => n.toLocaleString('ko-KR')
