/**
 * 3D 인형뽑기 기계의 치수. 씬 전체가 이 값을 공유한다.
 * 단위는 미터에 가깝게 잡아 Rapier의 기본 중력(-9.81)이 자연스럽게 보이도록 했다.
 */

export const CABINET = {
  /** 내부 바닥 크기 */
  width: 4.4,
  depth: 3.2,
  height: 3.4,
  wallThickness: 0.12,
}

export const HALF_W = CABINET.width / 2
export const HALF_D = CABINET.depth / 2

/** 왼쪽 투입구 — 이 구간에는 바닥이 없어 인형이 아래로 빠진다. */
export const HOLE = {
  /** 투입구 오른쪽 끝 x. 이보다 왼쪽은 바닥이 없다. */
  edgeX: -HALF_W + 1.0,
  lipHeight: 0.28,
}

export const HOLE_CENTER_X = (-HALF_W + HOLE.edgeX) / 2

/** 집게가 움직일 수 있는 범위. 투입구 위로는 조준할 수 없다. */
export const CLAW_BOUNDS = {
  minX: HOLE.edgeX + 0.4,
  maxX: HALF_W - 0.4,
  minZ: -HALF_D + 0.4,
  maxZ: HALF_D - 0.4,
}

export const CLAW = {
  /** 대기 높이 */
  topY: 2.7,
  /** 최대 하강 높이 (집게 끝이 바닥 인형에 닿는 위치) */
  bottomY: 0.62,
  speedXZ: 1.9,
  speedY: 1.7,
  carrySpeed: 2.2,
  /** 집게 중심에서 이 거리 안의 인형을 잡는다 */
  grabRadius: 0.46,
}

export const DOLL = {
  radius: 0.24,
  count: 16,
}

/** 이 높이보다 아래로 내려간 인형은 투입구로 빠진 것으로 본다 */
export const FALL_THRESHOLD = -2.2
