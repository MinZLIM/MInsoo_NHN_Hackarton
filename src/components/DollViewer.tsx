import { Suspense, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { Center, OrbitControls, Stage, useGLTF } from '@react-three/drei'
import type { Object3D } from 'three'
import { modelLoadingManager, modelUrlFor } from '@/game/three/dollModels'

interface Props {
  name: string
  /** 미획득이면 검은 실루엣으로 보여준다 */
  masked?: boolean
}

function Model({ name, masked }: Props) {
  const url = useMemo(() => modelUrlFor(name), [name])
  const { scene } = useGLTF(url, undefined, undefined, (loader) => {
    loader.manager = modelLoadingManager
  })

  const model = useMemo(() => {
    const clone = scene.clone(true)
    clone.traverse((child: Object3D) => {
      child.castShadow = true
      const mesh = child as Object3D & { material?: { color?: { set: (c: string) => void } } }
      // 미획득은 도감의 실루엣 처리와 같은 인상을 준다
      if (masked && mesh.material?.color) mesh.material.color.set('#0d0a1c')
    })
    return clone
  }, [scene, masked])

  return (
    <Center>
      <primitive object={model} />
    </Center>
  )
}

/**
 * 인형 상세의 3D 뷰어. 드래그로 돌려볼 수 있고 가만히 두면 천천히 자동 회전한다.
 * three.js가 무거우므로 이 컴포넌트는 상세를 열 때만 지연 로딩된다. (DollDetail 참고)
 */
export function DollViewer({ name, masked = false }: Props) {
  return (
    <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 0.6, 2.6], fov: 40 }}>
      <color attach="background" args={['#1b1636']} />
      <Suspense fallback={null}>
        <Stage intensity={0.6} environment="city" shadows={{ type: 'contact', opacity: 0.5 }}>
          <Model name={name} masked={masked} />
        </Stage>
      </Suspense>
      <OrbitControls
        makeDefault
        autoRotate
        autoRotateSpeed={1.6}
        enablePan={false}
        minPolarAngle={0.6}
        maxPolarAngle={Math.PI / 1.9}
        minDistance={1.4}
        maxDistance={4}
      />
    </Canvas>
  )
}
