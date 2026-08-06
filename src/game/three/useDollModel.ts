import { useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import { Box3, Mesh, MeshStandardMaterial, Vector3, type Object3D } from 'three'
import { DOLL } from './layout'
import { dollLook, modelLoadingManager, modelUrlFor } from './dollModels'

/** 모델마다 크기가 제각각이라 인형 지름에 맞춰 정규화한다 */
const TARGET_SIZE = DOLL.radius * 2.05

/**
 * 인형 모델을 읽어 게임에서 쓸 수 있는 형태로 다듬는다.
 *
 *  - 크기를 인형 지름에 맞추고 바닥이 원점에 오도록 내려 놓는다
 *  - 봉제인형처럼 보이도록 재질에서 금속기를 빼고 거칠게 만든다
 *  - 충돌용 볼록 껍질 정점을 모은다 (장식은 빼고 몸통만)
 *
 * 기계 안의 인형(Doll3D)과 콜렉터함 뷰어(DollViewer)가 같은 모습을 쓰도록
 * 이 훅 하나에서 처리한다.
 */
export function useDollModel(name: string, scaleMultiplier = 1) {
  const look = useMemo(() => dollLook(name), [name])
  const url = useMemo(() => modelUrlFor(name), [name])

  const { scene } = useGLTF(url, undefined, undefined, (loader) => {
    loader.manager = modelLoadingManager
  })

  const prepared = useMemo(() => {
    const clone = scene.clone(true)

    const box = new Box3().setFromObject(clone)
    const raw = box.getSize(new Vector3())
    const scale =
      (TARGET_SIZE * look.scale * scaleMultiplier) / Math.max(raw.x, raw.y, raw.z, 0.001)
    clone.scale.setScalar(scale)

    const center = box.getCenter(new Vector3()).multiplyScalar(scale)
    clone.position.set(-center.x, -center.y, -center.z)
    clone.updateMatrixWorld(true)

    const points: number[] = []
    const v = new Vector3()

    clone.traverse((child: Object3D) => {
      child.castShadow = true
      child.receiveShadow = true

      const mesh = child as Mesh
      const material = mesh.material as MeshStandardMaterial | undefined
      if (material && 'roughness' in material) {
        material.roughness = 0.95
        material.metalness = 0
      }

      const pos = mesh.geometry?.attributes?.position
      if (!pos) return
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld)
        points.push(v.x, v.y, v.z)
      }
    })

    return {
      model: clone,
      hull: new Float32Array(points),
      dims: { width: raw.x * scale, height: raw.y * scale, depth: raw.z * scale },
    }
  }, [scene, look.scale, scaleMultiplier])

  return { ...prepared, look }
}
