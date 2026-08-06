import { Box3, Mesh, MeshStandardMaterial, Object3D, Vector3 } from 'three'
import { DOLL } from './layout'

/** 모델마다 크기가 제각각이라 인형 지름에 맞춰 정규화한다 */
const TARGET_SIZE = DOLL.radius * 2.05

export interface PreparedDoll {
  model: Object3D
  /** 충돌용 정점 (x,y,z 반복) — 장식은 빼고 몸통만 */
  hull: Float32Array
  dims: { width: number; height: number; depth: number }
}

/**
 * 인형 모델을 게임에서 쓸 수 있는 형태로 다듬는다.
 *
 *  - 크기를 인형 지름에 맞추고 중심이 원점에 오도록 옮긴다
 *  - 봉제인형처럼 보이도록 재질에서 금속기를 빼고 거칠게 만든다
 *  - 충돌용 볼록 껍질 정점을 모은다
 *
 * React 훅이 아니라 순수 함수다. 화면에 그리는 쪽(useDollModel)과
 * 도감 썸네일을 오프스크린으로 굽는 쪽(dollThumbnails)이 같은 결과를 써야 한다.
 */
export function prepareDollObject(root: Object3D, scale = 1): PreparedDoll {
  const box = new Box3().setFromObject(root)
  const raw = box.getSize(new Vector3())
  const factor = (TARGET_SIZE * scale) / Math.max(raw.x, raw.y, raw.z, 0.001)
  root.scale.setScalar(factor)

  const center = box.getCenter(new Vector3()).multiplyScalar(factor)
  root.position.set(-center.x, -center.y, -center.z)
  root.updateMatrixWorld(true)

  const points: number[] = []
  const v = new Vector3()

  root.traverse((child: Object3D) => {
    child.castShadow = true
    child.receiveShadow = true

    const mesh = child as Mesh
    const source = mesh.material as MeshStandardMaterial | undefined
    if (source && !Array.isArray(source)) {
      /*
       * 재질은 반드시 복제한다.
       * GLTF 클론과 직접 만든 모델 모두 재질을 공유한다. 미획득 인형을 검게
       * 칠하거나 색을 바꾸면 같은 재질을 쓰는 다른 인형까지 함께 변한다.
       */
      const material = source.clone()
      mesh.material = material
      // 봉제인형은 빛을 되쏘지 않는다. 금속기를 빼고 거칠게 둬야 천처럼 보인다.
      // 로봇처럼 일부러 금속으로 만든 모델은 건드리지 않는다.
      if ('roughness' in material && (material.metalness ?? 0) < 0.5) {
        material.roughness = 0.95
        material.metalness = 0
      }
    }

    const pos = mesh.geometry?.attributes?.position
    if (!pos) return
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld)
      points.push(v.x, v.y, v.z)
    }
  })

  return {
    model: root,
    hull: new Float32Array(points),
    dims: { width: raw.x * factor, height: raw.y * factor, depth: raw.z * factor },
  }
}
