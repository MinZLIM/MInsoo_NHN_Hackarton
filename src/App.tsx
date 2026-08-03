import { useEffect } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'
import { RequireAuth } from '@/components/RequireAuth'
import { Toaster } from '@/components/ui/Toaster'
import { Login } from '@/pages/Login'
import { Lobby } from '@/pages/Lobby'
import { Collection } from '@/pages/Collection'
import { Game } from '@/pages/Game'
import { Placeholder } from '@/pages/Placeholder'

/**
 * GitHub Pages는 SPA 딥링크(새로고침 시 404)를 처리하지 못하므로 HashRouter를 쓴다.
 * BrowserRouter로 가려면 404.html 리다이렉트 트릭이 별도로 필요하다.
 */
export default function App() {
  const init = useAuthStore((s) => s.init)

  useEffect(() => {
    void init()
  }, [init])

  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          path="/lobby"
          element={
            <RequireAuth>
              <Lobby />
            </RequireAuth>
          }
        />
        <Route
          path="/collection"
          element={
            <RequireAuth>
              <Collection />
            </RequireAuth>
          }
        />
        <Route
          path="/game"
          element={
            <RequireAuth>
              <Game />
            </RequireAuth>
          }
        />
        <Route
          path="/rank"
          element={
            <RequireAuth>
              <Placeholder
                title="랭킹"
                due="08.06 오전"
                tasks={[
                  'D-3 모드 드롭다운(소형/중형) + 리더보드 테이블',
                  'D-4 본인 티어/순위 카드 + 승강등 알림 모달',
                ]}
              />
            </RequireAuth>
          }
        />
        <Route
          path="/shop"
          element={
            <RequireAuth>
              <Placeholder
                title="상점"
                due="08.06 오전"
                tasks={['D-1 인형 판매 탭', 'D-2 송금 UI (닉네임 → 금액 → 확인 모달)']}
              />
            </RequireAuth>
          }
        />

        <Route path="*" element={<Navigate to="/lobby" replace />} />
      </Routes>

      <Toaster />
    </HashRouter>
  )
}
