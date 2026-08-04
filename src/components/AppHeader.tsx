import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'
import { GoldBadge } from './GoldBadge'
import { MuteButton } from './ui/MuteButton'
import { Button } from './ui/Button'

interface Props {
  title: string
  /** 뒤로가기 버튼을 숨길 화면(로비)에서 false */
  showBack?: boolean
}

export function AppHeader({ title, showBack = true }: Props) {
  const navigate = useNavigate()
  const signOut = useAuthStore((s) => s.signOut)

  return (
    <header className="app-header">
      <div className="app-header__left">
        {showBack ? (
          <Button variant="ghost" size="sm" onClick={() => navigate('/lobby')}>
            ← 로비
          </Button>
        ) : null}
        <h1 className="app-header__title">{title}</h1>
      </div>

      <div className="app-header__right">
        <MuteButton />
        <GoldBadge />
        {showBack ? null : (
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              await signOut()
              navigate('/login', { replace: true })
            }}
          >
            로그아웃
          </Button>
        )}
      </div>
    </header>
  )
}
