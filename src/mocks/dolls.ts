import type { DollSize } from '@/types/api'
import { DOLL_COUNT, SELL_PRICE } from '@/lib/constants'

export interface MockDoll {
  id: number
  name: string
  size: DollSize
  image_path: string
  sell_price: number
}

/**
 * 인형 45종 마스터 (C-3). 이름 순서가 곧 image_path의 번호가 된다.
 * 실제 이미지 에셋이 준비되기 전까지는 이모지로 대체 렌더링한다. (@/lib/assets)
 */
const CATALOG: Record<DollSize, [name: string, emoji: string][]> = {
  small: [
    ['토끼', '🐰'], ['펭귄', '🐧'], ['병아리', '🐤'], ['고양이', '🐱'], ['강아지', '🐶'],
    ['햄스터', '🐹'], ['개구리', '🐸'], ['오리', '🦆'], ['다람쥐', '🐿️'], ['너구리', '🦝'],
    ['판다', '🐼'], ['코알라', '🐨'], ['여우', '🦊'], ['늑대', '🐺'], ['사슴', '🦌'],
    ['양', '🐑'], ['돼지', '🐷'], ['소', '🐮'], ['호랑이', '🐯'], ['사자', '🦁'],
    ['문어', '🐙'], ['상어', '🦈'], ['고래', '🐳'], ['거북이', '🐢'], ['해파리', '🪼'],
    ['유니콘', '🦄'], ['드래곤', '🐉'], ['공룡', '🦕'], ['로봇', '🤖'], ['외계인', '👽'],
  ],
  medium: [
    ['거대곰', '🧸'], ['킹펭귄', '🐧'], ['점보토끼', '🐰'], ['빅캣', '🐈'], ['왕댕댕', '🐕'],
    ['메가판다', '🐼'], ['자이언트여우', '🦊'], ['대형양', '🐏'], ['빅샤크', '🦈'],
    ['메가드래곤', '🐲'],
  ],
  large: [
    ['전설의 곰', '🐻‍❄️'], ['황금 유니콘', '🦄'], ['거대 드래곤', '🐉'], ['우주 고래', '🐋'],
    ['전설의 로봇', '🦾'],
  ],
}

const SIZES: DollSize[] = ['small', 'medium', 'large']

/** BE의 dolls 시드 45종을 흉내낸 마스터 데이터 (docs/SCHEMA.md §2.2) */
export const MOCK_DOLLS: MockDoll[] = SIZES.flatMap((size, sizeIndex) =>
  CATALOG[size].map(([name], i) => ({
    id: sizeIndex * 100 + i + 1,
    name,
    size,
    image_path: `dolls/${size}_${String(i + 1).padStart(2, '0')}.png`,
    sell_price: SELL_PRICE[size],
  })),
)

/** image_path → 이모지. 실제 이미지가 없을 때의 대체 표시용. */
export const DOLL_EMOJI: Record<string, string> = Object.fromEntries(
  SIZES.flatMap((size) =>
    CATALOG[size].map(([, emoji], i) => [
      `dolls/${size}_${String(i + 1).padStart(2, '0')}.png`,
      emoji,
    ]),
  ),
)

// 카탈로그 개수가 상수표(45종)와 어긋나면 개발 중에 바로 알아채도록 한다.
if (import.meta.env.DEV) {
  for (const size of SIZES) {
    if (CATALOG[size].length !== DOLL_COUNT[size]) {
      console.warn(
        `[dolls] ${size} 카탈로그 ${CATALOG[size].length}종 — 계약상 ${DOLL_COUNT[size]}종이어야 합니다.`,
      )
    }
  }
}
