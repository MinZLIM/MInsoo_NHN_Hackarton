/**
 * 직접 만든 인형 모델.
 *
 * 기본 몸통은 Kenney "Cube Pets"(CC0) 24종을 쓰지만, 그 안에 없는 동물은
 * 엉뚱한 모델이 배정됐다. 드래곤이 원숭이로, 문어가 게로, 유니콘이 기린으로
 * 나오는 식이라 이름과 생김새가 아예 달랐다.
 *
 * 그런 종만 여기서 상자·구·원뿔로 짜 맞춰 만든다. Kenney 모델과 톤을 맞추려고
 * 각지고 단순한 형태에 flatShading을 쓴다.
 *
 * 좌표 약속: +Z가 앞(얼굴), 원점이 몸통 중앙. 최종 크기와 위치는
 * prepareDollObject가 다시 맞추므로 여기서는 비율만 신경 쓰면 된다.
 */

import {
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  SphereGeometry,
  TorusGeometry,
} from 'three'

type Vec = [number, number, number]

const materials = new Map<string, MeshStandardMaterial>()

function mat(color: string, opts: { rough?: number; metal?: number } = {}) {
  const key = `${color}|${opts.rough ?? 0.9}|${opts.metal ?? 0}`
  let m = materials.get(key)
  if (!m) {
    m = new MeshStandardMaterial({
      color,
      roughness: opts.rough ?? 0.9,
      metalness: opts.metal ?? 0,
      flatShading: true,
    })
    materials.set(key, m)
  }
  return m
}

function place(mesh: Mesh, pos: Vec, rot?: Vec, scale?: Vec) {
  mesh.position.set(...pos)
  if (rot) mesh.rotation.set(...rot)
  if (scale) mesh.scale.set(...scale)
  return mesh
}

const box = (size: Vec, color: string, pos: Vec, rot?: Vec) =>
  place(new Mesh(new BoxGeometry(...size), mat(color)), pos, rot)

const ball = (r: number, color: string, pos: Vec, scale?: Vec) =>
  place(new Mesh(new SphereGeometry(r, 10, 8), mat(color)), pos, undefined, scale)

const cone = (r: number, h: number, color: string, pos: Vec, rot?: Vec) =>
  place(new Mesh(new ConeGeometry(r, h, 7), mat(color)), pos, rot)

const tube = (rTop: number, rBottom: number, h: number, color: string, pos: Vec, rot?: Vec) =>
  place(new Mesh(new CylinderGeometry(rTop, rBottom, h, 9), mat(color)), pos, rot)

const ring = (r: number, tubeR: number, color: string, pos: Vec, rot?: Vec) =>
  place(new Mesh(new TorusGeometry(r, tubeR, 6, 14), mat(color)), pos, rot)

const metal = (r: number, h: number, color: string, pos: Vec, rot?: Vec) =>
  place(
    new Mesh(new CylinderGeometry(r, r, h, 10), mat(color, { rough: 0.3, metal: 0.85 })),
    pos,
    rot,
  )

/** 눈 한 쌍 — 흰자 위에 검은 눈동자. 모든 인형이 같은 눈을 쓴다. */
function eyes(y: number, z: number, spread: number, r: number) {
  const g = new Group()
  for (const side of [-1, 1]) {
    g.add(ball(r, '#ffffff', [side * spread, y, z], [1, 1, 0.55]))
    g.add(ball(r * 0.52, '#241c33', [side * spread, y, z + r * 0.5]))
  }
  return g
}

/** 다리 네 개 — 몸통 아래 모서리에 */
function legs(color: string, y: number, dx: number, dz: number, size: Vec) {
  const g = new Group()
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    g.add(box(size, color, [sx * dx, y, sz * dz]))
  }
  return g
}

function build(parts: Object3D[]) {
  const g = new Group()
  parts.forEach((p) => g.add(p))
  return g
}

/* ── 종별 모델 ─────────────────────────────────────────────── */

function octopus() {
  const skin = '#c86ad6'
  const parts: Object3D[] = [
    ball(0.46, skin, [0, 0.18, 0], [1, 0.95, 1]),
    eyes(0.26, 0.4, 0.17, 0.12),
    // 입 — 작은 부리
    ball(0.06, '#7b3d90', [0, 0.06, 0.44]),
  ]
  // 다리 여덟 개를 원형으로 두르고 바깥으로 눕힌다
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2
    parts.push(
      tube(0.07, 0.03, 0.42, skin, [Math.cos(a) * 0.28, -0.26, Math.sin(a) * 0.28], [
        Math.cos(a) * 0.5,
        0,
        -Math.sin(a) * 0.5,
      ]),
    )
  }
  return build(parts)
}

function squid() {
  const skin = '#7fb6f0'
  const parts: Object3D[] = [
    // 원뿔형 몸통 — 문어와 확실히 구분되는 실루엣
    cone(0.34, 0.72, skin, [0, 0.3, 0]),
    // 지느러미
    cone(0.16, 0.3, '#5b93cf', [0, 0.62, 0], [Math.PI, 0, 0]),
    ball(0.3, skin, [0, -0.06, 0], [1, 0.7, 1]),
    eyes(-0.02, 0.26, 0.16, 0.11),
  ]
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2
    parts.push(
      tube(0.05, 0.02, 0.46, skin, [Math.cos(a) * 0.17, -0.4, Math.sin(a) * 0.17], [
        Math.cos(a) * 0.2,
        0,
        -Math.sin(a) * 0.2,
      ]),
    )
  }
  // 긴 촉수 두 개
  for (const side of [-1, 1]) {
    parts.push(tube(0.04, 0.02, 0.66, skin, [side * 0.1, -0.5, 0.06], [0.12, 0, 0]))
  }
  return build(parts)
}

function turtle() {
  const shell = '#4fa86b'
  const skin = '#d7c07a'
  const parts: Object3D[] = [
    // 등딱지 — 위가 둥글고 아래가 납작
    ball(0.46, shell, [0, 0.1, 0], [1, 0.62, 1.05]),
    ball(0.42, '#3b8253', [0, 0.02, 0], [1, 0.34, 1]),
    // 등딱지 무늬
    ...[0, 1, 2, 3, 4].map((i) => {
      const a = (i / 5) * Math.PI * 2
      return ball(0.1, '#377a4c', [Math.cos(a) * 0.24, 0.32, Math.sin(a) * 0.24], [1, 0.35, 1])
    }),
    // 머리
    ball(0.2, skin, [0, 0.08, 0.46], [1, 0.9, 1.1]),
    eyes(0.14, 0.6, 0.09, 0.07),
    // 꼬리
    cone(0.07, 0.16, skin, [0, 0.02, -0.5], [-Math.PI / 2, 0, 0]),
    legs(skin, -0.12, 0.3, 0.26, [0.16, 0.14, 0.22]),
  ]
  return build(parts)
}

function frog() {
  const skin = '#6fce5c'
  const parts: Object3D[] = [
    ball(0.42, skin, [0, 0, 0], [1.05, 0.82, 1]),
    // 배
    ball(0.3, '#e9f5c4', [0, -0.12, 0.28], [1, 0.7, 0.5]),
    // 툭 튀어나온 눈
    ball(0.15, skin, [-0.2, 0.34, 0.16]),
    ball(0.15, skin, [0.2, 0.34, 0.16]),
    ball(0.1, '#ffffff', [-0.2, 0.38, 0.24]),
    ball(0.1, '#ffffff', [0.2, 0.38, 0.24]),
    ball(0.055, '#241c33', [-0.2, 0.39, 0.31]),
    ball(0.055, '#241c33', [0.2, 0.39, 0.31]),
    // 입
    box([0.34, 0.03, 0.02], '#3f8a35', [0, -0.06, 0.41]),
    // 앞다리
    tube(0.06, 0.06, 0.24, skin, [-0.3, -0.24, 0.2], [0.5, 0, 0.3]),
    tube(0.06, 0.06, 0.24, skin, [0.3, -0.24, 0.2], [0.5, 0, -0.3]),
    // 접힌 뒷다리
    ball(0.16, skin, [-0.36, -0.2, -0.1], [1, 0.8, 1.3]),
    ball(0.16, skin, [0.36, -0.2, -0.1], [1, 0.8, 1.3]),
  ]
  return build(parts)
}

function sheep() {
  const wool = '#f4efe4'
  const skin = '#5a5063'
  const parts: Object3D[] = [ball(0.44, wool, [0, 0.05, 0], [1.05, 1, 1])]
  // 뭉게뭉게한 양털
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2
    const tier = i % 3
    parts.push(
      ball(0.19, wool, [
        Math.cos(a) * 0.36,
        0.05 + (tier - 1) * 0.25,
        Math.sin(a) * 0.34,
      ]),
    )
  }
  parts.push(
    // 얼굴
    ball(0.2, skin, [0, 0.02, 0.46], [1, 1.15, 1]),
    // 앞머리 털
    ball(0.14, wool, [0, 0.2, 0.42]),
    eyes(0.06, 0.6, 0.09, 0.065),
    // 옆으로 처진 귀
    ball(0.09, skin, [-0.22, 0.08, 0.42], [1.4, 0.6, 0.7]),
    ball(0.09, skin, [0.22, 0.08, 0.42], [1.4, 0.6, 0.7]),
    legs(skin, -0.42, 0.24, 0.2, [0.12, 0.34, 0.12]),
  )
  return build(parts)
}

function unicorn(gold = false) {
  const body = gold ? '#f3d27a' : '#fdf3fb'
  const mane = gold ? '#e8a93d' : '#ff9ad5'
  const horn = gold ? '#fff0b8' : '#ffd76a'
  const parts: Object3D[] = [
    box([0.62, 0.46, 0.8], body, [0, 0, -0.06]),
    // 목과 머리
    box([0.32, 0.44, 0.3], body, [0, 0.34, 0.28], [-0.35, 0, 0]),
    box([0.3, 0.3, 0.44], body, [0, 0.6, 0.5]),
    // 주둥이
    box([0.22, 0.18, 0.16], gold ? '#e8c46a' : '#f6dcea', [0, 0.52, 0.72]),
    eyes(0.66, 0.68, 0.13, 0.075),
    // 뿔 — 유니콘의 핵심
    cone(0.07, 0.34, horn, [0, 0.86, 0.56], [0.2, 0, 0]),
    // 갈기
    ...[0, 1, 2, 3].map((i) =>
      box([0.12, 0.2, 0.16], mane, [0, 0.74 - i * 0.14, 0.34 - i * 0.06], [0.3, 0, 0]),
    ),
    // 꼬리
    box([0.14, 0.34, 0.14], mane, [0, 0.12, -0.5], [0.4, 0, 0]),
    // 귀
    cone(0.05, 0.14, body, [-0.11, 0.78, 0.44]),
    cone(0.05, 0.14, body, [0.11, 0.78, 0.44]),
    legs(body, -0.36, 0.2, 0.28, [0.16, 0.34, 0.16]),
  ]
  return build(parts)
}

function dragon() {
  const scale = '#7be07b'
  const belly = '#f4e6a8'
  const parts: Object3D[] = [
    box([0.56, 0.5, 0.72], scale, [0, 0, -0.04]),
    ball(0.22, belly, [0, -0.08, 0.32], [1.1, 1.2, 0.4]),
    // 머리
    box([0.42, 0.38, 0.42], scale, [0, 0.42, 0.3]),
    // 주둥이
    box([0.28, 0.2, 0.24], scale, [0, 0.34, 0.56]),
    box([0.24, 0.05, 0.2], '#3f9c4f', [0, 0.26, 0.58]),
    eyes(0.5, 0.48, 0.15, 0.085),
    // 뿔
    cone(0.06, 0.24, '#f6efbf', [-0.13, 0.66, 0.2], [-0.4, 0, -0.2]),
    cone(0.06, 0.24, '#f6efbf', [0.13, 0.66, 0.2], [-0.4, 0, 0.2]),
    // 날개 — 드래곤이라는 걸 한눈에 알리는 부분
    box([0.5, 0.34, 0.06], '#5bbf6a', [-0.46, 0.24, -0.16], [0, 0.35, 0.45]),
    box([0.5, 0.34, 0.06], '#5bbf6a', [0.46, 0.24, -0.16], [0, -0.35, -0.45]),
    // 등 가시
    ...[0, 1, 2].map((i) =>
      cone(0.06, 0.16, '#f6efbf', [0, 0.28 - i * 0.02, -0.12 - i * 0.18], [0.2, 0, 0]),
    ),
    // 꼬리
    tube(0.06, 0.14, 0.42, scale, [0, -0.06, -0.52], [0.9, 0, 0]),
    legs(scale, -0.34, 0.2, 0.24, [0.16, 0.3, 0.18]),
  ]
  return build(parts)
}

function dino() {
  const skin = '#66c6d8'
  const parts: Object3D[] = [
    ball(0.4, skin, [0, 0, -0.06], [1.1, 1, 1.25]),
    // 긴 목과 작은 머리 — 초식공룡 실루엣
    tube(0.12, 0.17, 0.56, skin, [0, 0.44, 0.2], [-0.35, 0, 0]),
    ball(0.17, skin, [0, 0.74, 0.42], [1, 0.9, 1.2]),
    ball(0.1, '#4ba3b5', [0, 0.68, 0.58]),
    eyes(0.8, 0.5, 0.1, 0.06),
    // 등판
    ...[0, 1, 2].map((i) =>
      cone(0.08, 0.18, '#f5c86a', [0, 0.32, -0.1 - i * 0.2], [0.15, 0, 0]),
    ),
    // 두꺼운 꼬리
    tube(0.08, 0.2, 0.5, skin, [0, -0.06, -0.56], [1.1, 0, 0]),
    legs(skin, -0.32, 0.22, 0.2, [0.2, 0.32, 0.2]),
  ]
  return build(parts)
}

function robot(legendary = false) {
  const shell = legendary ? '#f0c04c' : '#c3ccdd'
  const dark = legendary ? '#8a6a1e' : '#5a6480'
  const glow = legendary ? '#fff2c2' : '#4fe3ff'
  const parts: Object3D[] = [
    box([0.6, 0.56, 0.44], shell, [0, -0.04, 0]),
    // 가슴 램프
    box([0.22, 0.12, 0.04], glow, [0, 0.06, 0.23]),
    // 머리
    box([0.46, 0.38, 0.4], shell, [0, 0.48, 0]),
    // 바이저 — 눈 대신
    box([0.34, 0.12, 0.04], glow, [0, 0.5, 0.21]),
    // 안테나
    metal(0.02, 0.22, dark, [0, 0.76, 0]),
    ball(0.06, glow, [0, 0.88, 0]),
    // 팔
    metal(0.07, 0.36, dark, [-0.38, 0, 0]),
    metal(0.07, 0.36, dark, [0.38, 0, 0]),
    box([0.14, 0.12, 0.14], shell, [-0.38, -0.22, 0]),
    box([0.14, 0.12, 0.14], shell, [0.38, -0.22, 0]),
    // 다리
    metal(0.08, 0.3, dark, [-0.17, -0.44, 0]),
    metal(0.08, 0.3, dark, [0.17, -0.44, 0]),
    box([0.18, 0.1, 0.26], shell, [-0.17, -0.62, 0.04]),
    box([0.18, 0.1, 0.26], shell, [0.17, -0.62, 0.04]),
  ]
  return build(parts)
}

function alien() {
  const skin = '#93e57a'
  const parts: Object3D[] = [
    // 아래로 갈수록 좁아지는 머리
    ball(0.4, skin, [0, 0.34, 0], [1, 1.15, 0.9]),
    box([0.34, 0.34, 0.26], skin, [0, -0.06, 0]),
    // 크고 검은 눈
    ball(0.15, '#181228', [-0.16, 0.36, 0.28], [1, 1.5, 0.7]),
    ball(0.15, '#181228', [0.16, 0.36, 0.28], [1, 1.5, 0.7]),
    ball(0.045, '#ffffff', [-0.19, 0.46, 0.36]),
    ball(0.045, '#ffffff', [0.13, 0.46, 0.36]),
    box([0.14, 0.02, 0.02], '#4f9c3f', [0, 0.12, 0.34]),
    // 더듬이
    metal(0.015, 0.2, '#5fae4c', [-0.14, 0.72, 0], [0, 0, 0.3]),
    metal(0.015, 0.2, '#5fae4c', [0.14, 0.72, 0], [0, 0, -0.3]),
    ball(0.05, '#ffe066', [-0.2, 0.84, 0]),
    ball(0.05, '#ffe066', [0.2, 0.84, 0]),
    // 가는 팔다리
    tube(0.04, 0.04, 0.3, skin, [-0.24, -0.08, 0], [0, 0, 0.45]),
    tube(0.04, 0.04, 0.3, skin, [0.24, -0.08, 0], [0, 0, -0.45]),
    tube(0.05, 0.05, 0.26, skin, [-0.11, -0.34, 0]),
    tube(0.05, 0.05, 0.26, skin, [0.11, -0.34, 0]),
  ]
  return build(parts)
}

function shark() {
  const skin = '#6f8fb5'
  const parts: Object3D[] = [
    ball(0.36, skin, [0, 0, 0.06], [1, 0.92, 1.5]),
    ball(0.26, '#e8eef5', [0, -0.14, 0.12], [0.9, 0.55, 1.3]),
    // 뾰족한 주둥이
    cone(0.2, 0.34, skin, [0, 0.02, 0.6], [Math.PI / 2, 0, 0]),
    eyes(0.12, 0.4, 0.19, 0.07),
    // 이빨
    ...[-2, -1, 0, 1, 2].map((i) =>
      cone(0.03, 0.07, '#ffffff', [i * 0.07, -0.1, 0.46], [Math.PI, 0, 0]),
    ),
    // 등지느러미
    cone(0.14, 0.32, skin, [0, 0.36, -0.02], [0, 0, 0.12]),
    // 가슴지느러미
    cone(0.1, 0.28, skin, [-0.32, -0.1, 0.1], [0, 0, 1.3]),
    cone(0.1, 0.28, skin, [0.32, -0.1, 0.1], [0, 0, -1.3]),
    // 꼬리지느러미
    cone(0.16, 0.34, skin, [0, 0.12, -0.62], [-1.2, 0, 0]),
    cone(0.13, 0.26, skin, [0, -0.12, -0.6], [1.2, 0, 0]),
  ]
  return build(parts)
}

function whale(space = false) {
  const skin = space ? '#8f7ce8' : '#5fa8d8'
  const belly = space ? '#ded4ff' : '#e6f2fb'
  const parts: Object3D[] = [
    ball(0.44, skin, [0, 0, 0], [1, 0.9, 1.35]),
    ball(0.32, belly, [0, -0.2, 0.06], [1, 0.5, 1.15]),
    // 입선
    box([0.5, 0.03, 0.02], '#3d7ba6', [0, -0.1, 0.52]),
    eyes(0.06, 0.44, 0.26, 0.075),
    // 물줄기
    tube(0.05, 0.03, 0.18, '#bfe6ff', [0, 0.48, -0.08]),
    ball(0.11, '#d6f0ff', [0, 0.62, -0.08]),
    // 가슴지느러미
    cone(0.1, 0.3, skin, [-0.4, -0.14, 0.06], [0, 0, 1.4]),
    cone(0.1, 0.3, skin, [0.4, -0.14, 0.06], [0, 0, -1.4]),
    // 꼬리
    cone(0.13, 0.3, skin, [-0.14, 0.04, -0.62], [-1.2, 0, -0.5]),
    cone(0.13, 0.3, skin, [0.14, 0.04, -0.62], [-1.2, 0, 0.5]),
  ]
  if (space) {
    // 우주 고래 — 별 고리를 두른다
    parts.push(ring(0.6, 0.025, '#ffe08a', [0, 0.05, 0], [1.3, 0, 0.3]))
    parts.push(ball(0.05, '#fff3c4', [0.6, 0.2, 0]))
    parts.push(ball(0.04, '#fff3c4', [-0.55, -0.1, 0.2]))
  }
  return build(parts)
}

function squirrel() {
  const fur = '#d08a4a'
  const parts: Object3D[] = [
    ball(0.32, fur, [0, -0.06, 0], [1, 1.05, 1]),
    ball(0.2, '#f2dfc0', [0, -0.1, 0.24], [1, 1.1, 0.5]),
    ball(0.28, fur, [0, 0.32, 0.06], [1, 0.95, 1]),
    ball(0.1, '#f2dfc0', [0, 0.24, 0.28]),
    ball(0.05, '#4a3020', [0, 0.28, 0.36]),
    eyes(0.38, 0.24, 0.12, 0.075),
    // 귀
    cone(0.07, 0.16, fur, [-0.16, 0.58, 0.02]),
    cone(0.07, 0.16, fur, [0.16, 0.58, 0.02]),
    // 큼직한 꼬리 — 다람쥐의 특징
    ball(0.16, '#e0a566', [0, 0.02, -0.42]),
    ball(0.18, '#e0a566', [0, 0.28, -0.5]),
    ball(0.16, '#e0a566', [0, 0.52, -0.4]),
    ball(0.12, '#f0c894', [0, 0.66, -0.24]),
    // 앞발
    ball(0.08, fur, [-0.16, -0.24, 0.2]),
    ball(0.08, fur, [0.16, -0.24, 0.2]),
  ]
  return build(parts)
}

/**
 * 이름 → 직접 만든 모델.
 * 여기 없는 이름은 Kenney 모델을 그대로 쓴다. (dollModels.EXACT)
 */
const BUILDERS: Record<string, () => Group> = {
  문어: octopus,
  오징어: squid,
  거북이: turtle,
  개구리: frog,
  양: sheep,
  대형양: sheep,
  유니콘: () => unicorn(false),
  '황금 유니콘': () => unicorn(true),
  드래곤: dragon,
  메가드래곤: dragon,
  '거대 드래곤': dragon,
  공룡: dino,
  로봇: () => robot(false),
  '전설의 로봇': () => robot(true),
  외계인: alien,
  상어: shark,
  빅샤크: shark,
  고래: () => whale(false),
  '우주 고래': () => whale(true),
  다람쥐: squirrel,
}

export function hasProceduralDoll(name: string) {
  return name in BUILDERS
}

/** 직접 만든 모델을 새로 하나 만든다. 없으면 null. */
export function buildProceduralDoll(name: string): Group | null {
  return BUILDERS[name]?.() ?? null
}
