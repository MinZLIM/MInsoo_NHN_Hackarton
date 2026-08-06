import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Vector3 } from 'three'

export type ViewKey = 'front' | 'top' | 'left' | 'right'

interface View {
  label: string
  pos: [number, number, number]
  target: [number, number, number]
}

/**
 * 기계를 보는 위치.
 * 위에서 보면 인형이 어디에 겹쳐 있는지, 옆에서 보면 집게가 인형에 얼마나
 * 가까운지가 보인다. 정면만으로는 깊이(z)를 가늠하기 어렵다.
 */
export const VIEWS: Record<ViewKey, View> = {
  front: { label: '정면', pos: [0, 2.9, 7.1], target: [0, 1.7, 0] },
  // 천장이 유리라 정수리에서 그대로 내려다볼 수 있다.
  // 살짝 앞으로 물려야 집게 와이어에 시야가 막히지 않는다.
  top: { label: '위', pos: [0, 7.4, 1.6], target: [0, 0.3, 0] },
  left: { label: '왼쪽', pos: [-6.8, 3.2, 3.6], target: [0, 1.6, 0] },
  right: { label: '오른쪽', pos: [6.8, 3.2, 3.6], target: [0, 1.6, 0] },
}

const SMOOTH = 0.0009

/** 시점이 바뀌면 카메라가 그 자리로 부드럽게 옮겨 간다. */
export function CameraRig({ view }: { view: ViewKey }) {
  const target = useRef(new Vector3(...VIEWS.front.target))
  const desiredPos = useRef(new Vector3())
  const desiredTarget = useRef(new Vector3())

  useFrame((state, delta) => {
    const v = VIEWS[view]
    desiredPos.current.set(...v.pos)
    desiredTarget.current.set(...v.target)

    // 프레임 속도와 무관하게 같은 속도로 수렴한다
    const k = 1 - Math.pow(SMOOTH, Math.min(delta, 1 / 30))
    state.camera.position.lerp(desiredPos.current, k)
    target.current.lerp(desiredTarget.current, k)
    state.camera.lookAt(target.current)
  })

  return null
}
