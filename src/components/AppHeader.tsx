import { useNavigate } from 'react-router-dom'
import { GoldBadge } from './GoldBadge'
import { SettingsMenu } from './ui/SettingsMenu'
import { Button } from './ui/Button'

interface Props {
  title: string
  /** 뒤로가기 버튼을 숨길 화면(로비)에서 false */
  showBack?: boolean
}

export function AppHeader({ title, showBack = true }: Props) {
  const navigate = useNavigate()

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

      {/* 로그아웃은 환경설정 안으로 옮겼다 */}
      <div className="app-header__right">
        <GoldBadge />
        <SettingsMenu />
      </div>
    </header>
  )
}
