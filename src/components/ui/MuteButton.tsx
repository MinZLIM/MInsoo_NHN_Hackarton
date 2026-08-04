import { useAudioStore } from '@/store/useAudioStore'
import { playSfx } from '@/lib/sfx'

/** 소리 켜기/끄기. 시연 중 언제든 끌 수 있어야 한다. */
export function MuteButton() {
  const muted = useAudioStore((s) => s.muted)
  const toggle = useAudioStore((s) => s.toggle)

  return (
    <button
      className="mute-btn"
      aria-label={muted ? '소리 켜기' : '소리 끄기'}
      aria-pressed={muted}
      title={muted ? '소리 켜기' : '소리 끄기'}
      onClick={() => {
        toggle()
        // 켤 때는 눌린 걸 소리로 확인시켜 준다
        if (muted) playSfx('click')
      }}
    >
      {muted ? '🔇' : '🔊'}
    </button>
  )
}
