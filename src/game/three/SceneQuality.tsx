import { Suspense } from 'react'
import { ContactShadows, Environment, Lightformer } from '@react-three/drei'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'

/**
 * 씬 공통 품질 설정 — 조명 · 환경 반사 · 후처리.
 *
 * HDRI 파일을 받아오는 대신 Lightformer로 환경맵을 그 자리에서 만든다.
 * 네트워크 요청이 없어 GitHub Pages에서도 그대로 동작하고, 기계 유리에
 * 인형뽑기 가게 같은 세로 조명 반사가 생긴다.
 */
export function SceneLighting() {
  return (
    <>
      <ambientLight intensity={0.62} />
      <hemisphereLight args={['#c9bcff', '#1a1533', 0.55]} />

      <directionalLight
        position={[4, 7, 5]}
        intensity={2.5}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-camera-left={-5}
        shadow-camera-right={5}
        shadow-camera-top={5}
        shadow-camera-bottom={-5}
      />
      {/* 보라/금색 림 라이트 — 기계 실루엣을 배경에서 떼어낸다 */}
      <pointLight position={[-3.2, 2.4, 2.2]} intensity={26} color="#7c5cff" distance={11} />
      <pointLight position={[3.2, 2.2, 1.6]} intensity={16} color="#e0aa3e" distance={10} />

      <Suspense fallback={null}>
        <Environment resolution={256}>
          <Lightformer intensity={3.2} position={[0, 5, -2]} scale={[9, 3, 1]} color="#ffffff" />
          <Lightformer
            intensity={2.4}
            position={[-4, 2, 2]}
            rotation-y={Math.PI / 2}
            scale={[6, 4, 1]}
            color="#a88bff"
          />
          <Lightformer
            intensity={2.4}
            position={[4, 2, 2]}
            rotation-y={-Math.PI / 2}
            scale={[6, 4, 1]}
            color="#ffd79a"
          />
          <Lightformer intensity={1.2} position={[0, -3, 0]} scale={[9, 3, 1]} color="#2a2350" />
        </Environment>
      </Suspense>
    </>
  )
}

/** 바닥 접지 그림자 — 인형이 공중에 뜬 느낌을 없앤다 */
export function GroundShadows({ y = 0.01, scale = 7 }: { y?: number; scale?: number }) {
  return (
    <ContactShadows
      position={[0, y, 0]}
      opacity={0.55}
      scale={scale}
      blur={2.4}
      far={3}
      resolution={512}
      color="#050310"
    />
  )
}

/** 후처리 — 조명이 번지고 화면 가장자리가 살짝 어두워진다 */
export function PostFx({ bloom = 0.7 }: { bloom?: number }) {
  return (
    <EffectComposer enableNormalPass={false}>
      <Bloom intensity={bloom} luminanceThreshold={0.62} luminanceSmoothing={0.25} mipmapBlur />
      <Vignette offset={0.35} darkness={0.42} />
    </EffectComposer>
  )
}
