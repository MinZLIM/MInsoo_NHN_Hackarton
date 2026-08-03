import { useEffect, useRef, useState } from 'react'
import { CANVAS_SIZE, ClawMachine, type ClawPhase } from '@/game/clawMachine'
import { Button } from '@/components/ui/Button'
import { GRAB_SUCCESS_RATE, SCORE_PER_DOLL, TIME_ATTACK_SEC } from '@/lib/constants'
import { MOCK_DOLLS } from '@/mocks/dolls'
import { dollEmoji } from '@/lib/assets'
import type { DollSize } from '@/types/api'

interface Props {
  /** 소형은 직접 조준, 중형은 자동 왕복하는 집게의 타이밍을 맞춘다 */
  mode: Extract<DollSize, 'small' | 'medium'>
  /** 60초 종료 시 획득 개수를 넘긴다 */
  onEnd: (caught: number) => void
}

const emojisOf = (size: DollSize) =>
  MOCK_DOLLS.filter((d) => d.size === size).map((d) => dollEmoji(d.image_path))

/** 소형·중형 인형뽑기 스테이지 — 캔버스 + 타이머 + 조작부 (F2-2, F2-3, F2-8) */
export function ClawStage({ mode, onEnd }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const machineRef = useRef<ClawMachine | null>(null)
  // onEnd가 매 렌더 새 함수여도 타이머를 재시작하지 않도록 ref로 고정한다.
  const onEndRef = useRef(onEnd)
  onEndRef.current = onEnd

  const [caught, setCaught] = useState(0)
  const [phase, setPhase] = useState<ClawPhase>('aim')
  const [remain, setRemain] = useState(TIME_ATTACK_SEC)

  // 타이머 콜백이 최신 획득 수를 읽도록 ref로도 들고 있는다.
  const caughtRef = useRef(0)
  caughtRef.current = caught

  const swing = mode === 'medium'

  useEffect(() => {
    if (!canvasRef.current) return

    const machine = new ClawMachine({
      canvas: canvasRef.current,
      emojis: emojisOf(mode),
      grabSuccessRate: GRAB_SUCCESS_RATE[mode],
      control: swing ? 'swing' : 'manual',
      onCatch: setCaught,
      onPhaseChange: setPhase,
    })
    machineRef.current = machine
    // 이전 인스턴스의 destroy()가 phase를 'stopped'로 남겨 두므로 새 머신 기준으로 되돌린다.
    // (StrictMode의 이중 마운트에서 조작 버튼이 계속 비활성으로 남는 것을 막는다)
    setPhase(machine.getPhase())

    const onKeyDown = (e: KeyboardEvent) => {
      if (!swing && e.key === 'ArrowLeft') machine.setMove(-1)
      else if (!swing && e.key === 'ArrowRight') machine.setMove(1)
      else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        machine.drop()
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (!swing && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) machine.setMove(0)
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      machine.destroy()
      machineRef.current = null
    }
  }, [mode, swing])

  // 60초 타임어택. 종료 시점의 획득 개수를 넘긴다.
  useEffect(() => {
    const startedAt = Date.now()
    const id = setInterval(() => {
      const left = TIME_ATTACK_SEC - Math.floor((Date.now() - startedAt) / 1000)
      if (left <= 0) {
        clearInterval(id)
        setRemain(0)
        machineRef.current?.destroy()
        onEndRef.current(caughtRef.current)
        return
      }
      setRemain(left)
    }, 200)

    return () => clearInterval(id)
  }, [])

  const busy = phase !== 'aim'
  const move = (dir: -1 | 0 | 1) => machineRef.current?.setMove(dir)

  return (
    <div className="stage">
      <div className="stage__hud">
        <div className={`stage__timer${remain <= 10 ? ' is-urgent' : ''}`}>
          ⏱ {String(remain).padStart(2, '0')}초
        </div>
        <div className="stage__score">
          획득 <strong>{caught}</strong>개 · {caught * SCORE_PER_DOLL}점
        </div>
      </div>

      <div className="stage__cabinet">
        <canvas ref={canvasRef} width={CANVAS_SIZE.width} height={CANVAS_SIZE.height} />
      </div>

      <div className="stage__controls">
        {swing ? null : (
          <Button
            variant="ghost"
            disabled={busy}
            onPointerDown={() => move(-1)}
            onPointerUp={() => move(0)}
            onPointerLeave={() => move(0)}
          >
            ◀ 왼쪽
          </Button>
        )}

        <Button disabled={busy} onClick={() => machineRef.current?.drop()}>
          집게 내리기
        </Button>

        {swing ? null : (
          <Button
            variant="ghost"
            disabled={busy}
            onPointerDown={() => move(1)}
            onPointerUp={() => move(0)}
            onPointerLeave={() => move(0)}
          >
            오른쪽 ▶
          </Button>
        )}
      </div>

      <p className="stage__hint">
        {swing
          ? '집게가 좌우로 움직입니다. Space 로 원하는 위치에서 내리세요.'
          : '키보드 ← → 로 이동, Space 로 집게를 내립니다.'}
      </p>
    </div>
  )
}
