import { forwardRef, useCallback, useMemo } from 'react'
import { RigidBody, type RapierRigidBody } from '@react-three/rapier'
import { useGLTF } from '@react-three/drei'
import { Box3, Mesh, MeshStandardMaterial, Vector3, type Object3D } from 'three'
import { DOLL, DOLL_MATERIAL } from './layout'
import { dollLook, modelLoadingManager, modelUrlFor } from './dollModels'

interface Props {
  /** 인형 이름 — 어떤 모델을 쓸지 결정한다 */
  name: string
  /** 크기별로 질량·마찰·무게중심이 다르다 */
  size?: keyof typeof DOLL_MATERIAL
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
  { name, size = 'small', position, bodyType = 'dynamic' },
  ref,
) {
  const mat = DOLL_MATERIAL[size]
  // 구 근사 관성모멘트 — 인형이 너무 쉽게/어렵게 돌지 않도록 질량·크기에 맞춘다
  const inertia = 0.4 * mat.mass * DOLL.radius ** 2

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
  const url = useMemo(() => modelUrlFor(name), [name])
  const { scene } = useGLTF(url, undefined, undefined, (loader) => {
    loader.manager = modelLoadingManager
  })

  // 인스턴스마다 별도 사본이 필요하다. 원본을 그대로 쓰면 마지막 것만 보인다.
  const look = useMemo(() => dollLook(name), [name])

  const { model, ribbonY, ribbonR } = useMemo(() => {
    const clone = scene.clone(true)

    const box = new Box3().setFromObject(clone)
    const size = box.getSize(new Vector3())
    const scale = (TARGET_SIZE * look.scale) / Math.max(size.x, size.y, size.z, 0.001)
    clone.scale.setScalar(scale)

    // 바닥이 원점에 오도록 내려 놓는다 (구 콜라이더 중심과 맞추기 위함)
    const center = box.getCenter(new Vector3()).multiplyScalar(scale)
    clone.position.set(-center.x, -center.y, -center.z)

    clone.traverse((child: Object3D) => {
      child.castShadow = true
      child.receiveShadow = true
      // 봉제인형은 빛을 되쏘지 않는다. 금속기를 빼고 거칠게 둬야 천처럼 보인다.
      const mesh = child as Mesh
      const mat = mesh.material as MeshStandardMaterial | undefined
      if (mat && 'roughness' in mat) {
        mat.roughness = 0.95
        mat.metalness = 0
      }
    })

    return {
      model: clone,
      // 목도리는 몸통 위쪽 1/3 지점에 두른다
      ribbonY: size.y * scale * 0.12,
      ribbonR: Math.max(size.x, size.z) * scale * 0.42,
    }
  }, [scene, look.scale])

  // 종류마다 조금씩 다른 각도로 놓여 있어야 무더기가 자연스럽다
  const rotation = useMemo(
    () => [0, (name.charCodeAt(0) % 12) * 0.5, 0] as [number, number, number],
    [name],
  )

  return (
    <RigidBody
      ref={setBody}
      position={position}
      rotation={rotation}
      type={bodyType}
      /*
       * 공이 아니라 모델의 볼록 껍질을 쓴다. 구로 두면 인형이 구슬처럼 굴러다니고
       * 쌓이지 않는다. 껍질이면 실제 형태대로 걸리고 기울고 포개진다.
       */
      colliders="hull"
      /*
       * 무게중심을 기하 중심보다 낮게 준다. 집게에 다리 끝이 물리면 무게중심이
       * 잡힌 지점 아래로 돌아 내려오면서 인형이 회전한다 — 실제 인형뽑기의 그 장면이다.
       * mass / centerOfMass / 관성모멘트는 massProperties로 함께 줘야 적용된다.
       */
      /* 콜라이더 밀도로 질량이 정해지지 않게 0으로 두고, 아래에서 직접 지정한다 */
      density={0}
      friction={mat.friction}
      restitution={mat.restitution}
      linearDamping={mat.linearDamping}
      angularDamping={mat.angularDamping}
    >
      <primitive object={model} />

      {/* 목도리와 이름표 — 같은 모델을 써도 인형마다 달라 보이게 한다 */}
      {look.hasRibbon ? (
        <group position={[0, ribbonY, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
            <torusGeometry args={[ribbonR, ribbonR * 0.16, 8, 20]} />
            <meshStandardMaterial color={look.ribbon} roughness={0.7} />
          </mesh>
          <mesh position={[0, -ribbonR * 0.35, ribbonR * 0.95]} castShadow>
            <boxGeometry args={[ribbonR * 0.5, ribbonR * 0.62, ribbonR * 0.14]} />
            <meshStandardMaterial color={look.tag} roughness={0.6} />
          </mesh>
        </group>
      ) : null}
    </RigidBody>
  )
})
