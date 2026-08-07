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

  /**
   * 계정만 만들고 로그인은 시키지 않는다. 로그인은 사용자가 직접 하는 동작이다.
   *
   * Supabase는 이메일 확인이 꺼져 있으면 auth.signUp() 응답에 세션까지 함께 준다.
   * 그대로 두면 profile을 안 채워도 새로고침할 때 init()이 그 세션을 복구해서
   * 결국 자동 로그인이 된다. 그래서 가입 직후 세션을 명시적으로 끊는다.
   */
  async signUp(email, password, nickname) {
    set({ loading: true })
    try {
      await api.signUp(email, password, nickname)
      // 이메일 확인이 켜져 있으면 애초에 세션이 없다. 그때의 signOut 실패로
      // 이미 성공한 가입을 실패로 보이게 만들면 안 된다.
      await api.signOut().catch(() => {})
      set({ profile: null })
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
