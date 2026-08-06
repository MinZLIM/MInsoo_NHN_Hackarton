import { Suspense, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { Center, ContactShadows, Environment, OrbitControls } from '@react-three/drei'
import type { Mesh, MeshStandardMaterial } from 'three'
import { useDollModel } from '@/game/three/useDollModel'

import type { DollSize } from '@/types/api'

interface Props {
  name: string
  size?: DollSize
  /** 미획득이면 검은 실루엣으로 보여준다 */
  masked?: boolean
}

function Model({ name, size = 'small', masked }: Props) {
  // 뷰어는 화면을 꽉 채워야 하므로 게임 안보다 크게 잡는다
  const { model, dress } = useDollModel(name, size, 2.4)

  useEffect(() => {
    if (!masked) return
    // 재질은 prepareDollObject가 인형마다 복제해 둔다. 여기서 칠해도 다른 인형에 번지지 않는다.
    model.traverse((child) => {
      const material = (child as Mesh).material as MeshStandardMaterial | undefined
      material?.color?.set('#0d0a1c')
    })
  }, [model, masked])

  return (
    <Center>
      <group>
        <primitive object={model} />
        {/* 기계 안과 같은 장식을 달아, 도감에서 본 인형이 그대로 나온다 */}
        {!masked && <primitive object={dress} />}
      </group>
    </Center>
  )
}

/**
 * 인형 상세의 3D 뷰어. 드래그로 돌려볼 수 있고 가만히 두면 천천히 자동 회전한다.
 * three.js가 무거우므로 이 컴포넌트는 상세를 열 때만 지연 로딩된다. (DollDetail 참고)
 *
 * 조명은 코드로 만든다. drei의 environment 프리셋은 HDRI를 CDN에서 받아오는데,
 * 그 요청이 늦어지면 화면이 빈 채로 멈춘다.
 */
export function DollViewer({ name, size, masked = false }: Props) {
  return (
    <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 0.6, 3.2], fov: 40 }}>
      <color attach="background" args={['#1b1636']} />

      <ambientLight intensity={0.7} />
      <directionalLight position={[3, 5, 4]} intensity={2.2} castShadow />
      <directionalLight position={[-4, 2, -3]} intensity={0.8} color="#9db4ff" />
      {/* 아래에서 살짝 올려 비추면 봉제 인형의 부피감이 산다 */}
      <pointLight position={[0, -2, 2]} intensity={1.2} color="#ffd9c4" />

      <Suspense fallback={null}>
        {/* 코드로 만든 환경맵 — 반사가 밋밋하지 않게 해준다 */}
        <Environment resolution={64}>
          <mesh scale={20}>
            <sphereGeometry args={[1, 16, 16]} />
            <meshBasicMaterial color="#54508f" side={1} />
          </mesh>
        </Environment>
        <Model name={name} size={size} masked={masked} />
      </Suspense>

      <ContactShadows position={[0, -1.15, 0]} opacity={0.45} scale={6} blur={2.4} far={2} />

      <OrbitControls
        makeDefault
        autoRotate
        autoRotateSpeed={1.6}
        enablePan={false}
        minPolarAngle={0.6}
        maxPolarAngle={Math.PI / 1.9}
        minDistance={1.6}
        maxDistance={5}
      />
    </Canvas>
  )
}
