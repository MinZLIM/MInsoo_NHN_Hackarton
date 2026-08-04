import { create } from 'zustand'
import { setMuted, setVolume } from '@/lib/sfx'

const MUTE_KEY = 'claw-muted'
const VOLUME_KEY = 'claw-volume'

function read<T>(key: string, parse: (raw: string) => T, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw === null ? fallback : parse(raw)
  } catch {
    return fallback
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // 저장에 실패해도 이번 세션에는 적용된다
  }
}

const initialMuted = read(MUTE_KEY, (v) => v === 'true', false)
const initialVolume = read(VOLUME_KEY, (v) => Number(v), 0.85)

setMuted(initialMuted)
setVolume(initialVolume)

interface AudioState {
  muted: boolean
  /** 0 ~ 1 */
  volume: number
  toggleMuted: () => void
  changeVolume: (next: number) => void
}

export const useAudioStore = create<AudioState>((set, get) => ({
  muted: initialMuted,
  volume: initialVolume,

  toggleMuted() {
    const next = !get().muted
    setMuted(next)
    write(MUTE_KEY, String(next))
    set({ muted: next })
  },

  changeVolume(next) {
    const clamped = Math.min(1, Math.max(0, next))
    setVolume(clamped)
    write(VOLUME_KEY, String(clamped))
    // 볼륨을 올리면 음소거는 자동으로 풀린다
    if (clamped > 0 && get().muted) {
      setMuted(false)
      write(MUTE_KEY, 'false')
      set({ muted: false })
    }
    set({ volume: clamped })
  },
}))
