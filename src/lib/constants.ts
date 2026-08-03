import type { DollSize, GameMode, TierName } from '@/types/api'

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
