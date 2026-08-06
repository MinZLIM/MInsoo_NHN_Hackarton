import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, Color, Group, Mesh, MeshBasicMaterial } from 'three'

const COUNT = 22
const LIFE = 1.1
const COLORS = ['#ffd76a', '#7ee8ff', '#ff9ad5', '#ffffff']

export interface PrizeBurstHandle {
  /** 인형이 배출구로 빠진 순간 호출한다 */
  fire: () => void
}

interface Props {
  /** 배출구 위치 */
  position: [number, number, number]
}

/**
 * 획득 연출.
 *
 * 인형이 배출구로 떨어지면 그 자리에서 반짝이가 튀어 오른다.
 * 화면에서 인형이 사라지기만 하면 뽑은 건지 놓친 건지 헷갈린다.
 *
 * 리렌더 없이 ref로 터뜨린다. 획득 때마다 씬을 다시 그리면 물리 강체에
 * 초기 위치가 다시 적용돼 남은 인형들이 제자리로 튕겨 간다.
 */
export const PrizeBurst = forwardRef<PrizeBurstHandle, Props>(function PrizeBurst(
  { position },
  ref,
) {
  const group = useRef<Group>(null)
  const life = useRef(0)

  /** 입자마다 고정된 초기 속도 — 매번 같은 모양이어도 눈에 띄지 않는다 */
  const seeds = useMemo(
    () =>
      Array.from({ length: COUNT }, (_, i) => {
        const angle = (i / COUNT) * Math.PI * 2
        const spread = 0.55 + ((i * 37) % 10) / 22
        return {
          vx: Math.cos(angle) * spread,
          vy: 1.9 + ((i * 53) % 11) / 9,
          vz: Math.sin(angle) * spread,
          size: 0.035 + ((i * 29) % 7) / 220,
          color: COLORS[i % COLORS.length],
        }
      }),
    [],
  )

  useImperativeHandle(ref, () => ({
    fire: () => {
      life.current = LIFE
    },
  }))

  useFrame((_, rawDelta) => {
    const g = group.current
    if (!g) return

    if (life.current <= 0) {
      if (g.visible) g.visible = false
      return
    }

    g.visible = true
    life.current -= Math.min(rawDelta, 1 / 30)
    const t = Math.max(0, LIFE - life.current)
    const fade = Math.max(0, life.current / LIFE)

    g.children.forEach((child, i) => {
      const seed = seeds[i]
      child.position.set(
        seed.vx * t,
        seed.vy * t - 4.2 * t * t, // 위로 튀었다가 중력에 떨어진다
        seed.vz * t,
      )
      child.scale.setScalar(fade)
      const material = (child as Mesh).material as MeshBasicMaterial
      material.opacity = fade
    })
  })

  return (
    <group ref={group} position={position} visible={false}>
      {seeds.map((seed, i) => (
        <mesh key={i}>
          <sphereGeometry args={[seed.size, 6, 6]} />
          <meshBasicMaterial
            color={new Color(seed.color)}
            transparent
            blending={AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  )
})
