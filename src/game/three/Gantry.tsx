import { forwardRef } from 'react'
import { Group } from 'three'
import { CABINET, GANTRY, HALF_D, HALF_W } from './layout'

const RAIL_COLOR = '#8f89bd'
const BEAM_COLOR = '#c9c3ea'

/**
 * 집게를 매단 갠트리.
 *
 * 실제 기계와 같은 구조다 — 좌우 벽의 레일 위를 크로스빔이 앞뒤(z)로 달리고,
 * 그 빔 위를 트롤리가 좌우(x)로 달린다. 집게는 트롤리에서 와이어로 내려온다.
 * beam / trolley / wire 위치는 ClawScene이 매 프레임 갱신한다.
 */
interface Refs {
  beam: React.Ref<Group>
  trolley: React.Ref<Group>
  wire: React.Ref<Group>
}

export const Gantry = forwardRef<Group, Refs>(function Gantry({ beam, trolley, wire }, _ref) {
  return (
    <>
      {/* 좌우 고정 레일 */}
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[side * (HALF_W - 0.06), GANTRY.railY, 0]}
          castShadow
        >
          <boxGeometry args={[0.1, 0.1, CABINET.depth]} />
          <meshStandardMaterial color={RAIL_COLOR} metalness={0.8} roughness={0.28} />
        </mesh>
      ))}

      {/* 앞뒤로 달리는 크로스빔 */}
      <group ref={beam}>
        <mesh position={[0, GANTRY.railY, 0]} castShadow>
          <boxGeometry args={[CABINET.width, GANTRY.beamThickness, GANTRY.beamThickness]} />
          <meshStandardMaterial color={BEAM_COLOR} metalness={0.75} roughness={0.3} />
        </mesh>
        {/* 빔 양 끝 롤러 */}
        {[-1, 1].map((side) => (
          <mesh
            key={side}
            position={[side * (HALF_W - 0.06), GANTRY.railY, 0]}
            rotation={[0, 0, Math.PI / 2]}
          >
            <cylinderGeometry args={[0.075, 0.075, 0.14, 12]} />
            <meshStandardMaterial color="#6a6494" metalness={0.85} roughness={0.25} />
          </mesh>
        ))}
      </group>

      {/* 빔 위를 좌우로 달리는 트롤리 */}
      <group ref={trolley}>
        <mesh position={[0, GANTRY.railY, 0]} castShadow>
          <boxGeometry args={[GANTRY.trolleySize, 0.2, GANTRY.trolleySize]} />
          <meshStandardMaterial color="#5b5490" metalness={0.7} roughness={0.32} />
        </mesh>
        {/* 트롤리 아래 와이어가 나오는 구멍 */}
        <mesh position={[0, GANTRY.railY - 0.11, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.04, 12]} />
          <meshStandardMaterial color="#2a2450" roughness={0.6} />
        </mesh>
      </group>

      {/* 트롤리에서 집게까지 늘어나는 와이어 — scale.y로 길이를 맞춘다 */}
      <group ref={wire}>
        <mesh>
          <cylinderGeometry args={[0.016, 0.016, 1, 8]} />
          <meshStandardMaterial color="#d8d3f0" metalness={0.6} roughness={0.4} />
        </mesh>
      </group>
    </>
  )
})

/**
 * 경품 배출구.
 * 투입구로 빠진 인형이 나오는 곳이라 기계 안쪽, 투입구 바로 앞에 둔다.
 */
export function PrizeDoor({ x }: { x: number }) {
  return (
    <group position={[x, 0, HALF_D - 0.16]}>
      {/* 배출구 입구 테두리 */}
      <mesh position={[0, 0.28, 0]}>
        <boxGeometry args={[0.78, 0.56, 0.08]} />
        <meshStandardMaterial color="#5a5390" metalness={0.55} roughness={0.35} />
      </mesh>
      {/* 안쪽 어둠 */}
      <mesh position={[0, 0.26, 0.03]}>
        <boxGeometry args={[0.62, 0.42, 0.04]} />
        <meshBasicMaterial color="#07050f" />
      </mesh>
      {/* 반쯤 열린 덮개 */}
      <mesh position={[0, 0.48, 0.07]} rotation={[-0.42, 0, 0]}>
        <boxGeometry args={[0.6, 0.3, 0.02]} />
        <meshPhysicalMaterial
          color="#8fd4ff"
          transparent
          opacity={0.34}
          roughness={0.1}
          clearcoat={1}
        />
      </mesh>
      {/* PRIZE 램프 — 블룸에 타지 않도록 약하게 */}
      <mesh position={[0, 0.6, 0.03]}>
        <boxGeometry args={[0.4, 0.05, 0.02]} />
        <meshStandardMaterial
          color="#8a6a26"
          emissive="#f0bb52"
          emissiveIntensity={0.5}
          toneMapped
        />
      </mesh>
      <pointLight position={[0, 0.45, 0.35]} intensity={1.2} color="#f0bb52" distance={1.3} />
    </group>
  )
}
