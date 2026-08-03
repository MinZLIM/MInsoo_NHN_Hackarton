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

/** 인형 몸통 색 — 이모지 문자열을 해시해 종류마다 일관된 색을 준다 */
export function bodyColor(emoji: string): string {
  let hash = 0
  for (let i = 0; i < emoji.length; i++) hash = (hash * 31 + emoji.charCodeAt(i)) >>> 0
  const hue = hash % 360
  return `hsl(${hue}, 62%, 68%)`
}
