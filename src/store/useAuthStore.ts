import { create } from 'zustand'
import { api } from '@/lib/api'
import type { Profile } from '@/types/api'

interface AuthState {
  profile: Profile | null
  /** 최초 세션 복구가 끝났는지. false면 라우트 가드가 판단을 보류한다. */
  ready: boolean
  loading: boolean

  init: () => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, nickname: string) => Promise<void>
  signOut: () => Promise<void>
  setGold: (gold: number) => void
  refresh: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  profile: null,
  ready: false,
  loading: false,

  /** 앱 시작 시 1회 호출. 새로고침해도 세션이 유지되도록 프로필을 복구한다. */
  async init() {
    try {
      set({ profile: await api.getProfile() })
    } finally {
      set({ ready: true })
    }
  },

  async signIn(email, password) {
    set({ loading: true })
    try {
      await api.signIn(email, password)
      set({ profile: await api.getProfile() })
    } finally {
      set({ loading: false })
    }
  },

  async signUp(email, password, nickname) {
    set({ loading: true })
    try {
      await api.signUp(email, password, nickname)
      set({ profile: await api.getProfile() })
    } finally {
      set({ loading: false })
    }
  },

  async signOut() {
    await api.signOut()
    set({ profile: null })
  },

  /** Realtime 구독 및 RPC 응답의 gold_after 반영용 */
  setGold(gold) {
    const { profile } = get()
    if (profile) set({ profile: { ...profile, gold } })
  },

  async refresh() {
    set({ profile: await api.getProfile() })
  },
}))
