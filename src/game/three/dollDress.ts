import {
  BoxGeometry,
  CircleGeometry,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  SphereGeometry,
  TorusGeometry,
} from 'three'
import { nameTagTexture } from './emojiTexture'
import type { DollSize } from '@/types/api'

export interface DollLook {
  ribbon: string
  tag: string
  hasRibbon: boolean
}

interface Args {
  name: string
  size: DollSize
  look: DollLook
  /** 모델의 실제 크기 */
  dims: { width: number; height: number; depth: number }
  /** 모델 정점 (x,y,z 반복) — 목걸이를 두를 몸통 굵기를 여기서 잰다 */
  hull: Float32Array
}

/**
 * 특정 높이에서 몸통이 얼마나 굵은지 잰다.
 *
 * 전체 바운딩박스를 쓰면 귀·꼬리·발까지 포함돼 목걸이가 몸통보다 한참 크게 나온다.
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
 * 인형 장식을 만든다.
 *
 * 모델 24종을 45종에 나눠 쓰다 보니 같은 인형이 여러 번 보인다.
 * 배 무늬 · 목걸이 · 리본 · 이름표를 이름에서 뽑은 색으로 달아
 * 하나하나 다른 인형처럼 보이게 한다.
 *
 * 높이는 모델 중심이 아니라 아랫부분 기준으로 잡는다. 쓰는 모델이 머리가
 * 몸통만큼 커서, 중심 기준으로 달면 목걸이가 이마에 걸린다.
 *
 * ⚠️ 이 요소들은 물리에 잡히면 안 된다. Doll3D가 콜라이더를 몸통 정점에서
 *    직접 만들기 때문에(ConvexHullCollider) 여기에 무엇을 붙여도 충돌에 영향이 없다.
 *
 * 화면용 컴포넌트가 아니라 순수 함수다. 도감 썸네일을 오프스크린으로 구울 때도
 * 같은 장식이 나와야 한다.
 */
export function buildDollDress({ name, size, look, dims, hull }: Args): Group {
  const root = new Group()
  const h = dims.height
  /** 목걸이가 앉는 높이 — 얼굴 아래, 몸통 위쪽 */
  const collarY = -h * 0.28
  /** 배 무늬는 몸통 아래쪽 */
  const bellyY = -h * 0.4

  const body = sectionAt(hull, collarY, h * 0.06)
  const belly = sectionAt(hull, bellyY, h * 0.05)
  const r = Math.max(body.halfWidth, body.halfDepth) || Math.max(dims.width, dims.depth) / 2
  /** 앞면 바로 바깥 — 리본·이름표를 여기에 붙인다 */
  const front = (body.halfDepth || dims.depth / 2) * 1.04

  const cloth = (color: string, rough = 0.65) =>
    new MeshStandardMaterial({ color, roughness: rough })

  // 배 무늬 — 몸통 앞의 밝은 천 조각
  const patch = new Mesh(
    new CircleGeometry(r * 0.26, 20),
    new MeshStandardMaterial({
      color: '#fff6ea',
      roughness: 0.95,
      transparent: true,
      opacity: 0.5,
    }),
  )
  patch.position.set(0, bellyY, (belly.halfDepth || dims.depth / 2) * 1.03)
  patch.scale.set(1, 1.2, 1)
  root.add(patch)

  if (!look.hasRibbon) return root

  const collar = new Group()
  collar.position.y = collarY
  root.add(collar)

  /*
   * 목걸이 끈.
   * 두툼한 목도리를 두르려 해봤지만, 모델마다 몸통 단면이 달라 어느 쪽에
   * 맞추든 다른 쪽에서 판때기처럼 튀어나왔다. 얇은 끈은 몸통에 조금
   * 파묻혀도 자연스럽게 보인다.
   */
  const cord = new Mesh(new TorusGeometry(r * 0.95, r * 0.035, 6, 24), cloth(look.ribbon, 0.7))
  cord.rotation.x = Math.PI / 2
  collar.add(cord)

  // 리본 — 고리 둘에 매듭 하나, 가슴 앞에
  const bow = new Group()
  bow.position.set(0, r * 0.06, front + r * 0.1)
  collar.add(bow)
  for (const side of [-1, 1]) {
    const loop = new Mesh(new SphereGeometry(r * 0.22, 10, 8), cloth(look.ribbon, 0.6))
    loop.position.x = side * r * 0.26
    loop.rotation.z = side * 0.5
    loop.scale.set(1, 0.62, 0.45)
    loop.castShadow = true
    bow.add(loop)
  }
  const knot = new Mesh(new SphereGeometry(r * 0.11, 10, 8), cloth(look.ribbon, 0.55))
  knot.castShadow = true
  bow.add(knot)

  // 이름표 — 목걸이에서 아래로 늘어뜨린다
  const tag = new Group()
  tag.position.set(0, collarY - r * 0.46, front + r * 0.06)
  tag.rotation.x = -0.28
  root.add(tag)

  const plate = new Mesh(new BoxGeometry(r * 0.66, r * 0.4, r * 0.05), cloth(look.tag, 0.6))
  plate.castShadow = true
  tag.add(plate)

  const label = new Mesh(
    new PlaneGeometry(r * 0.6, r * 0.34),
    new MeshBasicMaterial({ map: nameTagTexture(name, look.tag), toneMapped: false }),
  )
  label.position.z = r * 0.032
  tag.add(label)

  // 대형은 왕관 — 제일 귀한 인형이라 머리 위에서 티가 나야 한다
  if (size === 'large') {
    const crown = new Group()
    // 정수리에 얹는다. 모델 윗부분 단면을 재서 그 폭에 맞춘다.
    const head = sectionAt(hull, h * 0.36, h * 0.06)
    const headR = Math.max(head.halfWidth, head.halfDepth) || r * 0.6
    crown.position.y = h * 0.42
    root.add(crown)

    const gold = new MeshStandardMaterial({
      color: '#f0bb52',
      metalness: 0.85,
      roughness: 0.25,
      side: DoubleSide,
    })
    const bandMesh = new Mesh(
      new CylinderGeometry(headR * 0.72, headR * 0.8, headR * 0.5, 12, 1, true),
      gold,
    )
    bandMesh.castShadow = true
    crown.add(bandMesh)

    const spike = new MeshStandardMaterial({
      color: '#ffd98a',
      metalness: 0.8,
      roughness: 0.25,
    })
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2
      const tip = new Mesh(new ConeGeometry(headR * 0.16, headR * 0.38, 6), spike)
      tip.position.set(
        Math.cos(a) * headR * 0.76,
        headR * 0.42,
        Math.sin(a) * headR * 0.76,
      )
      tip.castShadow = true
      crown.add(tip)
    }
  }

  return root
}
