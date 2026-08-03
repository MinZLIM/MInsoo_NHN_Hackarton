import { useCallback, useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Button } from '@/components/ui/Button'
import { ClawScene, type ClawPhase, type ClawSceneHandle } from '@/game/three/ClawScene'
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

/** 소형·중형 인형뽑기 3D 스테이지 (F2-2, F2-3, F2-8) */
export function ClawStage({ mode, onEnd }: Props) {
  const handleRef = useRef<ClawSceneHandle | null>(null)
  const onEndRef = useRef(onEnd)
  onEndRef.current = onEnd

  const [caught, setCaught] = useState(0)
  const [phase, setPhase] = useState<ClawPhase>('aim')
  const [remain, setRemain] = useState(TIME_ATTACK_SEC)
  const [ended, setEnded] = useState(false)

  const caughtRef = useRef(0)
  caughtRef.current = caught

  const swing = mode === 'medium'

  const onReady = useCallback((handle: ClawSceneHandle) => {
    handleRef.current = handle
  }, [])

  const move = (x: -1 | 0 | 1, z: -1 | 0 | 1) => handleRef.current?.move(x, z)
  const drop = () => handleRef.current?.drop()

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && !swing) move(-1, 0)
      else if (e.key === 'ArrowRight' && !swing) move(1, 0)
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
  }, [swing])

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
          camera={{ position: [0, 2.9, 6.4], fov: 46 }}
          gl={{ antialias: true }}
          // 기본 카메라는 원점을 보므로 기계 중앙 높이로 시선을 올린다
          onCreated={({ camera }) => camera.lookAt(0, 1.15, 0)}
        >
          <color attach="background" args={['#151230']} />
          <fog attach="fog" args={['#151230', 13, 24]} />
          <ClawScene
            emojis={emojisOf(mode)}
            control={swing ? 'swing' : 'manual'}
            grabSuccessRate={GRAB_SUCCESS_RATE[mode]}
            onCatch={setCaught}
            onPhaseChange={setPhase}
            onReady={onReady}
          />
        </Canvas>
      </div>

      <div className="stage__controls">
        {swing ? null : (
          <Button
            variant="ghost"
            disabled={busy}
            onPointerDown={() => move(-1, 0)}
            onPointerUp={() => move(0, 0)}
            onPointerLeave={() => move(0, 0)}
          >
            ◀
          </Button>
        )}

        <Button
          variant="ghost"
          disabled={busy}
          onPointerDown={() => move(0, -1)}
          onPointerUp={() => move(0, 0)}
          onPointerLeave={() => move(0, 0)}
        >
          ▲ 안쪽
        </Button>

        <Button disabled={busy} onClick={drop}>
          집게 내리기
        </Button>

        <Button
          variant="ghost"
          disabled={busy}
          onPointerDown={() => move(0, 1)}
          onPointerUp={() => move(0, 0)}
          onPointerLeave={() => move(0, 0)}
        >
          ▼ 앞쪽
        </Button>

        {swing ? null : (
          <Button
            variant="ghost"
            disabled={busy}
            onPointerDown={() => move(1, 0)}
            onPointerUp={() => move(0, 0)}
            onPointerLeave={() => move(0, 0)}
          >
            ▶
          </Button>
        )}
      </div>

      <p className="stage__hint">
        {swing
          ? '집게가 좌우로 움직입니다. ↑↓ 로 깊이를 맞추고 Space 로 내리세요.'
          : '← → ↑ ↓ 로 집게를 옮기고 Space 로 내립니다.'}
      </p>
    </div>
  )
}
