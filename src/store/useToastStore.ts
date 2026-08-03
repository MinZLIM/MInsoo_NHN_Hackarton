import { create } from 'zustand'

export type ToastKind = 'info' | 'success' | 'error'

export interface Toast {
  id: number
  kind: ToastKind
  message: string
}

interface ToastState {
  toasts: Toast[]
  push: (message: string, kind?: ToastKind) => void
  remove: (id: number) => void
}

let seq = 0
const DURATION_MS = 2600

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],

  push(message, kind = 'info') {
    const id = ++seq
    set({ toasts: [...get().toasts, { id, kind, message }] })
    setTimeout(() => get().remove(id), DURATION_MS)
  },

  remove(id) {
    set({ toasts: get().toasts.filter((t) => t.id !== id) })
  },
}))

/** 컴포넌트 밖(에러 핸들러 등)에서도 부를 수 있는 단축 함수 */
export const toast = {
  info: (m: string) => useToastStore.getState().push(m, 'info'),
  success: (m: string) => useToastStore.getState().push(m, 'success'),
  error: (m: string) => useToastStore.getState().push(m, 'error'),
}
