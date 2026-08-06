import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Physics, type RapierRigidBody } from '@react-three/rapier'
import { Group } from 'three'
import { Cabinet } from './Cabinet'
import { Doll3D } from './Doll3D'
import { Claw3D } from './Claw3D'
import { Gantry, PrizeDoor } from './Gantry'
import { marqueeTexture } from './signTexture'
import { GroundShadows, PostFx, SceneLighting } from './SceneQuality'
import {
  CABINET,
  CLAW,
  CLAW_BOUNDS,
  DOLL,
  FALL_THRESHOLD,
  GANTRY,
  HALF_D,
  HALF_W,
  HOLE_CENTER_X,
  HOLE,
  MARQUEE,
} from './layout'

export type ClawPhase = 'aim' | 'descend' | 'grab' | 'ascend' | 'carry' | 'release'
export type ClawControl = 'manual' | 'swing'

export interface ClawSceneHandle {
  /** 조이스틱 입력. 각 축 -1 ~ 1 (아날로그) */
  move: (x: number, z: number) => void
  drop: () => void
}

interface Props {
  /** 기계에 넣을 인형 이름 목록 */
  names: string[]
  control: ClawControl
  onCatch: (total: number) => void
  onPhaseChange: (phase: ClawPhase) => void
  /** 조작 핸들을 바깥(HUD 버튼)으로 넘긴다 */
  onReady: (handle: ClawSceneHandle) => void
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

/**
 * 3D 인형뽑기 씬. 2D판과 동일한 상태 머신을 3차원으로 옮겼다.
 * aim(x·z 조준) → descend → grab → ascend → carry(투입구로) → release → aim
 */
export function ClawScene(props: Props) {
  return (
    <Physics gravity={[0, -9.81, 0]}>
      <SceneContent {...props} />
    </Physics>
  )
}

function SceneContent({
  names,
  control,
  onCatch,
  onPhaseChange,
  onReady,
}: Props) {
  const clawRef = useRef<Group>(null)
  const beamRef = useRef<Group>(null)
  const trolleyRef = useRef<Group>(null)
  const wireRef = useRef<Group>(null)
  const dollRefs = useRef<(RapierRigidBody | null)[]>([])

  const [open, setOpen] = useState(true)

  // 렌더를 유발하지 않도록 진행 상태는 전부 ref에 둔다. 화면 갱신은 phase 변화 시에만.
  const phase = useRef<ClawPhase>('aim')
  const pos = useRef({ x: 0, y: CLAW.topY, z: 0 })
  const input = useRef({ x: 0, z: 0 })
  const swingDir = useRef<1 | -1>(1)
  const heldIndex = useRef<number | null>(null)
  const caught = useRef(0)
  const collected = useRef(new Set<number>())

  const dolls = useMemo(
    () =>
      Array.from({ length: DOLL.count }, (_, i) => {
        // 턱 오른쪽 영역에 2단으로 쌓는다. 떨어지면서 자연스럽게 무더기가 된다.
        const cols = 4
        const perLayer = cols * 2
        const layer = Math.floor(i / perLayer)
        const idx = i % perLayer
        const col = idx % cols
        const row = Math.floor(idx / cols)
        return {
          name: names[i % names.length] ?? '토끼',
          position: [
            HOLE.edgeX + 0.62 + col * 0.66 + (row % 2) * 0.2 + layer * 0.12,
            DOLL.radius + 0.1 + layer * 0.62,
            -HALF_D + 0.85 + row * 0.75,
          ] as [number, number, number],
        }
      }),
    [names],
  )

  const setPhase = (next: ClawPhase) => {
    phase.current = next
    onPhaseChange(next)
    setOpen(next === 'aim' || next === 'descend')
  }

  useEffect(() => {
    onReady({
      move: (x, z) => {
        if (phase.current === 'aim') input.current = { x, z }
      },
      drop: () => {
        if (phase.current !== 'aim') return
        input.current = { x: 0, z: 0 }
        setPhase('descend')
      },
    })
    // onReady는 부모에서 고정된 함수를 넘긴다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** 집게 끝에서 grabRadius 안에 있는 가장 가까운 인형 */
  const nearestDoll = (): number | null => {
    let best: number | null = null
    let bestDist = CLAW.grabRadius

    dollRefs.current.forEach((body, i) => {
      if (!body || collected.current.has(i)) return
      const t = body.translation()
      const dist = Math.hypot(
        t.x - pos.current.x,
        t.y - (pos.current.y - 0.28),
        t.z - pos.current.z,
      )
      if (dist < bestDist) {
        bestDist = dist
        best = i
      }
    })
    return best
  }

  useFrame((_, rawDelta) => {
    // 탭 전환 등으로 프레임이 크게 튀면 물리가 깨지므로 상한을 둔다
    const delta = Math.min(rawDelta, 1 / 30)
    const p = pos.current

    switch (phase.current) {
      case 'aim': {
        if (control === 'swing') {
          const next = p.x + swingDir.current * CLAW.speedXZ * 1.35 * delta
          if (next <= CLAW_BOUNDS.minX || next >= CLAW_BOUNDS.maxX) {
            swingDir.current = swingDir.current === 1 ? -1 : 1
          }
          p.x = clamp(next, CLAW_BOUNDS.minX, CLAW_BOUNDS.maxX)
        } else {
          p.x = clamp(
            p.x + input.current.x * CLAW.speedXZ * delta,
            CLAW_BOUNDS.minX,
            CLAW_BOUNDS.maxX,
          )
        }
        p.z = clamp(
          p.z + input.current.z * CLAW.speedXZ * delta,
          CLAW_BOUNDS.minZ,
          CLAW_BOUNDS.maxZ,
        )
        break
      }

      case 'descend': {
        p.y -= CLAW.speedY * delta
        const target = nearestDoll()
        const reached =
          target !== null &&
          (dollRefs.current[target]?.translation().y ?? 0) >= p.y - 0.34
        if (p.y <= CLAW.bottomY || reached) setPhase('grab')
        break
      }

      case 'grab': {
        const target = nearestDoll()
        if (target !== null && Math.random() < CLAW.grabChance) {
          heldIndex.current = target
          // 잡은 인형은 물리 대신 집게를 따라오게 한다
          dollRefs.current[target]?.setBodyType(2, true)
        }
        setPhase('ascend')
        break
      }

      case 'ascend': {
        if (heldIndex.current !== null && Math.random() < CLAW.slipPerSec * delta) {
          dollRefs.current[heldIndex.current]?.setBodyType(0, true)
          heldIndex.current = null
        }
        p.y += CLAW.speedY * delta
        if (p.y >= CLAW.topY) {
          p.y = CLAW.topY
          setPhase(heldIndex.current !== null ? 'carry' : 'aim')
        }
        break
      }

      case 'carry': {
        // 실제 기계처럼 옮기는 도중에 놓칠 수 있다
        if (heldIndex.current !== null && Math.random() < CLAW.slipPerSec * delta) {
          const idx = heldIndex.current
          dollRefs.current[idx]?.setBodyType(0, true)
          heldIndex.current = null
          setPhase('aim')
          break
        }

        const dx = HOLE_CENTER_X - p.x
        const dz = 0 - p.z
        const dist = Math.hypot(dx, dz)
        if (dist <= CLAW.carrySpeed * delta) {
          p.x = HOLE_CENTER_X
          p.z = 0
          setPhase('release')
        } else {
          p.x += (dx / dist) * CLAW.carrySpeed * delta
          p.z += (dz / dist) * CLAW.carrySpeed * delta
        }
        break
      }

      case 'release': {
        const idx = heldIndex.current
        if (idx !== null) {
          const body = dollRefs.current[idx]
          // 동적 물체로 되돌리면 그대로 투입구 아래로 떨어진다
          body?.setBodyType(0, true)
          body?.setLinvel({ x: 0, y: 0, z: 0 }, true)
          heldIndex.current = null
        }
        p.x = CLAW_BOUNDS.minX
        setPhase('aim')
        break
      }
    }

    // 잡고 있는 인형을 집게에 붙여 옮긴다
    const held = heldIndex.current
    if (held !== null) {
      dollRefs.current[held]?.setNextKinematicTranslation({
        x: p.x,
        y: p.y - 0.42,
        z: p.z,
      })
    }

    if (clawRef.current) clawRef.current.position.set(p.x, p.y, p.z)

    // 크로스빔은 앞뒤로, 트롤리는 좌우로, 와이어는 그 사이를 잇는다
    if (beamRef.current) beamRef.current.position.z = p.z
    if (trolleyRef.current) trolleyRef.current.position.set(p.x, 0, p.z)
    if (wireRef.current) {
      const len = Math.max(0.02, GANTRY.railY - 0.13 - p.y)
      wireRef.current.position.set(p.x, p.y + len / 2, p.z)
      wireRef.current.scale.y = len
    }

    // 투입구로 빠진 인형을 획득 처리
    dollRefs.current.forEach((body, i) => {
      if (!body || collected.current.has(i)) return
      if (body.translation().y > FALL_THRESHOLD) return
      collected.current.add(i)
      caught.current += 1
      onCatch(caught.current)
    })
  })

  return (
    <>
      <SceneLighting />
      <Cabinet />
      <GroundShadows y={0.015} scale={8} />

      <Suspense fallback={null}>
      {dolls.map((doll, i) => (
        <Doll3D
          key={i}
          name={doll.name}
          position={doll.position}
          ref={(body) => {
            dollRefs.current[i] = body
          }}
        />
      ))}
      </Suspense>

      <Gantry beam={beamRef} trolley={trolleyRef} wire={wireRef} />
      <Claw3D ref={clawRef} open={open} />
      <PrizeDoor x={HOLE_CENTER_X} />

      {/* 상단 간판 */}
      <mesh position={[0, MARQUEE.y, HALF_D * 0.2]}>
        <boxGeometry args={[MARQUEE.width, MARQUEE.height, 0.14]} />
        <meshStandardMaterial color="#241c4a" roughness={0.7} />
      </mesh>
      <mesh position={[0, MARQUEE.y, HALF_D * 0.2 + 0.08]}>
        <planeGeometry args={[MARQUEE.width - 0.12, MARQUEE.height - 0.1]} />
        <meshBasicMaterial map={marqueeTexture()} toneMapped={false} />
      </mesh>
      {/* 간판을 비추는 빛 */}
      <pointLight
        position={[0, MARQUEE.y - 0.5, HALF_D * 0.2 + 0.9]}
        intensity={14}
        color="#ff9ae0"
        distance={5}
      />

      {/* 천장 안쪽 조명 라인 */}
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[side * (HALF_W * 0.55), CABINET.height - 0.06, 0]}
        >
          <boxGeometry args={[0.09, 0.03, CABINET.depth * 0.86]} />
          <meshBasicMaterial color="#dff0ff" />
        </mesh>
      ))}
      <PostFx bloom={0.65} />
    </>
  )
}
