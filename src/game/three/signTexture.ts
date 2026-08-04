import * as THREE from 'three'

let cached: THREE.CanvasTexture | null = null

/** 기계 위에 얹는 간판. 네온 테두리 안에 상호가 들어간다. */
export function marqueeTexture(): THREE.CanvasTexture {
  if (cached) return cached

  const w = 1024
  const h = 220
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!

  const bg = ctx.createLinearGradient(0, 0, 0, h)
  bg.addColorStop(0, '#3a2170')
  bg.addColorStop(1, '#1b1038')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, w, h)

  // 네온 테두리
  ctx.strokeStyle = '#ff7ad9'
  ctx.lineWidth = 9
  ctx.shadowColor = '#ff7ad9'
  ctx.shadowBlur = 26
  ctx.strokeRect(16, 16, w - 32, h - 32)

  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  ctx.shadowColor = '#ffd9f4'
  ctx.shadowBlur = 30
  ctx.fillStyle = '#fff2fb'
  ctx.font = 'bold 96px "Pretendard Variable", system-ui'
  ctx.fillText('인형뽑기', w / 2, h / 2 - 18)

  ctx.shadowBlur = 14
  ctx.shadowColor = '#8fd4ff'
  ctx.fillStyle = '#bfe6ff'
  ctx.font = 'bold 40px system-ui'
  ctx.fillText('CLAW  MACHINE', w / 2, h / 2 + 56)

  // 양옆 전구
  ctx.shadowBlur = 18
  ctx.shadowColor = '#ffe9a8'
  ctx.fillStyle = '#ffe9a8'
  for (let i = 0; i < 6; i++) {
    const y = 46 + i * 26
    ctx.beginPath()
    ctx.arc(52, y, 7, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(w - 52, y, 7, 0, Math.PI * 2)
    ctx.fill()
  }

  cached = new THREE.CanvasTexture(canvas)
  cached.colorSpace = THREE.SRGBColorSpace
  cached.anisotropy = 4
  return cached
}
