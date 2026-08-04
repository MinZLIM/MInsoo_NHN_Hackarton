import { useCallback, useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Button } from '@/components/ui/Button'
import { ClipScene, type ClipPhase, type ClipSceneHandle } from '@/game/three/ClipScene'
import { SCORE_PER_DOLL, TIME_ATTACK_SEC } from '@/lib/constants'
import { MOCK_DOLLS } from '@/mocks/dolls'
import { dollEmoji } from '@/lib/assets'

interface Props {
  /** 60초 종료 시 획득 개수를 넘긴다 */
  onEnd: (caught: number) => void
}

const EMOJIS = MOCK_DOLLS.filter((d) => d.size === 'medium').map((d) => dollEmoji(d.image_path))
const FLASH_MS = 900

/** 중형 — 빨래집게 인형뽑기 스테이지 (F2-8) */
export function ClipStage({ onEnd }: Props) {
  const handleRef = useRef<ClipSceneHandle | null>(null)
  const onEndRef = useRef(onEnd)
  onEndRef.current = onEnd

  const [caught, setCaught] = useState(0)
  const [phase, setPhase] = useState<ClipPhase>('ready')
  const [remain, setRemain] = useState(TIME_ATTACK_SEC)
  const [ended, setEnded] = useState(false)
  const [flash, setFlash] = useState<'hit' | 'miss' | null>(null)

  const caughtRef = useRef(0)
  caughtRef.current = caught

  const onReady = useCallback((handle: ClipSceneHandle) => {
    handleRef.current = handle
  }, [])

  const onVerdict = useCallback((hit: boolean) => {
    setFlash(hit ? 'hit' : 'miss')
    setTimeout(() => setFlash(null), FLASH_MS)
  }, [])

  const press = () => handleRef.current?.press()

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        press()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
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

  const busy = phase !== 'ready' || ended

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
          camera={{ position: [0, 2.35, 5.2], fov: 48 }}
          gl={{ antialias: true }}
          onCreated={({ camera }) => camera.lookAt(0, 1.9, 0)}
        >
          <color attach="background" args={['#151230']} />
          <fog attach="fog" args={['#151230', 16, 30]} />
          <ClipScene
            emojis={EMOJIS}
            onCatch={setCaught}
            onPhaseChange={setPhase}
            onVerdict={onVerdict}
            onReady={onReady}
          />
        </Canvas>

        {flash ? (
          <div className={`stage__flash stage__flash--${flash}`}>
            {flash === 'hit' ? '집게가 열렸다!' : '빗나감'}
          </div>
        ) : null}
      </div>

      <div className="stage__controls">
        <Button size="lg" disabled={busy} onClick={press}>
          {busy ? '바 작동 중...' : '누르기'}
        </Button>
      </div>

      <p className="stage__hint">
        집게가 <strong>노란 원</strong>에 오는 순간에 맞춰 누르세요. 바가 내려오는 시간이 있어
        조금 일찍 눌러야 하고, <strong>회전 속도가 계속 미세하게 변합니다</strong>. (Space)
      </p>
    </div>
  )
}
