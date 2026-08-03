import { forwardRef } from 'react'
import { RigidBody, type RapierRigidBody } from '@react-three/rapier'
import { Billboard } from '@react-three/drei'
import { DOLL } from './layout'
import { bodyColor, emojiTexture } from './emojiTexture'

interface Props {
  emoji: string
  position: [number, number, number]
}

/**
 * 인형 하나. 저폴리 몸통(구 + 귀 2개) 위에 이모지 얼굴을 빌보드로 붙인다.
 * 3D 모델 에셋을 확보할 수 없어 택한 방식이다 — 실제 모델이 생기면 몸통 mesh만 교체하면 된다.
 */
export const Doll3D = forwardRef<RapierRigidBody, Props>(function Doll3D(
  { emoji, position },
  ref,
) {
  const color = bodyColor(emoji)
  const r = DOLL.radius

  return (
    <RigidBody
      ref={ref}
      position={position}
      colliders="ball"
      restitution={0.12}
      friction={0.85}
      linearDamping={0.35}
      angularDamping={0.6}
    >
      <mesh castShadow receiveShadow>
        <sphereGeometry args={[r, 20, 16]} />
        <meshStandardMaterial color={color} roughness={0.62} />
      </mesh>

      {/* 귀 — 인형처럼 보이게 하는 최소한의 실루엣 */}
      <mesh position={[-r * 0.62, r * 0.68, 0]} castShadow>
        <sphereGeometry args={[r * 0.34, 12, 10]} />
        <meshStandardMaterial color={color} roughness={0.75} />
      </mesh>
      <mesh position={[r * 0.62, r * 0.68, 0]} castShadow>
        <sphereGeometry args={[r * 0.34, 12, 10]} />
        <meshStandardMaterial color={color} roughness={0.75} />
      </mesh>

      {/* 얼굴은 항상 카메라를 향한다. 구 표면보다 살짝 앞에 둬야 파묻히지 않는다. */}
      <Billboard>
        <mesh position={[0, 0, r * 1.02]}>
          <planeGeometry args={[r * 2.1, r * 2.1]} />
          <meshBasicMaterial map={emojiTexture(emoji)} transparent toneMapped={false} />
        </mesh>
      </Billboard>
    </RigidBody>
  )
})
