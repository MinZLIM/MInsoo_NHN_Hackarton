import { useNavigate } from 'react-router-dom'
import { AppHeader } from '@/components/AppHeader'
import { useAuthStore } from '@/store/useAuthStore'
import { toast } from '@/store/useToastStore'

interface MenuItem {
  key: string
  icon: string
  label: string
  desc: string
  to?: string
  /** 실시간 매칭은 이번 일정에서 제외 (TASKS.md 참고) */
  disabled?: boolean
}

const MENUS: MenuItem[] = [
  { key: 'collection', icon: '📖', label: '콜렉터함', desc: '수집한 인형 도감', to: '/collection' },
  { key: 'game', icon: '🕹️', label: '게임 실행', desc: '소형 / 중형 / 대형', to: '/game' },
  { key: 'rank', icon: '🏆', label: '랭킹 확인', desc: '티어 현황 & 리더보드', to: '/rank' },
  { key: 'shop', icon: '🛒', label: '상점', desc: '인형 판매 · 아이템 · 송금', to: '/shop' },
  { key: 'multi', icon: '👥', label: '실시간 매칭', desc: '추후 업데이트 예정', disabled: true },
]

export function Lobby() {
  const navigate = useNavigate()
  const nickname = useAuthStore((s) => s.profile?.nickname)

  return (
    <div className="page lobby">
      <AppHeader title="메인 로비" showBack={false} />

      <p className="lobby__greeting">
        <strong>{nickname}</strong> 님, 어서 오세요!
      </p>

      <nav className="lobby__menu">
        {MENUS.map((menu) => (
          <button
            key={menu.key}
            className={`menu-card${menu.disabled ? ' menu-card--disabled' : ''}`}
            disabled={menu.disabled}
            onClick={() =>
              menu.disabled
                ? toast.info('실시간 매칭은 추후 업데이트 예정입니다.')
                : navigate(menu.to!)
            }
          >
            <span className="menu-card__icon" aria-hidden>
              {menu.icon}
            </span>
            <span className="menu-card__label">{menu.label}</span>
            <span className="menu-card__desc">{menu.desc}</span>
            {menu.disabled ? <span className="menu-card__badge">준비 중</span> : null}
          </button>
        ))}
      </nav>
    </div>
  )
}
