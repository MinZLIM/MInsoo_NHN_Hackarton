import { forwardRef, useMemo } from 'react'
import { RigidBody, type RapierRigidBody } from '@react-three/rapier'
import { useGLTF } from '@react-three/drei'
import { Box3, Vector3, type Object3D } from 'three'
import { DOLL } from './layout'
import { modelLoadingManager, modelUrlFor } from './dollModels'

interface Props {
  /** 인형 이름 — 어떤 모델을 쓸지 결정한다 */
  name: string
  position: [number, number, number]
  /**
   * kinematicPosition으로 두면 물리를 무시하고 코드가 위치를 정한다.
   * 집게에 매달려 회전하는 동안 쓰고, 떨어질 때 dynamic으로 바꾼다.
   */
  bodyType?: 'dynamic' | 'kinematicPosition'
}

/** 모델마다 크기가 제각각이라 인형 지름에 맞춰 정규화한다 */
const TARGET_SIZE = DOLL.radius * 2.05

/**
 * 봉제인형 하나.
 *
 * 모델은 Kenney "Cube Pets" (CC0). 24종을 인형 45종에 매핑한다. (dollModels.ts)
 * 물리는 형태와 무관하게 ball collider 하나로 처리한다 — 인형끼리 부드럽게 굴러야 하고,
 * 정밀 충돌은 이 게임에서 이득이 없다.
 */
export const Doll3D = forwardRef<RapierRigidBody, Props>(function Doll3D(
  { name, position, bodyType = 'dynamic' },
  ref,
) {
  const url = useMemo(() => modelUrlFor(name), [name])
  const { scene } = useGLTF(url, undefined, undefined, (loader) => {
    loader.manager = modelLoadingManager
  })

  // 인스턴스마다 별도 사본이 필요하다. 원본을 그대로 쓰면 마지막 것만 보인다.
  const model = useMemo(() => {
    const clone = scene.clone(true)

    const box = new Box3().setFromObject(clone)
    const size = box.getSize(new Vector3())
    const scale = TARGET_SIZE / Math.max(size.x, size.y, size.z, 0.001)
    clone.scale.setScalar(scale)

    // 바닥이 원점에 오도록 내려 놓는다 (구 콜라이더 중심과 맞추기 위함)
    const center = box.getCenter(new Vector3()).multiplyScalar(scale)
    clone.position.set(-center.x, -center.y, -center.z)

    clone.traverse((child: Object3D) => {
      child.castShadow = true
      child.receiveShadow = true
    })
    return clone
  }, [scene])

  // 종류마다 조금씩 다른 각도로 놓여 있어야 무더기가 자연스럽다
  const rotation = useMemo(
    () => [0, (name.charCodeAt(0) % 12) * 0.5, 0] as [number, number, number],
    [name],
  )

  return (
    <RigidBody
      ref={ref}
      position={position}
      rotation={rotation}
      type={bodyType}
      colliders="ball"
      restitution={0.08}
      friction={0.95}
      linearDamping={0.4}
      angularDamping={0.75}
    >
      <primitive object={model} />
    </RigidBody>
  )
})
