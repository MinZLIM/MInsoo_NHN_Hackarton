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

/**
 * 중형 — 빨래집게 기계 (F2-8).
 * 수평으로 도는 원판 가장자리에 빨래집게가 달려 있고, 각 집게가 인형을 물고 있다.
 * 버튼을 누르면 상단 바가 내려와 그 순간 누름 위치에 온 집게를 눌러 연다.
 */
export const CLIP = {
  /** 원판 중심 높이 */
  discY: 2.34,
  discRadius: 1.28,
  discThickness: 0.14,
  /** 집게가 달린 반지름 */
  armRadius: 1.28,
  slots: 8,
  /** 회전 각속도 (rad/s) — 높을수록 어렵다 */
  spinSpeed: 1.2,

  /** 집게 몸통 중심 높이 */
  clipY: 2.1,
  /** 매달린 인형 중심 높이 */
  dollY: 1.62,

  /** 누름 바가 작동하는 각도 — 카메라 정면(+z) */
  triggerAngle: Math.PI / 2,
  /** 이 각도 안에 집게가 들어와 있으면 눌린다 */
  toleranceRad: 0.19,

  /** 바가 대기하는 높이(아랫면 기준)와 집게를 누르는 높이 */
  barTopY: 3.2,
  barPressY: 2.24,
  barDownSpeed: 3.3,
  barUpSpeed: 2.7,
} as const
