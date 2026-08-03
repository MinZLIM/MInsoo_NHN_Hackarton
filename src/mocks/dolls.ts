import type { DollSize } from '@/types/api'
import { DOLL_COUNT, SELL_PRICE } from '@/lib/constants'

export interface MockDoll {
  id: number
  name: string
  size: DollSize
  image_path: string
  sell_price: number
}

const NAMES: Record<DollSize, string[]> = {
  small: [
    '토끼', '펭귄', '병아리', '고양이', '강아지', '햄스터', '개구리', '오리', '다람쥐', '너구리',
    '판다', '코알라', '여우', '늑대', '사슴', '양', '돼지', '소', '호랑이', '사자',
    '문어', '상어', '고래', '거북이', '해파리', '유니콘', '드래곤', '공룡', '로봇', '외계인',
  ],
  medium: [
    '거대곰', '킹펭귄', '점보토끼', '빅캣', '왕댕댕', '메가판다', '자이언트여우', '대형양',
    '빅샤크', '메가드래곤',
  ],
  large: ['전설의 곰', '황금 유니콘', '거대 드래곤', '우주 고래', '전설의 로봇'],
}

/** BE의 dolls 시드 45종을 흉내낸 마스터 데이터 (docs/SCHEMA.md §2.2) */
export const MOCK_DOLLS: MockDoll[] = (['small', 'medium', 'large'] as DollSize[]).flatMap(
  (size, sizeIndex) =>
    Array.from({ length: DOLL_COUNT[size] }, (_, i) => ({
      id: sizeIndex * 100 + i + 1,
      name: NAMES[size][i],
      size,
      image_path: `dolls/${size}_${String(i + 1).padStart(2, '0')}.png`,
      sell_price: SELL_PRICE[size],
    })),
)
