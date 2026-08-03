import { useState } from 'react'
import { AppHeader } from '@/components/AppHeader'
import { Button } from '@/components/ui/Button'
import { Loading } from '@/components/ui/Loading'
import { useAsync } from '@/hooks/useAsync'
import { api } from '@/lib/api'
import { MODE_LABEL, TIER_COLOR, TIER_LABEL, formatGold } from '@/lib/constants'
import type { Leaderboard, RankMode } from '@/types/api'

/** 랭킹 — 모드별 리더보드와 본인 티어. 대형은 랭킹 대상이 아니다. (REQ-RANK-01) */
const RANK_MODES: RankMode[] = ['small', 'medium']

export function Rank() {
  const [mode, setMode] = useState<RankMode>('small')
  const { data, loading, error, reload } = useAsync<Leaderboard>(
    () => api.getLeaderboard(mode),
    [mode],
  )

  return (
    <div className="page">
      <AppHeader title="랭킹" />

      <div className="rank__top">
        <label className="rank__select">
          <span className="sr-only">랭킹 모드</span>
          <select value={mode} onChange={(e) => setMode(e.target.value as RankMode)}>
            {RANK_MODES.map((m) => (
              <option key={m} value={m}>
                {MODE_LABEL[m]}
              </option>
            ))}
          </select>
        </label>

        {data?.me ? <MyRankCard me={data.me} /> : null}
      </div>

      {loading ? <Loading label="랭킹을 불러오는 중..." /> : null}

      {error ? (
        <div className="empty">
          <p>{error}</p>
          <Button variant="ghost" size="sm" onClick={reload}>
            다시 시도
          </Button>
        </div>
      ) : null}

      {!loading && !error ? (
        <>
          <h2 className="rank__heading">🏆 최고 랭커</h2>
          {data && data.top.length > 0 ? (
            <ol className="rank-list">
              {data.top.map((row) => (
                <li key={`${row.rank}-${row.nickname}`} className="rank-row">
                  <span className={`rank-row__no${row.rank <= 3 ? ' is-top' : ''}`}>
                    {row.rank}
                  </span>
                  <span className="rank-row__name">{row.nickname}</span>
                  <TierBadge tier={row.tier} />
                  <span className="rank-row__score">{formatGold(row.best_score)}점</span>
                  {/* 1위 대비 상대 길이로 점수 차이를 한눈에 보여준다 */}
                  <span
                    className="rank-row__bar"
                    style={{
                      width: `${Math.max(6, (row.best_score / (data.top[0]?.best_score || 1)) * 100)}%`,
                    }}
                  />
                </li>
              ))}
            </ol>
          ) : (
            <div className="empty">
              <p>아직 랭킹 데이터가 없습니다.</p>
            </div>
          )}
        </>
      ) : null}
    </div>
  )
}

function MyRankCard({ me }: { me: NonNullable<Leaderboard['me']> }) {
  return (
    <div className="my-rank">
      <span className="my-rank__label">내 순위</span>
      <strong className="my-rank__value">{me.rank}위</strong>
      <TierBadge tier={me.tier} />
      <span className="my-rank__score">최고 {formatGold(me.best_score)}점</span>
    </div>
  )
}

export function TierBadge({ tier }: { tier: keyof typeof TIER_LABEL }) {
  return (
    <span className="tier-badge" style={{ color: TIER_COLOR[tier], borderColor: TIER_COLOR[tier] }}>
      {TIER_LABEL[tier]}
    </span>
  )
}
