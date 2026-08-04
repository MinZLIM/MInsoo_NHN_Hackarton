import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Physics, type RapierRigidBody } from '@react-three/rapier'
import { Group, Mesh } from 'three'
import { Cabinet } from './Cabinet'
import { Doll3D } from './Doll3D'
import { GroundShadows, PostFx, SceneLighting } from './SceneQuality'
import { CLIP } from './layout'

export type ClipPhase = 'ready' | 'pressing' | 'lifting'

export interface ClipSceneHandle {
  press: () => void
}

interface Props {
  emojis: string[]
  onCatch: (total: number) => void
  onPhaseChange: (phase: ClipPhase) => void
  /** 성공/실패 판정 직후 한 번 호출된다 (연출용) */
  onVerdict: (hit: boolean) => void
  onReady: (handle: ClipSceneHandle) => void
}

/** 각도 차이를 -π ~ π 로 정규화 */
function angleDiff(a: number, b: number) {
  let d = (a - b) % (Math.PI * 2)
  if (d > Math.PI) d -= Math.PI * 2
  if (d < -Math.PI) d += Math.PI * 2
  return d
}

/**
 * 중형 — 빨래집게 인형뽑기 (F2-8).
 *
 * 수평으로 도는 원판 가장자리에 빨래집게가 달려 있고, 집게마다 인형이 물려 있다.
 * 버튼을 누르면 상단 바가 내려오고, 그 순간 누름 위치에 집게가 와 있으면
 * 집게가 열려 인형이 떨어진다. 어긋나면 바는 허공을 짚고 그대로 올라온다.
 */
export function ClipScene(props: Props) {
  return (
    <Physics gravity={[0, -9.81, 0]}>
      <SceneContent {...props} />
    </Physics>
  )
}

function SceneContent({ emojis, onCatch, onPhaseChange, onVerdict, onReady }: Props) {
  const carouselRef = useRef<Group>(null)
  const barRef = useRef<Mesh>(null)
  const clipRefs = useRef<(Group | null)[]>([])
  const dollRefs = useRef<(RapierRigidBody | null)[]>([])

  const [releasedIds, setReleasedIds] = useState<number[]>([])

  const spin = useRef(0)
  const phase = useRef<ClipPhase>('ready')
  const barY = useRef<number>(CLIP.barTopY)
  const released = useRef(new Set<number>())
  const caught = useRef(0)

  const slots = useMemo(
    () =>
      Array.from({ length: CLIP.slots }, (_, i) => {
        const baseAngle = (i / CLIP.slots) * Math.PI * 2
        return {
          baseAngle,
          emoji: emojis[i % emojis.length] ?? '🧸',
          // 최초 1회만 쓰는 생성 위치. 이후 위치는 useFrame이 정한다.
          spawn: [
            Math.cos(baseAngle) * CLIP.armRadius,
            CLIP.dollY,
            Math.sin(baseAngle) * CLIP.armRadius,
          ] as [number, number, number],
        }
      }),
    [emojis],
  )

  const setPhase = (next: ClipPhase) => {
    phase.current = next
    onPhaseChange(next)
  }

  useEffect(() => {
    onReady({
      press: () => {
        if (phase.current !== 'ready') return
        setPhase('pressing')
      },
    })
    // onReady는 부모에서 고정된 함수를 넘긴다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** 원판이 rotation만큼 돌았을 때 i번 집게의 월드 각도 */
  const worldAngle = (i: number) => slots[i].baseAngle - spin.current

  const slotPosition = (i: number): [number, number, number] => {
    const a = worldAngle(i)
    return [Math.cos(a) * CLIP.armRadius, CLIP.dollY, Math.sin(a) * CLIP.armRadius]
  }

  /** 바가 집게 높이에 닿는 순간의 판정 */
  const judge = () => {
    let target = -1
    let best: number = CLIP.toleranceRad

    slots.forEach((_, i) => {
      if (released.current.has(i)) return
      const diff = Math.abs(angleDiff(worldAngle(i), CLIP.triggerAngle))
      if (diff < best) {
        best = diff
        target = i
      }
    })

    if (target < 0) {
      onVerdict(false)
      return
    }

    // 집게가 열리고 인형이 떨어진다 — 열린 순간 획득으로 친다
    released.current.add(target)
    setReleasedIds((prev) => [...prev, target])

    const body = dollRefs.current[target]
    body?.setBodyType(0, true)
    body?.setLinvel({ x: 0, y: 0, z: 0 }, true)

    caught.current += 1
    onCatch(caught.current)
    onVerdict(true)
  }

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 1 / 30)

    spin.current += CLIP.spinSpeed * delta
    if (carouselRef.current) carouselRef.current.rotation.y = spin.current

    // 아직 매달려 있는 인형은 집게를 따라 돈다
    slots.forEach((_, i) => {
      if (released.current.has(i)) return
      const [x, y, z] = slotPosition(i)
      dollRefs.current[i]?.setNextKinematicTranslation({ x, y, z })
    })

    switch (phase.current) {
      case 'pressing':
        barY.current -= CLIP.barDownSpeed * delta
        if (barY.current <= CLIP.barPressY) {
          barY.current = CLIP.barPressY
          judge()
          setPhase('lifting')
        }
        break

      case 'lifting':
        barY.current += CLIP.barUpSpeed * delta
        if (barY.current >= CLIP.barTopY) {
          barY.current = CLIP.barTopY
          setPhase('ready')
        }
        break
    }

    if (barRef.current) barRef.current.position.y = barY.current + 0.35
  })

  const triggerX = Math.cos(CLIP.triggerAngle) * CLIP.armRadius
  const triggerZ = Math.sin(CLIP.triggerAngle) * CLIP.armRadius

  return (
    <>
      <SceneLighting />
      <Cabinet />
      <GroundShadows y={0.015} scale={8} />

      {/* 천장에서 내려온 회전축 */}
      <mesh position={[0, CLIP.discY + 0.55, 0]}>
        <cylinderGeometry args={[0.07, 0.07, 1.1, 12]} />
        <meshStandardMaterial color="#9a94c4" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* 회전 원판 + 집게 */}
      <group ref={carouselRef} position={[0, 0, 0]}>
        <mesh position={[0, CLIP.discY, 0]} castShadow receiveShadow>
          <cylinderGeometry
            args={[CLIP.discRadius, CLIP.discRadius * 0.94, CLIP.discThickness, 40]}
          />
          <meshStandardMaterial color="#6a5fb0" metalness={0.45} roughness={0.35} />
        </mesh>
        {/* 원판 테두리 네온 */}
        <mesh position={[0, CLIP.discY - CLIP.discThickness / 2 - 0.01, 0]}>
          <torusGeometry args={[CLIP.discRadius, 0.022, 8, 48]} />
          <meshBasicMaterial color="#c9b4ff" />
        </mesh>

        {slots.map((slot, i) => {
          const a = slot.baseAngle
          const x = Math.cos(a) * CLIP.armRadius
          const z = Math.sin(a) * CLIP.armRadius
          return (
            <group
              key={i}
              ref={(g) => {
                clipRefs.current[i] = g
              }}
              position={[x, CLIP.clipY, z]}
              rotation={[0, -a, 0]}
            >
              <Clothespin open={releasedIds.includes(i)} />
            </group>
          )
        })}
      </group>

      {/*
        매달려 있는 동안은 코드가 위치를 정하고(kinematic), 집게가 열리면 물리에 맡긴다.
        position은 생성 시점 값으로 고정한다 — 리렌더마다 새 값을 주면
        이미 떨어진 인형이 원래 자리로 되돌아가 잔상처럼 남는다.
      */}
      {slots.map((slot, i) => (
        <Doll3D
          key={i}
          emoji={slot.emoji}
          bodyType={releasedIds.includes(i) ? 'dynamic' : 'kinematicPosition'}
          position={slot.spawn}
          ref={(body) => {
            dollRefs.current[i] = body
          }}
        />
      ))}

      {/* 누름 바 — 정면 한 자리에서만 오르내린다 */}
      <group position={[triggerX, 0, triggerZ]}>
        {/* 바가 지나가는 가이드 레일 */}
        <mesh position={[0, CLIP.barTopY + 0.5, 0]}>
          <boxGeometry args={[0.34, 0.9, 0.34]} />
          <meshStandardMaterial color="#4a4478" metalness={0.5} roughness={0.4} />
        </mesh>

        <mesh ref={barRef} position={[0, CLIP.barTopY + 0.35, 0]} castShadow>
          <boxGeometry args={[0.26, 0.7, 0.26]} />
          <meshStandardMaterial
            color="#f2f0ff"
            metalness={0.1}
            roughness={0.25}
            emissive="#6a5fff"
            emissiveIntensity={0.25}
          />
        </mesh>

        {/* 눌리는 지점 — 집게가 이 고리를 지날 때 눌러야 한다 */}
        <mesh position={[0, CLIP.clipY + 0.12, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.3, 0.4, 28]} />
          <meshBasicMaterial color="#f0bb52" transparent opacity={0.9} />
        </mesh>
        {/* 아래로 떨어지는 표시 빛 */}
        <mesh position={[0, (CLIP.clipY + 0.12 + 0.5) / 2, 0]}>
          <cylinderGeometry args={[0.3, 0.34, CLIP.clipY + 0.12 - 0.5, 20, 1, true]} />
          <meshBasicMaterial color="#f0bb52" transparent opacity={0.12} side={2} />
        </mesh>
      </group>

      <PostFx bloom={0.7} />
    </>
  )
}

/** 빨래집게 — 열리면 집게 다리가 벌어진다 */
function Clothespin({ open }: { open: boolean }) {
  const spread = open ? 0.42 : 0.09

  return (
    <group>
      {/* 집게 다리 두 짝 */}
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[0, -0.02, side * 0.05]}
          rotation={[side * spread, 0, 0]}
          castShadow
        >
          <boxGeometry args={[0.1, 0.42, 0.055]} />
          <meshStandardMaterial color={side < 0 ? '#ffd7e6' : '#d7e6ff'} roughness={0.55} />
        </mesh>
      ))}
      {/* 스프링 */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.06, 0.018, 6, 14]} />
        <meshStandardMaterial color="#c9c4e6" metalness={0.8} roughness={0.25} />
      </mesh>
    </group>
  )
}
