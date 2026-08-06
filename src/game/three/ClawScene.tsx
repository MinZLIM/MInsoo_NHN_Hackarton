import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Physics, RigidBody, useRapier, type RapierRigidBody } from '@react-three/rapier'
import { Group, Quaternion, Vector3 } from 'three'
import { Cabinet } from './Cabinet'
import { Doll3D } from './Doll3D'
import { Claw3D } from './Claw3D'
import { Gantry, PrizeDoor } from './Gantry'
import { PrizeBurst, type PrizeBurstHandle } from './PrizeBurst'
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
} from './layout'

export type ClawPhase = 'aim' | 'descend' | 'grip' | 'ascend' | 'carry' | 'release'
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
  const { world, rapier } = useRapier()
  const clawRef = useRef<Group>(null)
  /** 집게 본체 — 인형과 조인트로 연결하려면 강체가 필요하다 */
  const clawBodyRef = useRef<RapierRigidBody>(null)
  const beamRef = useRef<Group>(null)
  const trolleyRef = useRef<Group>(null)
  const wireRef = useRef<Group>(null)
  const dollRefs = useRef<(RapierRigidBody | null)[]>([])

  const [open, setOpen] = useState(true)
  /**
   * 콜라이더는 강체보다 늦게 붙는다. 모델을 읽어 볼록 껍질을 계산해야 하기 때문이다.
   * 그 사이 인형을 그냥 두면 충돌 없이 자유낙하해 바닥을 뚫고 사라진다.
   * 준비될 때까지 고정해 두었다가 한꺼번에 물리에 맡긴다.
   */
  const [physicsReady, setPhysicsReady] = useState(false)

  // 렌더를 유발하지 않도록 진행 상태는 전부 ref에 둔다. 화면 갱신은 phase 변화 시에만.
  const phase = useRef<ClawPhase>('aim')
  const pos = useRef({ x: 0, y: CLAW.topY, z: 0 })
  const input = useRef({ x: 0, z: 0 })
  const swingDir = useRef<1 | -1>(1)
  const heldIndex = useRef<number | null>(null)
  /** 집게와 인형을 잇는 조인트. 이게 있는 동안 인형은 물리로 매달린다. */
  const jointRef = useRef<ReturnType<typeof world.createImpulseJoint> | null>(null)
  /** 이번에 잡은 집게가 버틸 수 있는 토크 — 잡을 때마다 조금씩 다르다 */
  const gripTorque = useRef(CLAW.gripTorque)
  /** 발톱이 오므라드는 데 남은 시간 */
  const gripTimer = useRef(0)
  /** 문 직후 미끄럼 판정을 미루는 시간 */
  const graceTimer = useRef(0)
  const caught = useRef(0)
  const collected = useRef(new Set<number>())
  const burstRef = useRef<PrizeBurstHandle>(null)

  const dolls = useMemo(
    () =>
      Array.from({ length: DOLL.count }, (_, i) => {
        /*
         * 바닥 전체에 2단으로 흩어 놓는다. 격자 그대로 두면 진열대처럼 보이므로
         * 칸마다 위치와 기울기를 조금씩 어긋나게 준다. 떨어지면서 서로 부딪혀
         * 실제 기계처럼 뒤엉킨 무더기가 된다.
         */
        const cols = 4
        const rows = 2
        const perLayer = cols * rows
        const layer = Math.floor(i / perLayer)
        const idx = i % perLayer
        const col = idx % cols
        const row = Math.floor(idx / cols)

        const minX = HOLE.edgeX + 0.5
        const spanX = HALF_W - 0.45 - minX
        const minZ = -HALF_D + 0.55
        const spanZ = HALF_D - 0.55 - minZ

        // 인덱스에서 뽑은 고정 난수 — 새로고침해도 같은 무더기가 나온다
        const jitter = (seed: number) => (Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453) % 1

        return {
          name: names[i % names.length] ?? '토끼',
          position: [
            minX + (spanX * (col + 0.5)) / cols + jitter(1) * 0.22,
            DOLL.radius + 0.15 + layer * 0.66,
            minZ + (spanZ * (row + 0.5)) / rows + jitter(2) * 0.3,
          ] as [number, number, number],
          // 옆으로도 기울여 둬야 착지하면서 서로 겹쳐 눕는다
          rotation: [jitter(3) * 0.9, jitter(4) * Math.PI, jitter(5) * 0.9] as [
            number,
            number,
            number,
          ],
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

  /**
   * 집게가 인형을 문다.
   *
   * 인형을 강제로 집게 위치에 붙이지 않고, 발톱이 닿은 지점에 구면 조인트를 건다.
   * 그러면 인형은 잡힌 지점을 축으로 매달려 흔들리고, 무게중심이 아래로 내려오려
   * 회전한다. 다리 끝을 물면 크게 돌아가고, 몸통을 물면 얌전히 매달린다.
   */
  const attach = (index: number) => {
    const doll = dollRefs.current[index]
    const claw = clawBodyRef.current
    if (!doll || !claw) return false

    const clawPos = claw.translation()
    const dollPos = doll.translation()

    // 발톱 끝이 닿은 지점 — 집게에서 인형 쪽으로 인형 반지름만큼 들어간 곳
    const toDoll = new Vector3(
      dollPos.x - clawPos.x,
      dollPos.y - clawPos.y,
      dollPos.z - clawPos.z,
    )
    const dist = Math.max(toDoll.length(), 0.001)
    const grabWorld = new Vector3(clawPos.x, clawPos.y, clawPos.z).addScaledVector(
      toDoll.clone().normalize(),
      Math.min(dist, DOLL.radius * 0.9),
    )

    /*
     * 집게 쪽 앵커는 집게 중심이다. 그래야 인형이 집게 바로 아래로 끌려와 매달린다.
     * 인형 쪽 앵커는 실제로 물린 지점이라, 다리를 물면 인형이 뒤집히며 몸통이
     * 그 아래로 돌아 내려온다 — 실제 인형뽑기에서 보는 그 움직임이다.
     */
    const anchorClaw = new Vector3(0, 0, 0)

    const r = doll.rotation()
    const anchorDoll = grabWorld
      .clone()
      .sub(new Vector3(dollPos.x, dollPos.y, dollPos.z))
      .applyQuaternion(new Quaternion(r.x, r.y, r.z, r.w).invert())

    jointRef.current = world.createImpulseJoint(
      rapier.JointData.spherical(anchorClaw, anchorDoll),
      claw,
      doll,
      true,
    )

    heldIndex.current = index
    graceTimer.current = CLAW.gripGraceSec
    gripTorque.current =
      CLAW.gripTorque * (1 - CLAW.gripTorqueJitter + Math.random() * CLAW.gripTorqueJitter * 2)
    return true
  }

  /** 조인트를 끊는다. 인형은 그 순간의 속도와 회전을 그대로 안고 떨어진다. */
  const detach = () => {
    if (jointRef.current) {
      world.removeImpulseJoint(jointRef.current, true)
      jointRef.current = null
    }
    heldIndex.current = null
  }

  /**
   * 잡은 지점과 무게중심이 수평으로 얼마나 어긋났는지로 버티는지 판단한다.
   *   토크 = 질량 × 중력 × 수평거리
   */
  const gripHolds = (delta: number) => {
    // 문 직후의 요동은 봐준다
    if (graceTimer.current > 0) {
      graceTimer.current -= delta
      return true
    }
    const doll = dollRefs.current[heldIndex.current!]
    const claw = clawBodyRef.current
    if (!doll || !claw) return false

    const com = doll.worldCom()
    const anchor = claw.translation()
    const lever = Math.hypot(com.x - anchor.x, com.z - anchor.z)
    const torque = doll.mass() * 9.81 * lever

    if (torque > gripTorque.current) return false
    // 흔들림으로 인한 미세한 미끄러짐
    return Math.random() >= CLAW.slipPerSec * delta
  }

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

    // 모든 인형에 콜라이더가 붙은 뒤에야 낙하를 시작한다
    if (!physicsReady) {
      const bodies = dollRefs.current.filter(Boolean)
      const ready =
        bodies.length === DOLL.count && bodies.every((b) => (b as RapierRigidBody).numColliders() > 0)
      if (ready) setPhysicsReady(true)
      return
    }

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
        if (p.y <= CLAW.bottomY || reached) {
          gripTimer.current = CLAW.gripDuration
          setPhase('grip')
        }
        break
      }

      // 발톱이 서서히 오므라드는 동안 기다렸다가, 다 닫히면 물렸는지 판정한다
      case 'grip': {
        gripTimer.current -= delta
        if (gripTimer.current > 0) break

        const target = nearestDoll()
        if (target !== null && Math.random() < CLAW.grabChance) attach(target)
        setPhase('ascend')
        break
      }

      case 'ascend': {
        if (heldIndex.current !== null && !gripHolds(delta)) detach()
        p.y += CLAW.speedY * delta
        if (p.y >= CLAW.topY) {
          p.y = CLAW.topY
          setPhase(heldIndex.current !== null ? 'carry' : 'aim')
        }
        break
      }

      case 'carry': {
        // 무게중심이 잡힌 지점에서 너무 벗어나면 옮기다가 놓친다
        if (heldIndex.current !== null && !gripHolds(delta)) {
          detach()
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
        // 조인트만 끊으면 인형은 그때의 속도·회전을 안고 그대로 떨어진다
        detach()
        p.x = CLAW_BOUNDS.minX
        setPhase('aim')
        break
      }
    }

    // 집게 강체를 움직이면 조인트로 매달린 인형이 물리적으로 딸려 온다
    clawBodyRef.current?.setNextKinematicTranslation({ x: p.x, y: p.y - 0.42, z: p.z })
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
      burstRef.current?.fire()
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
          bodyType={physicsReady ? 'dynamic' : 'kinematicPosition'}
          position={doll.position}
          rotation={doll.rotation}
          isSquashed={() => heldIndex.current === i}
          ref={(body) => {
            dollRefs.current[i] = body
          }}
        />
      ))}
      </Suspense>

      {/* 집게의 물리 몸체. 눈에 보이지는 않지만 인형과 조인트로 연결된다. */}
      <RigidBody
        ref={clawBodyRef}
        type="kinematicPosition"
        colliders={false}
        position={[0, CLAW.topY - 0.42, 0]}
      />

      <Gantry beam={beamRef} trolley={trolleyRef} wire={wireRef} />
      <Claw3D ref={clawRef} open={open} />
      <PrizeDoor x={HOLE_CENTER_X} />
      <PrizeBurst ref={burstRef} position={[HOLE_CENTER_X, 0.45, 0]} />

      {/*
       * 천장 안쪽 조명 라인.
       * 형광등 모양만 있고 실제로 빛을 내지 않으면 상자 안이 어두워 인형 색이 죽는다.
       * 등마다 앞뒤로 조명을 두 개씩 놓아 바닥까지 고르게 닿게 한다.
       */}
      {[-1, 1].map((side) => (
        <group key={side} position={[side * (HALF_W * 0.55), CABINET.height - 0.06, 0]}>
          <mesh>
            <boxGeometry args={[0.09, 0.03, CABINET.depth * 0.86]} />
            <meshBasicMaterial color="#dff0ff" />
          </mesh>
          {[-0.28, 0.28].map((offset) => (
            <pointLight
              key={offset}
              position={[0, -0.12, CABINET.depth * offset]}
              intensity={7}
              color="#e8f4ff"
              distance={5.2}
              decay={1.7}
            />
          ))}
        </group>
      ))}
      <PostFx bloom={0.65} />
    </>
  )
}
