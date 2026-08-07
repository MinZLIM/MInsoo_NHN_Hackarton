import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAudioStore } from '@/store/useAudioStore'
import { useAuthStore } from '@/store/useAuthStore'
import { playSfx } from '@/lib/sfx'
import { toast } from '@/store/useToastStore'
import { messageOf } from '@/types/api'

/**
 * 우측 상단 환경설정.
 * 소리 on/off, 볼륨, 로그아웃을 한 곳에서 처리한다.
 */
export function SettingsMenu() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  const muted = useAudioStore((s) => s.muted)
  const volume = useAudioStore((s) => s.volume)
  const toggleMuted = useAudioStore((s) => s.toggleMuted)
  const changeVolume = useAudioStore((s) => s.changeVolume)
  const signOut = useAuthStore((s) => s.signOut)

  // 바깥을 누르거나 ESC를 치면 닫는다
  useEffect(() => {
    if (!open) return

    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const percent = Math.round(volume * 100)

  return (
    <div className="settings" ref={rootRef}>
      <button
        className={`settings__trigger${open ? ' is-open' : ''}`}
        aria-label="환경설정"
        aria-expanded={open}
        title="환경설정"
        onClick={() => setOpen((v) => !v)}
      >
        ⚙️
      </button>

      {open ? (
        <div className="settings__panel" role="dialog" aria-label="환경설정">
          <h2 className="settings__title">환경설정</h2>

          <div className="settings__row">
            <span className="settings__label">소리</span>
            <button
              className={`switch${muted ? '' : ' is-on'}`}
              role="switch"
              aria-checked={!muted}
              aria-label="소리 켜기/끄기"
              onClick={() => {
                const wasMuted = muted
                toggleMuted()
                // 켜는 쪽이면 소리로 확인시켜 준다
                if (wasMuted) playSfx('click')
              }}
            >
              <span className="switch__knob" aria-hidden />
            </button>
          </div>

          <div className="settings__row settings__row--stack">
            <div className="settings__label-row">
              <span className="settings__label">볼륨</span>
              <span className="settings__value">{muted ? '음소거' : `${percent}%`}</span>
            </div>
            <input
              className="settings__slider"
              type="range"
              min={0}
              max={100}
              step={5}
              value={percent}
              aria-label="볼륨"
              onChange={(e) => changeVolume(Number(e.target.value) / 100)}
              onPointerUp={() => playSfx('tick')}
            />
          </div>

          <div className="settings__divider" />

          <button
            className="settings__signout"
            onClick={async () => {
              setOpen(false)
              try {
                await signOut()
                toast.success('로그아웃되었습니다.')
                navigate('/login', { replace: true })
              } catch (err) {
                // 세션이 안 끊겼는데 로그인 화면으로 보내면 라우트 가드가 도로 튕겨낸다.
                // 실패했을 때는 그 자리에 머무르게 두고 사유만 알린다.
                toast.error(messageOf(err))
              }
            }}
          >
            로그아웃
          </button>
        </div>
      ) : null}
    </div>
  )
}
