import { forwardRef, useMemo } from 'react'
import { RigidBody, type RapierRigidBody } from '@react-three/rapier'
import { Billboard } from '@react-three/drei'
import { DOLL } from './layout'
import { bodyColor, emojiTexture, accentColor } from './emojiTexture'

interface Props {
  emoji: string
  position: [number, number, number]
}

/**
 * 봉제인형 하나.
 *
 * 실제 3D 모델(.glb)을 구할 수 없어 프리미티브를 조합해 인형 실루엣을 만든다.
 * 몸통 + 머리 + 귀 + 주둥이 + 팔다리 구성이며, 얼굴만 이모지 빌보드로 얹는다.
 * 나중에 모델 파일이 생기면 이 컴포넌트의 mesh 묶음만 <primitive object={gltf.scene} />로 바꾸면 된다.
 *
 * 물리는 형태와 무관하게 ball collider 하나로 처리한다 — 인형끼리 부드럽게 굴러야 하고,
 * 정밀 충돌은 이 게임에서 이득이 없다.
 */
export const Doll3D = forwardRef<RapierRigidBody, Props>(function Doll3D(
  { emoji, position },
  ref,
) {
  const r = DOLL.radius
  const { color, accent, rotation } = useMemo(
    () => ({
      color: bodyColor(emoji),
      accent: accentColor(emoji),
      // 종류마다 조금씩 다른 각도로 놓여 있어야 무더기가 자연스럽다
      rotation: [0, (emoji.charCodeAt(0) % 12) * 0.5, 0] as [number, number, number],
    }),
    [emoji],
  )

  return (
    <RigidBody
      ref={ref}
      position={position}
      rotation={rotation}
      colliders="ball"
      restitution={0.08}
      friction={0.95}
      linearDamping={0.4}
      angularDamping={0.75}
    >
      {/* 몸통 — 아래로 갈수록 넓은 물방울 형태 */}
      <mesh position={[0, -r * 0.28, 0]} scale={[1, 0.92, 0.9]} castShadow receiveShadow>
        <sphereGeometry args={[r * 0.78, 20, 16]} />
        <meshStandardMaterial color={color} roughness={0.92} />
      </mesh>

      {/* 머리 — 얼굴이 잘 보이도록 몸통보다 크게 잡는다 */}
      <mesh position={[0, r * 0.5, 0]} castShadow receiveShadow>
        <sphereGeometry args={[r * 0.74, 22, 18]} />
        <meshStandardMaterial color={color} roughness={0.92} />
      </mesh>

      {/* 귀 */}
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[side * r * 0.58, r * 1.02, 0]}
          scale={[1, 1, 0.6]}
          castShadow
        >
          <sphereGeometry args={[r * 0.28, 14, 12]} />
          <meshStandardMaterial color={accent} roughness={0.9} />
        </mesh>
      ))}

      {/* 주둥이 — 얼굴에 입체감을 준다 */}
      <mesh position={[0, r * 0.36, r * 0.56]} scale={[1.15, 0.85, 0.8]}>
        <sphereGeometry args={[r * 0.26, 14, 12]} />
        <meshStandardMaterial color={accent} roughness={0.88} />
      </mesh>

      {/* 팔 */}
      {[-1, 1].map((side) => (
        <mesh
          key={`arm${side}`}
          position={[side * r * 0.68, -r * 0.22, r * 0.1]}
          rotation={[0, 0, side * 0.5]}
          castShadow
        >
          <capsuleGeometry args={[r * 0.19, r * 0.24, 4, 10]} />
          <meshStandardMaterial color={color} roughness={0.92} />
        </mesh>
      ))}

      {/* 다리 */}
      {[-1, 1].map((side) => (
        <mesh
          key={`leg${side}`}
          position={[side * r * 0.36, -r * 0.86, r * 0.12]}
          rotation={[side * 0.35, 0, 0]}
          castShadow
        >
          <capsuleGeometry args={[r * 0.21, r * 0.16, 4, 10]} />
          <meshStandardMaterial color={accent} roughness={0.9} />
        </mesh>
      ))}

      {/* 얼굴 — 항상 카메라를 향한다 */}
      <Billboard position={[0, r * 0.5, 0]}>
        <mesh position={[0, 0, r * 0.72]}>
          <planeGeometry args={[r * 1.55, r * 1.55]} />
          <meshBasicMaterial map={emojiTexture(emoji)} transparent toneMapped={false} />
        </mesh>
      </Billboard>
    </RigidBody>
  )
})
