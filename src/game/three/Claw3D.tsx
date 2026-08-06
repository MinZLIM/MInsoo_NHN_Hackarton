import { forwardRef, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group } from 'three'
import { CLAW } from './layout'

interface Props {
  /** 열린 상태면 발톱을 벌린다 */
  open: boolean
}

/*
 * 어두운 보라 기계 안에서 금색 집게는 배경에 묻혔다.
 * 밝은 크롬 + 청록 발광으로 바꿔 어디에 있는지 바로 보이게 한다.
 */
const CLAW_COLOR = '#eef2ff'
const CLAW_DARK = '#aab4d8'
const CLAW_GLOW = '#41e0ff'
const FINGERS = [0, (Math.PI * 2) / 3, (Math.PI * 4) / 3]

/**
 * 집게 머리.
 *
 * 위치는 부모(ClawScene)가 매 프레임 정한다. 여기서는 두 가지만 한다.
 *  - 발톱이 즉시 꺾이지 않고 서서히 벌어지고 오므라든다
 *  - 옆으로 움직이면 관성으로 살짝 기운다 (실제 기계의 흔들림)
 */
export const Claw3D = forwardRef<Group, Props>(function Claw3D({ open }, ref) {
  const fingersRef = useRef<Group[]>([])
  const swayRef = useRef<Group>(null)

  /** 0(닫힘) ~ 1(열림) */
  const grip = useRef(1)
  const prev = useRef({ x: 0, z: 0 })
  const sway = useRef({ x: 0, z: 0 })

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 1 / 30)
    const target = open ? 1 : 0
    grip.current += (target - grip.current) * Math.min(1, CLAW.gripSpeed * delta)

    const spread = 0.16 + grip.current * 0.5
    fingersRef.current.forEach((finger) => {
      if (finger) finger.rotation.z = -spread
    })

    // 부모의 실제 이동량으로 흔들림을 만든다
    const parent = (ref as React.RefObject<Group | null>)?.current
    if (parent && swayRef.current) {
      const vx = (parent.position.x - prev.current.x) / delta
      const vz = (parent.position.z - prev.current.z) / delta
      prev.current = { x: parent.position.x, z: parent.position.z }

      // 속도에 비례해 기울고, 멈추면 스프링처럼 되돌아온다
      sway.current.x += (-vz * 0.06 - sway.current.x) * Math.min(1, 6 * delta)
      sway.current.z += (vx * 0.06 - sway.current.z) * Math.min(1, 6 * delta)

      swayRef.current.rotation.x = sway.current.x
      swayRef.current.rotation.z = sway.current.z
    }
  })

  return (
    <group ref={ref}>
      <group ref={swayRef}>
        {/* 집게를 매단 고리 */}
        <mesh position={[0, 0.2, 0]}>
          <torusGeometry args={[0.07, 0.02, 8, 16]} />
          <meshStandardMaterial color="#b9b3d8" metalness={0.85} roughness={0.25} />
        </mesh>

        {/* 몸통 */}
        <mesh castShadow>
          <cylinderGeometry args={[0.19, 0.14, 0.26, 20]} />
          <meshStandardMaterial
            color={CLAW_COLOR}
            metalness={0.85}
            roughness={0.16}
            emissive={CLAW_GLOW}
            emissiveIntensity={0.16}
          />
        </mesh>
        {/* 몸통 띠 — 발광 링이라 멀리서도 위치가 보인다 */}
        <mesh position={[0, -0.1, 0]}>
          <cylinderGeometry args={[0.17, 0.17, 0.045, 20]} />
          <meshStandardMaterial
            color={CLAW_GLOW}
            emissive={CLAW_GLOW}
            emissiveIntensity={1.5}
            toneMapped={false}
          />
        </mesh>

        {/* 집게를 따라다니는 조명 — 아래 인형까지 비춘다 */}
        <pointLight position={[0, -0.1, 0]} intensity={3.2} color="#cfefff" distance={2.4} />

        {/* 발톱 3개 — 관절이 있어 두 마디로 접힌다 */}
        {FINGERS.map((angle, i) => (
          <group key={i} rotation={[0, angle, 0]}>
            <group
              ref={(g) => {
                if (g) fingersRef.current[i] = g
              }}
              position={[0.09, -0.11, 0]}
            >
              {/* 윗마디 */}
              <mesh position={[0, -0.16, 0]} castShadow>
                <boxGeometry args={[0.08, 0.34, 0.095]} />
                <meshStandardMaterial color={CLAW_COLOR} metalness={0.82} roughness={0.18} />
              </mesh>
              {/* 아랫마디 — 안쪽으로 꺾인다 */}
              <group position={[0, -0.33, 0]} rotation={[0, 0, 0.75]}>
                <mesh position={[0, -0.1, 0]} castShadow>
                  <boxGeometry args={[0.075, 0.22, 0.09]} />
                  <meshStandardMaterial color={CLAW_DARK} metalness={0.8} roughness={0.2} />
                </mesh>
                {/* 발톱 끝 발광 — 어디를 집는지 보인다 */}
                <mesh position={[0, -0.21, 0]}>
                  <boxGeometry args={[0.08, 0.05, 0.095]} />
                  <meshStandardMaterial
                    color={CLAW_GLOW}
                    emissive={CLAW_GLOW}
                    emissiveIntensity={1.8}
                    toneMapped={false}
                  />
                </mesh>
              </group>
            </group>
          </group>
        ))}
      </group>
    </group>
  )
})
