import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'
import { Loading } from './ui/Loading'

/** 미로그인 상태로 보호된 라우트에 접근하면 /login으로 보낸다. (REQ-AUTH-01) */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { profile, ready } = useAuthStore()
  const location = useLocation()

  // 세션 복구 전에는 판단을 보류한다. 아니면 새로고침마다 로그인 화면이 깜빡인다.
  if (!ready) return <Loading full label="세션 확인 중..." />
  if (!profile) return <Navigate to="/login" state={{ from: location.pathname }} replace />

  return <>{children}</>
}
