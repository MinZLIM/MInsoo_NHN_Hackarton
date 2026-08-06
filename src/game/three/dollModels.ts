/**
 * 인형 3D 모델 매핑.
 *
 * 모델: Kenney "Cube Pets" (CC0 1.0, https://kenney.nl/assets/cube-pets)
 * 24종뿐이라 인형 45종을 그대로 1:1로 덮지 못한다. 이름이 맞는 것은 정확히 연결하고,
 * 나머지는 이름을 해시해 남은 모델에 고르게 배분한다. 같은 인형은 항상 같은 모델이 나온다.
 */

import { LoadingManager } from 'three'
import colormapUrl from '@/assets/models/colormap.png?url'

/**
 * Kenney GLB는 텍스처를 파일 안에 넣지 않고 `Textures/colormap.png`를 상대경로로 참조한다.
 * 번들러가 파일명을 해시하므로 그 경로는 깨진다. 로더가 요청하는 URL을 가로채
 * 번들된 텍스처로 바꿔치기한다.
 */
export const modelLoadingManager = new LoadingManager()
modelLoadingManager.setURLModifier((url) =>
  url.includes('colormap.png') ? colormapUrl : url,
)

// Vite가 파일명을 해시해 주고 base 경로도 알아서 붙여 준다
const MODEL_URLS = import.meta.glob('/src/assets/models/*.glb', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

/** 'bunny' → 번들 URL */
const byName: Record<string, string> = Object.fromEntries(
  Object.entries(MODEL_URLS).map(([path, url]) => [
    path.split('/').pop()!.replace('.glb', ''),
    url,
  ]),
)

export const MODEL_NAMES = Object.keys(byName).sort()

/** 인형 이름이 실제 동물과 맞는 경우 — 눈으로 봤을 때 어긋나면 안 되는 것들 */
const EXACT: Record<string, string> = {
  토끼: 'bunny',
  점보토끼: 'bunny',
  펭귄: 'penguin',
  킹펭귄: 'penguin',
  병아리: 'chick',
  고양이: 'cat',
  빅캣: 'cat',
  강아지: 'dog',
  왕댕댕: 'dog',
  판다: 'panda',
  메가판다: 'panda',
  코알라: 'koala',
  여우: 'fox',
  자이언트여우: 'fox',
  사슴: 'deer',
  돼지: 'pig',
  소: 'cow',
  호랑이: 'tiger',
  사자: 'lion',
  거대곰: 'polar',
  '전설의 곰': 'polar',
  늑대: 'dog',
  너구리: 'beaver',
  다람쥐: 'beaver',
  햄스터: 'beaver',
  양: 'hog',
  상어: 'fish',
  빅샤크: 'fish',
  고래: 'fish',
  '우주 고래': 'fish',
  문어: 'crab',
  오징어: 'crab',
  거북이: 'crab',
  개구리: 'caterpillar',
  오리: 'parrot',
  유니콘: 'giraffe',
  '황금 유니콘': 'giraffe',
  드래곤: 'monkey',
  메가드래곤: 'monkey',
  '거대 드래곤': 'monkey',
  공룡: 'elephant',
  대형양: 'hog',
  로봇: 'bee',
  '전설의 로봇': 'bee',
  외계인: 'bee',
}

function hash(text: string) {
  let h = 0
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0
  return h
}

/** 인형 이름에 대응하는 모델 URL. 매칭이 없으면 이름 해시로 고르게 나눈다. */
export function modelUrlFor(dollName: string): string {
  const exact = EXACT[dollName]
  if (exact && byName[exact]) return byName[exact]
  return byName[MODEL_NAMES[hash(dollName) % MODEL_NAMES.length]]
}
