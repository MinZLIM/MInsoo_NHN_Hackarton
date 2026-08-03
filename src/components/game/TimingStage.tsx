import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import {
  LARGE_START_SEC,
  LARGE_TARGET_SEC,
  LARGE_TOLERANCE_SEC,
  SCORE_PER_DOLL,
} from '@/lib/constants'

interface Props {
  /** 1회성 판정이므로 성공 시 1, 실패 시 0을 넘긴다 */
  onEnd: (caught: number) => void
}

type Result = { stopped: number; success: boolean }

const RESULT_HOLD_MS = 1800

/**
 * 대형 인형뽑기 (F2-7).
 * 1.00초부터 올라가는 타이머를 20.00초에 맞춰 멈추면 박스가 열린다. 기회는 한 번뿐이다. (REQ-GAME-02)
 */
export function TimingStage({ onEnd }: Props) {
  const [elapsed, setElapsed] = useState(LARGE_START_SEC)
  const [result, setResult] = useState<Result | null>(null)

  const startedAt = useRef(0)
  const rafRef = useRef(0)
  const onEndRef = useRef(onEnd)
  onEndRef.current = onEnd
  // 렌더 사이에 값이 갱신되지 않아도 정확한 시각으로 판정하도록 별도로 들고 있는다.
  const elapsedRef = useRef(LARGE_START_SEC)
  const doneRef = useRef(false)

  useEffect(() => {
    startedAt.current = Date.now()

    const loop = () => {
      if (doneRef.current) return
      const now = LARGE_START_SEC + (Date.now() - startedAt.current) / 1000
      elapsedRef.current = now
      setElapsed(now)

      // 20.00초를 넘겨도 안 누르면 실패로 확정한다
      if (now >= LARGE_TARGET_SEC + 3) {
        finish(now)
        return
      }
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        finish(elapsedRef.current)
      }
    }
    window.addEventListener('keydown', onKeyDown)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  const finish = (stopped: number) => {
    if (doneRef.current) return
    doneRef.current = true
    cancelAnimationFrame(rafRef.current)

    const success = Math.abs(stopped - LARGE_TARGET_SEC) <= LARGE_TOLERANCE_SEC
    setResult({ stopped, success })
    setElapsed(stopped)

    // 결과를 잠깐 보여준 뒤 정산으로 넘어간다
    setTimeout(() => onEndRef.current(success ? 1 : 0), RESULT_HOLD_MS)
  }

  const diff = result ? result.stopped - LARGE_TARGET_SEC : 0

  return (
    <div className="stage">
      <div className="stage__hud">
        <div className="stage__timer">🎯 목표 {LARGE_TARGET_SEC.toFixed(2)}초</div>
        <div className="stage__score">
          성공 시 <strong>{SCORE_PER_DOLL}</strong>점
        </div>
      </div>

      <div className="timing">
        <div
          className={`timing__display${
            result ? (result.success ? ' is-success' : ' is-fail') : ''
          }`}
        >
          {elapsed.toFixed(2)}
          <span className="timing__unit">초</span>
        </div>

        <div className="timing__box" aria-hidden>
          {result ? (result.success ? '🎁' : '📦') : '📦'}
        </div>

        {result ? (
          <p className={`timing__verdict${result.success ? ' is-success' : ''}`}>
            {result.success
              ? '정확합니다! 박스가 열렸습니다 🎉'
              : `${diff > 0 ? '+' : ''}${diff.toFixed(2)}초 — 아쉽게 빗나갔습니다`}
          </p>
        ) : (
          <p className="timing__guide">
            {LARGE_TARGET_SEC.toFixed(2)}초에 맞춰 버튼을 누르세요. 기회는 <strong>한 번</strong>
            뿐입니다.
          </p>
        )}
      </div>

      <div className="stage__controls">
        <Button size="lg" disabled={result !== null} onClick={() => finish(elapsedRef.current)}>
          {result ? '정산 중...' : 'STOP!'}
        </Button>
      </div>

      <p className="stage__hint">Space 또는 버튼 클릭으로 멈춥니다.</p>
    </div>
  )
}
