import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'
import { toast } from '@/store/useToastStore'
import { formatGold } from '@/lib/constants'
import { TierBadge } from '@/pages/Rank'
import { SettingsMenu } from '@/components/ui/SettingsMenu'
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
 * 배경 일러스트(1537×1330) 좌표계 기준 핫스팟 — 그림 속 해당 오브젝트 위에 놓는다.
 * 그림 전체가 항상 화면에 들어오므로(contain) %가 그대로 화면 위치가 된다.
 */
const HOTSPOTS: Hotspot[] = [
  // 좌측 상단 유리 진열장
  { key: 'collection', label: '콜렉터 함', to: '/collection', x: 22.4, y: 23.7 },
  // 좌측 인형뽑기 기계 열
  { key: 'game', label: '게임 실행', to: '/game', x: 16, y: 68.8 },
  // 우측 상단 '클로 마스터 랭킹' 전광판
  { key: 'rank', label: '랭킹 확인', to: '/rank', x: 86.9, y: 23.1 },
  // 우측 카운터
  { key: 'shop', label: '상점', to: '/shop', x: 82.3, y: 69.9 },
  // 통로 가운데 키오스크
  { key: 'multi', label: '실시간 매칭', x: 54.7, y: 56.4, disabled: true },
]

export function Lobby() {
  const navigate = useNavigate()
  const profile = useAuthStore((s) => s.profile)

  return (
    <div className="arcade">
      {/* 그림이 세로로 길어 좌우가 남는다. 같은 그림을 흐리게 깔아 여백을 메운다. */}
      <div
        className="arcade__backdrop"
        style={{ backgroundImage: `url(${sceneSmall})` }}
        aria-hidden
      />

      {/*
        핫스팟이 그림 속 오브젝트 위에 정확히 얹히려면 좌표계가 하나여야 한다.
        그림과 핫스팟을 같은 stage에 담고, stage 전체가 화면에 들어오도록 맞춘다.
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
          <SettingsMenu />
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
