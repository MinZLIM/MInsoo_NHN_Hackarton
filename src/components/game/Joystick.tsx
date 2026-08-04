import { useCallback, useRef, useState } from 'react'

interface Props {
  disabled?: boolean
  /** 각 축 -1 ~ 1. 손을 떼면 (0, 0)이 온다. */
  onChange: (x: number, y: number) => void
}

/** 손잡이가 움직일 수 있는 최대 거리(px) */
const RANGE = 34
/** 이보다 작게 밀면 무시한다 — 손 떨림으로 집게가 흐르는 걸 막는다 */
const DEADZONE = 0.14

/**
 * 아케이드 조이스틱.
 * 위로 밀면 y가 음수(기계 안쪽), 아래로 밀면 양수(앞쪽)라 3D의 z축에 그대로 대응한다.
 */
export function Joystick({ disabled = false, onChange }: Props) {
  const baseRef = useRef<HTMLDivElement>(null)
  const [knob, setKnob] = useState({ x: 0, y: 0 })
  const [active, setActive] = useState(false)

  const emit = useCallback(
    (dx: number, dy: number) => {
      const dist = Math.hypot(dx, dy)
      // 원 밖으로 나가지 않도록 자른다
      const scale = dist > RANGE ? RANGE / dist : 1
      const kx = dx * scale
      const ky = dy * scale
      setKnob({ x: kx, y: ky })

      const nx = kx / RANGE
      const ny = ky / RANGE
      const strength = Math.hypot(nx, ny)
      if (strength < DEADZONE) onChange(0, 0)
      else onChange(nx, ny)
    },
    [onChange],
  )

  const reset = useCallback(() => {
    setActive(false)
    setKnob({ x: 0, y: 0 })
    onChange(0, 0)
  }, [onChange])

  const pointFrom = (e: React.PointerEvent) => {
    const rect = baseRef.current!.getBoundingClientRect()
    return {
      dx: e.clientX - (rect.left + rect.width / 2),
      dy: e.clientY - (rect.top + rect.height / 2),
    }
  }

  return (
    <div
      ref={baseRef}
      className={`joystick${active ? ' is-active' : ''}${disabled ? ' is-disabled' : ''}`}
      role="application"
      aria-label="집게 이동 조이스틱"
      onPointerDown={(e) => {
        if (disabled) return
        e.currentTarget.setPointerCapture(e.pointerId)
        setActive(true)
        const { dx, dy } = pointFrom(e)
        emit(dx, dy)
      }}
      onPointerMove={(e) => {
        if (disabled || !active) return
        const { dx, dy } = pointFrom(e)
        emit(dx, dy)
      }}
      onPointerUp={reset}
      onPointerCancel={reset}
      onLostPointerCapture={reset}
    >
      <span className="joystick__gate" aria-hidden />
      <span
        className="joystick__shaft"
        aria-hidden
        style={{ transform: `translate(${knob.x * 0.5}px, ${knob.y * 0.5}px)` }}
      />
      <span
        className="joystick__ball"
        aria-hidden
        style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }}
      />
    </div>
  )
}
