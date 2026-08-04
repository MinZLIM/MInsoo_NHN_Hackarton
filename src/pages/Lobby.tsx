import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'
import { toast } from '@/store/useToastStore'
import { formatGold } from '@/lib/constants'
import { TierBadge } from '@/pages/Rank'
import sceneLarge from '@/assets/lobby-scene.webp'
import sceneSmall from '@/assets/lobby-scene-sm.webp'

interface Hotspot {
  key: string
  label: string
  to?: string
  /** 배경 그림 위의 위치(%). 그림이 바뀌면 이 값만 조정하면 된다. */
  x: number
  y: number
  disabled?: boolean
}

/**
 * 배경 일러스트 좌표계 기준 핫스팟.
 * 배경은 object-fit: cover로 채우므로 값은 그림 자체의 비율(%)을 따른다.
 */
const HOTSPOTS: Hotspot[] = [
  { key: 'collection', label: '콜렉터 함', to: '/collection', x: 23.5, y: 10.5 },
  { key: 'game', label: '게임 실행', to: '/game', x: 20.1, y: 77.2 },
  { key: 'rank', label: '랭킹 확인', to: '/rank', x: 85.4, y: 43.3 },
  { key: 'shop', label: '상점', to: '/shop', x: 83.7, y: 88.0 },
  { key: 'multi', label: '실시간 매칭', x: 54, y: 60, disabled: true },
]

export function Lobby() {
  const navigate = useNavigate()
  const profile = useAuthStore((s) => s.profile)
  const signOut = useAuthStore((s) => s.signOut)

  return (
    <div className="arcade">
      {/*
        배경 그림에는 메뉴 라벨이 이미 그려져 있다. 아래 핫스팟이 그 위를 정확히 덮어야 하므로
        그림과 핫스팟을 같은 좌표계(stage) 안에 두고, stage 자체를 화면에 맞춰 늘린다.
        img에 object-fit: cover를 주면 잘린 만큼 %가 어긋나므로 쓰지 않는다.
      */}
      <div className="arcade__stage">
        <img
          className="arcade__bg"
          src={sceneLarge}
          srcSet={`${sceneSmall} 773w, ${sceneLarge} 1546w`}
          sizes="100vw"
          alt="인형뽑기 게임장 내부"
          fetchPriority="high"
        />

        {/* 그림에 그려진 라벨 자리를 그대로 덮는 실제 버튼. 키보드 탭 이동도 된다. */}
        <nav className="arcade__menu" aria-label="메인 메뉴">
          {HOTSPOTS.map((spot) => (
            <button
              key={spot.key}
              className={`hotspot${spot.disabled ? ' hotspot--disabled' : ''}`}
              style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
              onClick={() =>
                spot.disabled
                  ? toast.info('실시간 매칭은 추후 업데이트 예정입니다.')
                  : navigate(spot.to!)
              }
            >
              {spot.label}
              {spot.disabled ? <em className="hotspot__badge">준비 중</em> : null}
            </button>
          ))}
        </nav>
      </div>

      <div className="arcade__vignette" aria-hidden />

      {/* 상단 바는 화면에 고정한다. 그림에 그려진 제목·재화 표시를 덮어 가린다. */}
      <header className="arcade__hud">
        <h1 className="arcade__title">🧸 웹 기반 인형뽑기 게임</h1>

        <div className="arcade__status">
          <span className="gold-badge">
            <span className="gold-badge__icon" aria-hidden>
              🪙
            </span>
            <strong className="gold-badge__value">{formatGold(profile?.gold ?? 0)}</strong>
            <span className="gold-badge__unit">Gold</span>
          </span>

          <TierBadge tier="bronze" />

          <button
            className="arcade__signout"
            onClick={async () => {
              await signOut()
              navigate('/login', { replace: true })
            }}
          >
            로그아웃
          </button>
        </div>
      </header>

      {/*
        세로로 긴 화면에서는 전경을 다 보여주면 라벨이 읽을 수 없을 만큼 작아진다.
        그래서 배경은 꽉 채워 분위기만 살리고 메뉴는 목록으로 따로 제공한다.
      */}
      <nav className="arcade__list" aria-label="메인 메뉴">
        {HOTSPOTS.map((spot) => (
          <button
            key={spot.key}
            className={`arcade__list-item${spot.disabled ? ' is-disabled' : ''}`}
            onClick={() =>
              spot.disabled
                ? toast.info('실시간 매칭은 추후 업데이트 예정입니다.')
                : navigate(spot.to!)
            }
          >
            {spot.label}
            {spot.disabled ? <em className="hotspot__badge">준비 중</em> : null}
          </button>
        ))}
      </nav>

      <p className="arcade__greeting">
        <strong>{profile?.nickname}</strong> 님, 어서 오세요!
      </p>
    </div>
  )
}
