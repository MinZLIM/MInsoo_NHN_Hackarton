import { Suspense, lazy, useEffect } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'
import { RequireAuth } from '@/components/RequireAuth'
import { Toaster } from '@/components/ui/Toaster'
import { Loading } from '@/components/ui/Loading'
import { Login } from '@/pages/Login'
import { Lobby } from '@/pages/Lobby'
import { Collection } from '@/pages/Collection'
import { Rank } from '@/pages/Rank'
import { Shop } from '@/pages/Shop'

// 게임 화면만 three.js와 물리 엔진을 쓴다. 로비·콜렉터함·상점·랭킹까지
// 무거운 번들을 지고 갈 이유가 없어 진입 시점에 따로 받아온다.
const Game = lazy(() => import('@/pages/Game').then((m) => ({ default: m.Game })))

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
              <Suspense fallback={<Loading full label="게임을 불러오는 중..." />}>
                <Game />
              </Suspense>
            </RequireAuth>
          }
        />
        <Route
          path="/rank"
          element={
            <RequireAuth>
              <Rank />
            </RequireAuth>
          }
        />
        <Route
          path="/shop"
          element={
            <RequireAuth>
              <Shop />
            </RequireAuth>
          }
        />

        <Route path="*" element={<Navigate to="/lobby" replace />} />
      </Routes>

      <Toaster />
    </HashRouter>
  )
}
