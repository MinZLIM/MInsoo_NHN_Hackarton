import { nameTagTexture } from './emojiTexture'
import type { DollSize } from '@/types/api'

interface Props {
  name: string
  size: DollSize
  /** 인형 겉모습 (dollModels.dollLook) */
  look: { ribbon: string; tag: string; hasRibbon: boolean }
  /** 모델의 실제 크기 — 장식을 여기에 맞춘다 */
  dims: { width: number; height: number; depth: number }
  /** 모델의 정점 (x,y,z 반복) — 목도리를 두를 몸통 굵기를 여기서 잰다 */
  hull: Float32Array
}

/**
 * 특정 높이에서 몸통이 얼마나 굵은지 잰다.
 *
 * 전체 바운딩박스를 쓰면 귀·꼬리·발까지 포함돼 목도리가 몸통보다 한참 크게 나온다.
 * 그 높이의 정점만 모아 실제 단면을 구한다.
 */
function sectionAt(hull: Float32Array, y: number, band: number) {
  let halfWidth = 0
  let halfDepth = 0
  for (let i = 0; i < hull.length; i += 3) {
    if (Math.abs(hull[i + 1] - y) > band) continue
    halfWidth = Math.max(halfWidth, Math.abs(hull[i]))
    halfDepth = Math.max(halfDepth, Math.abs(hull[i + 2]))
  }
  return { halfWidth, halfDepth }
}

/**
 * 인형 장식.
 *
 * 모델 24종을 45종에 나눠 쓰다 보니 같은 인형이 여러 번 보인다.
 * 봉제 솔기 · 목도리 · 리본 · 이름표를 이름에서 뽑은 색으로 달아
 * 하나하나 다른 인형처럼 보이게 한다.
 *
 * 높이는 모델 중심이 아니라 **아랫부분 기준**으로 잡는다. 쓰는 모델이
 * 머리가 몸통만큼 큰 형태라, 중심 기준으로 달면 목도리가 이마에 걸리고
 * 배 무늬가 얼굴을 덮는다.
 *
 * ⚠️ 이 요소들은 물리에 잡히면 안 된다. Doll3D가 콜라이더를 몸통에서만 직접
 *    만들기 때문에(ConvexHullCollider) 여기에 무엇을 붙여도 충돌에 영향이 없다.
 */
export function DollDress({ name, size, look, dims, hull }: Props) {
  const h = dims.height
  /** 목도리가 앉는 높이 — 얼굴 아래, 몸통 위쪽 */
  const collarY = -h * 0.28
  /** 솔기는 몸통 아래쪽 */
  const seamY = -h * 0.4

  const body = sectionAt(hull, collarY, h * 0.06)
  const r = Math.max(body.halfWidth, body.halfDepth) || Math.max(dims.width, dims.depth) / 2
  /** 앞면 바로 바깥 — 배 무늬·리본·이름표를 여기에 붙인다 */
  const front = (body.halfDepth || dims.depth / 2) * 1.04
  const belly = sectionAt(hull, seamY, h * 0.05)

  return (
    <group>
      {/* 배 무늬 — 몸통 앞의 밝은 천 조각 */}
      <mesh
        position={[0, seamY, (belly.halfDepth || dims.depth / 2) * 1.03]}
        scale={[1, 1.2, 1]}
      >
        <circleGeometry args={[r * 0.26, 20]} />
        <meshStandardMaterial color="#fff6ea" roughness={0.95} transparent opacity={0.5} />
      </mesh>

      {look.hasRibbon ? (
        <>
          <group position={[0, collarY, 0]}>
            {/*
             * 목걸이 끈.
             * 두툼한 목도리를 두르려 해봤지만, 모델마다 몸통 단면이 달라
             * 어느 쪽에 맞추든 다른 쪽에서 판때기처럼 튀어나왔다.
             * 얇은 끈은 몸통에 조금 파묻혀도 자연스럽게 보인다.
             */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[r * 0.95, r * 0.035, 6, 24]} />
              <meshStandardMaterial color={look.ribbon} roughness={0.7} />
            </mesh>

            {/* 리본 — 고리 둘에 매듭 하나, 가슴 앞에 */}
            <group position={[0, r * 0.06, front + r * 0.1]}>
              {[-1, 1].map((s) => (
                <mesh
                  key={s}
                  position={[s * r * 0.26, 0, 0]}
                  rotation={[0, 0, s * 0.5]}
                  scale={[1, 0.62, 0.45]}
                  castShadow
                >
                  <sphereGeometry args={[r * 0.22, 10, 8]} />
                  <meshStandardMaterial color={look.ribbon} roughness={0.6} />
                </mesh>
              ))}
              <mesh castShadow>
                <sphereGeometry args={[r * 0.11, 10, 8]} />
                <meshStandardMaterial color={look.ribbon} roughness={0.55} />
              </mesh>
            </group>
          </group>

          {/* 이름표 — 목도리에서 아래로 늘어뜨린다 */}
          <group position={[0, collarY - r * 0.46, front + r * 0.06]} rotation={[-0.28, 0, 0]}>
            <mesh castShadow>
              <boxGeometry args={[r * 0.66, r * 0.4, r * 0.05]} />
              <meshStandardMaterial color={look.tag} roughness={0.6} />
            </mesh>
            <mesh position={[0, 0, r * 0.032]}>
              <planeGeometry args={[r * 0.6, r * 0.34]} />
              <meshBasicMaterial map={nameTagTexture(name, look.tag)} toneMapped={false} />
            </mesh>
          </group>

          {/* 대형은 왕관 — 제일 귀한 인형이라 머리 위에서 티가 나야 한다 */}
          {size === 'large' && (
            <group position={[0, h * 0.34, 0]}>
              <mesh castShadow>
                <cylinderGeometry args={[r * 0.4, r * 0.44, r * 0.3, 12, 1, true]} />
                <meshStandardMaterial color="#f0bb52" metalness={0.85} roughness={0.25} side={2} />
              </mesh>
              {[0, 1, 2, 3, 4].map((i) => {
                const a = (i / 5) * Math.PI * 2
                return (
                  <mesh
                    key={i}
                    position={[Math.cos(a) * r * 0.42, r * 0.24, Math.sin(a) * r * 0.42]}
                    castShadow
                  >
                    <coneGeometry args={[r * 0.09, r * 0.22, 6]} />
                    <meshStandardMaterial color="#ffd98a" metalness={0.8} roughness={0.25} />
                  </mesh>
                )
              })}
            </group>
          )}
        </>
      ) : null}
    </group>
  )
}
