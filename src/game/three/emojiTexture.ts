import * as THREE from 'three'

/**
 * 이모지를 캔버스에 그려 텍스처로 만든다.
 * 인형 45종의 3D 모델을 확보할 수 없어, 저폴리 몸통 + 이모지 얼굴로 대체한다. (C-3)
 * 같은 이모지는 텍스처를 재사용한다 — 인형이 16개씩 생성되므로 캐시가 필요하다.
 */
const cache = new Map<string, THREE.CanvasTexture>()

export function emojiTexture(emoji: string): THREE.CanvasTexture {
  const cached = cache.get(emoji)
  if (cached) return cached

  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size

  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, size, size)
  ctx.font = `${size * 0.78}px "Segoe UI Emoji", "Apple Color Emoji", system-ui`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(emoji, size / 2, size / 2 + size * 0.04)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4

  cache.set(emoji, texture)
  return texture
}

function hashOf(emoji: string) {
  let hash = 0
  for (let i = 0; i < emoji.length; i++) hash = (hash * 31 + emoji.charCodeAt(i)) >>> 0
  return hash
}

/** 인형 몸통 색 — 이모지를 해시해 종류마다 일관된 색을 준다 */
export function bodyColor(emoji: string): string {
  return `hsl(${hashOf(emoji) % 360}, 74%, 66%)`
}

/** 귀·주둥이·발바닥에 쓰는 밝은 포인트 색 */
export function accentColor(emoji: string): string {
  return `hsl(${(hashOf(emoji) + 24) % 360}, 68%, 84%)`
}

/**
 * 인형 목에 다는 이름표.
 * 같은 모델을 쓰는 인형이라도 이름이 적혀 있으면 확실히 구분된다.
 */
const tagCache = new Map<string, THREE.CanvasTexture>()

export function nameTagTexture(name: string, bg: string): THREE.CanvasTexture {
  const key = `${name}|${bg}`
  const cached = tagCache.get(key)
  if (cached) return cached

  const w = 256
  const h = 160
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!

  ctx.fillStyle = bg
  ctx.fillRect(0, 0, w, h)
  ctx.strokeStyle = 'rgba(0,0,0,0.28)'
  ctx.lineWidth = 10
  ctx.strokeRect(5, 5, w - 10, h - 10)

  ctx.fillStyle = '#2b2348'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  // 이름이 길면 줄여 넣는다
  const size = name.length > 4 ? 44 : 60
  ctx.font = `bold ${size}px 'Pretendard Variable', system-ui`
  ctx.fillText(name, w / 2, h / 2 + 4)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  tagCache.set(key, texture)
  return texture
}
