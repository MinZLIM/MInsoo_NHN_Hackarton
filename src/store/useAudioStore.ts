import { create } from 'zustand'
import { setMuted } from '@/lib/sfx'

const KEY = 'claw-muted'

const initial = (() => {
  try {
    return localStorage.getItem(KEY) === 'true'
  } catch {
    return false
  }
})()

setMuted(initial)

interface AudioState {
  muted: boolean
  toggle: () => void
}

export const useAudioStore = create<AudioState>((set, get) => ({
  muted: initial,

  toggle() {
    const next = !get().muted
    setMuted(next)
    try {
      localStorage.setItem(KEY, String(next))
    } catch {
      // 저장에 실패해도 이번 세션에는 적용된다
    }
    set({ muted: next })
  },
}))
