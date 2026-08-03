import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Billboard } from '@react-three/drei'
import { Group, Mesh } from 'three'
import { emojiTexture } from './emojiTexture'

interface Props {
  /** null이면 아직 진행 중, true/false면 판정 완료 */
  result: boolean | null
  /** 성공 시 튀어나올 인형 */
  prizeEmoji: string
}

const LID_OPEN_ANGLE = -Math.PI * 0.62

/** 대형 모드의 상자 연출 (F2-7). 성공하면 뚜껑이 열리고 인형이 떠오른다. */
export function PrizeBox({ result, prizeEmoji }: Props) {
  const lidRef = useRef<Group>(null)
  const prizeRef = useRef<Group>(null)
  const boxRef = useRef<Mesh>(null)

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime

    // 판정 전에는 상자가 살짝 떠서 흔들린다
    if (boxRef.current) {
      boxRef.current.position.y = result === null ? Math.sin(t * 2) * 0.06 : 0
      boxRef.current.rotation.y = result === null ? Math.sin(t * 0.8) * 0.25 : 0
    }

    if (!lidRef.current || !prizeRef.current) return

    const targetAngle = result === true ? LID_OPEN_ANGLE : 0
    lidRef.current.rotation.x += (targetAngle - lidRef.current.rotation.x) * delta * 5

    const targetY = result === true ? 1.15 : 0.1
    prizeRef.current.position.y += (targetY - prizeRef.current.position.y) * delta * 3.4
    prizeRef.current.rotation.y = t * 1.2

    const scale = result === true ? 1 : 0.001
    prizeRef.current.scale.setScalar(
      prizeRef.current.scale.x + (scale - prizeRef.current.scale.x) * delta * 4,
    )
  })

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 5, 4]} intensity={1.6} castShadow />
      <pointLight
        position={[0, 2, 2]}
        intensity={result === true ? 24 : 8}
        color={result === true ? '#e0aa3e' : '#7c5cff'}
        distance={9}
      />

      {/* 받침 */}
      <mesh position={[0, -0.72, 0]} receiveShadow>
        <cylinderGeometry args={[1.5, 1.7, 0.18, 32]} />
        <meshStandardMaterial color="#2c2750" roughness={0.9} />
      </mesh>

      <group ref={boxRef}>
        {/* 상자 본체 */}
        <mesh position={[0, -0.1, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.5, 1.1, 1.5]} />
          <meshStandardMaterial
            color={result === true ? '#e0aa3e' : '#7c5cff'}
            roughness={0.45}
            metalness={0.2}
          />
        </mesh>

        {/* 리본 */}
        <mesh position={[0, -0.1, 0]}>
          <boxGeometry args={[0.22, 1.12, 1.53]} />
          <meshStandardMaterial color="#ff5c7a" roughness={0.5} />
        </mesh>

        {/* 뚜껑 — 뒤쪽 모서리를 축으로 열린다 */}
        <group ref={lidRef} position={[0, 0.45, -0.75]}>
          <mesh position={[0, 0.06, 0.75]} castShadow>
            <boxGeometry args={[1.62, 0.2, 1.62]} />
            <meshStandardMaterial
              color={result === true ? '#f2c96a' : '#9a7cff'}
              roughness={0.45}
              metalness={0.2}
            />
          </mesh>
        </group>

        {/* 성공 시 떠오르는 인형 */}
        <group ref={prizeRef} position={[0, 0.1, 0]} scale={0.001}>
          <mesh castShadow>
            <sphereGeometry args={[0.36, 20, 16]} />
            <meshStandardMaterial color="#ffd9a8" roughness={0.7} />
          </mesh>
          <Billboard>
            <mesh position={[0, 0, 0.36]}>
              <planeGeometry args={[0.62, 0.62]} />
              <meshBasicMaterial map={emojiTexture(prizeEmoji)} transparent toneMapped={false} />
            </mesh>
          </Billboard>
        </group>
      </group>
    </>
  )
}
