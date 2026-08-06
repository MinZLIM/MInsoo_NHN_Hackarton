import { RigidBody } from '@react-three/rapier'
import { CABINET, HALF_D, HALF_W, HOLE } from './layout'

const FRAME_COLOR = '#4a4478'
const GLASS_COLOR = '#8fd4ff'

interface Props {
  /**
   * 왼쪽 투입구(구멍)를 둘지 여부.
   * 소형(크레인)은 잡은 인형을 투입구에 떨어뜨려야 하지만,
   * 중형(빨래집게)은 집게가 열리는 즉시 획득이라 구멍이 필요 없다.
   */
  prizeHole?: boolean
}

/**
 * 인형뽑기 기계의 몸체.
 * prizeHole이면 바닥 왼쪽을 비워 투입구를 만들고, 그 옆에 턱을 세운다.
 */
export function Cabinet({ prizeHole = true }: Props = {}) {
  const floorWidth = prizeHole ? HALF_W - HOLE.edgeX : CABINET.width
  const floorCenterX = prizeHole ? (HOLE.edgeX + HALF_W) / 2 : 0
  const holeWidth = HOLE.edgeX + HALF_W
  const holeCenterX = (-HALF_W + HOLE.edgeX) / 2
  const t = CABINET.wallThickness

  return (
    <>
      {/* 바닥 — 투입구 오른쪽만 */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[floorCenterX, -t / 2, 0]} receiveShadow>
          <boxGeometry args={[floorWidth, t, CABINET.depth]} />
          <meshStandardMaterial color="#332c5e" roughness={0.55} metalness={0.15} />
        </mesh>
      </RigidBody>

      {prizeHole ? (
        <>
          {/* 투입구 옆 턱 — 인형이 굴러 들어가지 않게 막는다 */}
          <RigidBody type="fixed" colliders="cuboid">
            <mesh position={[HOLE.edgeX, HOLE.lipHeight / 2, 0]} castShadow receiveShadow>
              <boxGeometry args={[0.08, HOLE.lipHeight, CABINET.depth]} />
              <meshStandardMaterial color={FRAME_COLOR} roughness={0.6} />
            </mesh>
          </RigidBody>

          {/* 투입구 — 빠지는 구멍임을 알 수 있게 테두리를 두른다 (물리 없음) */}
          <mesh position={[holeCenterX, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[holeWidth, CABINET.depth]} />
            <meshBasicMaterial color="#0b0918" />
          </mesh>
          <mesh position={[holeCenterX, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.34, 0.42, 32]} />
            <meshBasicMaterial color="#7c5cff" transparent opacity={0.65} />
          </mesh>
        </>
      ) : null}

      {/* 좌우/뒤 벽 (물리 있음) */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[-HALF_W - t / 2, CABINET.height / 2, 0]}>
          <boxGeometry args={[t, CABINET.height, CABINET.depth]} />
          <meshPhysicalMaterial
            color={GLASS_COLOR}
            transparent
            opacity={0.12}
            roughness={0.06}
            metalness={0}
            clearcoat={1}
            clearcoatRoughness={0.05}
          />
        </mesh>
      </RigidBody>
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[HALF_W + t / 2, CABINET.height / 2, 0]}>
          <boxGeometry args={[t, CABINET.height, CABINET.depth]} />
          <meshPhysicalMaterial
            color={GLASS_COLOR}
            transparent
            opacity={0.12}
            roughness={0.06}
            metalness={0}
            clearcoat={1}
            clearcoatRoughness={0.05}
          />
        </mesh>
      </RigidBody>
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[0, CABINET.height / 2, -HALF_D - t / 2]} receiveShadow>
          <boxGeometry args={[CABINET.width + t * 2, CABINET.height, t]} />
          <meshStandardMaterial color="#221d40" roughness={0.9} />
        </mesh>
      </RigidBody>

      {/* 앞 유리 — 물리는 두되 반투명하게 (인형이 앞으로 튀어나오지 않도록) */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[0, CABINET.height / 2, HALF_D + t / 2]}>
          <boxGeometry args={[CABINET.width + t * 2, CABINET.height, t]} />
          <meshPhysicalMaterial
            color={GLASS_COLOR}
            transparent
            opacity={0.1}
            roughness={0.04}
            metalness={0}
            clearcoat={1}
            clearcoatRoughness={0.03}
          />
        </mesh>
      </RigidBody>

      {/* 천장 — 위에서 내려다볼 수 있도록 유리로 둔다 */}
      <mesh position={[0, CABINET.height, 0]}>
        <boxGeometry args={[CABINET.width + t * 2, t, CABINET.depth + t * 2]} />
        <meshPhysicalMaterial
          color={GLASS_COLOR}
          transparent
          opacity={0.1}
          roughness={0.04}
          metalness={0}
          clearcoat={1}
          clearcoatRoughness={0.03}
        />
      </mesh>
      {/* 천장 테두리 프레임 — 유리만 있으면 경계가 보이지 않는다 */}
      {[-1, 1].map((side) => (
        <mesh key={`fx${side}`} position={[side * (HALF_W + t / 2), CABINET.height, 0]}>
          <boxGeometry args={[t, t * 1.1, CABINET.depth + t * 2]} />
          <meshStandardMaterial color={FRAME_COLOR} roughness={0.28} metalness={0.7} />
        </mesh>
      ))}
      {[-1, 1].map((side) => (
        <mesh key={`fz${side}`} position={[0, CABINET.height, side * (HALF_D + t / 2)]}>
          <boxGeometry args={[CABINET.width + t * 2, t * 1.1, t]} />
          <meshStandardMaterial color={FRAME_COLOR} roughness={0.28} metalness={0.7} />
        </mesh>
      ))}

      {/* 모서리 기둥 4개 */}
      {[
        [-HALF_W, HALF_D],
        [HALF_W, HALF_D],
        [-HALF_W, -HALF_D],
        [HALF_W, -HALF_D],
      ].map(([x, z]) => (
        <mesh key={`${x}-${z}`} position={[x, CABINET.height / 2, z]}>
          <boxGeometry args={[0.1, CABINET.height, 0.1]} />
          <meshStandardMaterial color="#8b6bff" roughness={0.22} metalness={0.85} />
        </mesh>
      ))}
    </>
  )
}
