import { useCallback, useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Joystick } from '@/components/game/Joystick'
import { ClawScene, type ClawPhase, type ClawSceneHandle } from '@/game/three/ClawScene'
import { GRAB_SUCCESS_RATE, SCORE_PER_DOLL, TIME_ATTACK_SEC } from '@/lib/constants'
import { MOCK_DOLLS } from '@/mocks/dolls'
import { dollEmoji } from '@/lib/assets'
import type { DollSize } from '@/types/api'

interface Props {
  /** 60초 종료 시 획득 개수를 넘긴다 */
  onEnd: (caught: number) => void
}

const emojisOf = (size: DollSize) =>
  MOCK_DOLLS.filter((d) => d.size === size).map((d) => dollEmoji(d.image_path))

/** 소형 인형뽑기 3D 스테이지 — 집게를 직접 조준한다 (F2-2, F2-3) */
export function ClawStage({ onEnd }: Props) {
  const handleRef = useRef<ClawSceneHandle | null>(null)
  const onEndRef = useRef(onEnd)
  onEndRef.current = onEnd

  const [caught, setCaught] = useState(0)
  const [phase, setPhase] = useState<ClawPhase>('aim')
  const [remain, setRemain] = useState(TIME_ATTACK_SEC)
  const [ended, setEnded] = useState(false)

  const caughtRef = useRef(0)
  caughtRef.current = caught

  const onReady = useCallback((handle: ClawSceneHandle) => {
    handleRef.current = handle
  }, [])

  const move = (x: number, z: number) => handleRef.current?.move(x, z)
  const drop = () => handleRef.current?.drop()

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') move(-1, 0)
      else if (e.key === 'ArrowRight') move(1, 0)
      else if (e.key === 'ArrowUp') move(0, -1)
      else if (e.key === 'ArrowDown') move(0, 1)
      else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        drop()
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key.startsWith('Arrow')) move(0, 0)
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  // 60초 타임어택
  useEffect(() => {
    const startedAt = Date.now()
    const id = setInterval(() => {
      const left = TIME_ATTACK_SEC - Math.floor((Date.now() - startedAt) / 1000)
      if (left <= 0) {
        clearInterval(id)
        setRemain(0)
        setEnded(true)
        onEndRef.current(caughtRef.current)
        return
      }
      setRemain(left)
    }, 200)
    return () => clearInterval(id)
  }, [])

  const busy = phase !== 'aim' || ended

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

      <div className="stage__cabinet stage__cabinet--3d">
        <Canvas
          shadows
          dpr={[1, 2]}
          camera={{ position: [0, 2.5, 5.8], fov: 46 }}
          gl={{ antialias: true }}
          // 기본 카메라는 원점을 보므로 기계 중앙 높이로 시선을 올린다
          onCreated={({ camera }) => camera.lookAt(0, 1.0, 0)}
        >
          <color attach="background" args={['#151230']} />
          <fog attach="fog" args={['#151230', 16, 30]} />
          <ClawScene
            emojis={emojisOf('small')}
            control="manual"
            grabSuccessRate={GRAB_SUCCESS_RATE.small}
            onCatch={setCaught}
            onPhaseChange={setPhase}
            onReady={onReady}
          />
        </Canvas>
      </div>

      {/* 아케이드 조작반 — 조이스틱으로 옮기고 빨간 버튼으로 내린다 */}
      <div className="panel">
        <Joystick disabled={busy} onChange={move} />

        <button
          className="arcade-btn"
          disabled={busy}
          onClick={drop}
          aria-label="집게 내리기"
          title="집게 내리기"
        >
          <span className="arcade-btn__face" aria-hidden />
        </button>
      </div>

      <p className="stage__hint">
        조이스틱으로 집게를 옮기고 빨간 버튼으로 내립니다. (키보드 ← → ↑ ↓ / Space)
      </p>
    </div>
  )
}
