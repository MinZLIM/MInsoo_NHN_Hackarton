import { forwardRef, useCallback, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { ConvexHullCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier'
import type { Group } from 'three'
import { DOLL, DOLL_MATERIAL } from './layout'
import { useDollModel } from './useDollModel'
import type { DollSize } from '@/types/api'

interface Props {
  /** 인형 이름 — 어떤 모델을 쓸지, 어떤 장식을 달지 결정한다 */
  name: string
  /** 크기별로 질량·마찰·무게중심이 다르다 */
  size?: DollSize
  position: [number, number, number]
  /** 놓이는 자세. 주지 않으면 이름에서 뽑은 각도로 세워 둔다. */
  rotation?: [number, number, number]
  /**
   * kinematicPosition으로 두면 물리를 무시하고 코드가 위치를 정한다.
   * 집게에 매달려 회전하는 동안 쓰고, 떨어질 때 dynamic으로 바꾼다.
   */
  bodyType?: 'dynamic' | 'kinematicPosition'
  /**
   * 지금 집게에 물려 있는지 알려준다. 물린 동안 봉제인형처럼 눌린다.
   *
   * 상태가 아니라 함수로 받는다. 물릴 때마다 리렌더가 나면 RigidBody에
   * position·rotation이 다시 적용돼 인형이 원래 자리로 끌려간다.
   */
  isSquashed?: () => boolean
}

/**
 * 봉제인형 하나.
 *
 * 몸통은 Kenney "Cube Pets" (CC0) 모델을 쓰고, 그 위에 솔기·배 무늬·목장식·이름표를
 * 얹는다. 모델이 24종뿐이라 장식이 없으면 45종이 서로 구분되지 않는다.
 *
 * 충돌은 몸통 모델에서만 만든다. 장식(왕관·리본)까지 자동 콜라이더에 들어가면
 * 실제보다 큰 덩어리로 부딪히므로, 정점을 직접 모아 볼록 껍질을 만든다.
 */
export const Doll3D = forwardRef<RapierRigidBody, Props>(function Doll3D(
  { name, size = 'small', position, rotation: rotationProp, bodyType = 'dynamic', isSquashed },
  ref,
) {
  const mat = DOLL_MATERIAL[size]
  // 구 근사 관성모멘트 — 인형이 너무 쉽게/어렵게 돌지 않도록 질량·크기에 맞춘다
  const inertia = 0.4 * mat.mass * DOLL.radius ** 2

  const { model, hull, dress } = useDollModel(name, size)

  // 종류마다 조금씩 다른 각도로 놓여 있어야 무더기가 자연스럽다
  const rotation = useMemo(
    () => rotationProp ?? ([0, (name.charCodeAt(0) % 12) * 0.5, 0] as [number, number, number]),
    [name, rotationProp],
  )

  /*
   * 집게가 물면 봉제인형은 눌린다.
   * 콜라이더는 그대로 두고 보이는 부분만 찌그러뜨린다 — 물리 형상까지 바꾸면
   * 잡은 순간 관통이 생기고 무게중심 계산도 흔들린다.
   */
  const skinRef = useRef<Group>(null)
  const squash = useRef(0)

  useFrame((_, rawDelta) => {
    const skin = skinRef.current
    if (!skin) return
    const held = isSquashed?.() ?? false
    const target = held ? 1 : 0
    if (Math.abs(target - squash.current) < 0.002) return

    const delta = Math.min(rawDelta, 1 / 30)
    // 물릴 때는 빠르게 눌리고, 놓으면 천천히 돌아온다
    squash.current += (target - squash.current) * Math.min(1, (held ? 14 : 6) * delta)

    const s = squash.current
    skin.scale.set(1 + s * 0.14, 1 - s * 0.2, 1 + s * 0.14)
  })

  /**
   * 질량과 무게중심은 prop으로 주면 콜라이더 밀도에 밀려 무시된다.
   * 강체가 만들어진 직후에 직접 지정해야 확실히 적용된다.
   */
  const setBody = useCallback(
    (body: RapierRigidBody | null) => {
      if (body) {
        body.setAdditionalMassProperties(
          mat.mass,
          { x: 0, y: mat.comY, z: 0 },
          { x: inertia, y: inertia, z: inertia },
          { x: 0, y: 0, z: 0, w: 1 },
          true,
        )
      }
      if (typeof ref === 'function') ref(body)
      else if (ref) ref.current = body
    },
    [ref, mat, inertia],
  )

  return (
    <RigidBody
      ref={setBody}
      position={position}
      rotation={rotation}
      type={bodyType}
      colliders={false}
      linearDamping={mat.linearDamping}
      angularDamping={mat.angularDamping}
    >
      <ConvexHullCollider
        args={[hull]}
        friction={mat.friction}
        restitution={mat.restitution}
        density={0}
      />

      <group ref={skinRef}>
        <primitive object={model} />
        <primitive object={dress} />
      </group>
    </RigidBody>
  )
})
