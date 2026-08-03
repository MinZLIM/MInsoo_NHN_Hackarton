import { forwardRef } from 'react'
import { Group } from 'three'
import { CABINET } from './layout'

interface Props {
  /** 열린 상태면 발톱을 벌린다 */
  open: boolean
}

const CLAW_COLOR = '#e0aa3e'
const FINGERS = [0, (Math.PI * 2) / 3, (Math.PI * 4) / 3]

/** 집게. 위치는 부모 group의 ref로 매 프레임 갱신한다. */
export const Claw3D = forwardRef<Group, Props>(function Claw3D({ open }, ref) {
  const spread = open ? 0.42 : 0.16
  const tilt = open ? 0.55 : 0.12

  return (
    <group ref={ref}>
      {/* 천장까지 이어진 와이어 — 집게 위치에 맞춰 늘어난다 */}
      <mesh position={[0, CABINET.height / 2, 0]}>
        <cylinderGeometry args={[0.02, 0.02, CABINET.height, 8]} />
        <meshStandardMaterial color="#9a94c4" metalness={0.6} roughness={0.4} />
      </mesh>

      {/* 몸통 */}
      <mesh castShadow>
        <cylinderGeometry args={[0.17, 0.13, 0.24, 16]} />
        <meshStandardMaterial color={CLAW_COLOR} metalness={0.75} roughness={0.3} />
      </mesh>

      {/* 발톱 3개 — 벌어질수록 바깥으로 기운다 */}
      {FINGERS.map((angle, i) => (
        <group key={i} rotation={[0, angle, 0]}>
          <group position={[spread * 0.5, -0.12, 0]} rotation={[0, 0, -tilt]}>
            <mesh position={[0, -0.19, 0]} castShadow>
              <boxGeometry args={[0.07, 0.38, 0.09]} />
              <meshStandardMaterial color={CLAW_COLOR} metalness={0.7} roughness={0.28} />
            </mesh>
            {/* 발톱 끝 */}
            <mesh position={[0, -0.4, 0.02]} rotation={[0.5, 0, 0]} castShadow>
              <boxGeometry args={[0.07, 0.14, 0.08]} />
              <meshStandardMaterial color="#f2c96a" metalness={0.7} roughness={0.28} />
            </mesh>
          </group>
        </group>
      ))}
    </group>
  )
})
