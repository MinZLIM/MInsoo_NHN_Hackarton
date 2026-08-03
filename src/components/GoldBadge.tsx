import { useEffect } from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import { api } from '@/lib/api'
import { formatGold } from '@/lib/constants'

/** 화면 우측 상단 보유 골드. Realtime 구독으로 실시간 반영한다. (REQ-LOBBY-01) */
export function GoldBadge() {
  const profile = useAuthStore((s) => s.profile)
  const setGold = useAuthStore((s) => s.setGold)

  useEffect(() => {
    if (!profile) return
    return api.subscribeGold(profile.id, setGold)
  }, [profile?.id, setGold])

  if (!profile) return null

  return (
    <div className="gold-badge" title="보유 골드">
      <span className="gold-badge__icon" aria-hidden>
        🪙
      </span>
      <strong className="gold-badge__value">{formatGold(profile.gold)}</strong>
      <span className="gold-badge__unit">Gold</span>
    </div>
  )
}
