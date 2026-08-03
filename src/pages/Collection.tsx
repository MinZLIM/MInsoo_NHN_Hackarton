import { useMemo, useState } from 'react'
import { AppHeader } from '@/components/AppHeader'
import { DollImage } from '@/components/DollImage'
import { Loading } from '@/components/ui/Loading'
import { Button } from '@/components/ui/Button'
import { useAsync } from '@/hooks/useAsync'
import { api } from '@/lib/api'
import { SIZE_LABEL, TOTAL_DOLLS, formatGold } from '@/lib/constants'
import type { CollectionEntry, DollSize } from '@/types/api'

type Filter = 'all' | DollSize

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'ALL' },
  { key: 'small', label: SIZE_LABEL.small },
  { key: 'medium', label: SIZE_LABEL.medium },
  { key: 'large', label: SIZE_LABEL.large },
]

export function Collection() {
  const [filter, setFilter] = useState<Filter>('all')
  const { data, loading, error, reload } = useAsync<CollectionEntry[]>(
    () => api.getCollection(),
    [],
  )

  const entries = data ?? []
  const ownedCount = useMemo(() => entries.filter((e) => e.owned).length, [entries])
  const visible = useMemo(
    () => (filter === 'all' ? entries : entries.filter((e) => e.size === filter)),
    [entries, filter],
  )

  // 전체 종수는 계약(45종)이 기준이지만, 서버가 다른 수를 주면 서버 값을 따른다.
  const total = entries.length || TOTAL_DOLLS
  const percent = total === 0 ? 0 : Math.round((ownedCount / total) * 100)

  return (
    <div className="page">
      <AppHeader title="콜렉터함" />

      <div className="collection__top">
        <div className="filter-tabs" role="tablist" aria-label="인형 크기 필터">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              role="tab"
              aria-selected={filter === f.key}
              className={filter === f.key ? 'is-active' : ''}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="collection__progress">
          <span className="collection__count">
            <strong>{ownedCount}</strong> / {total}
          </span>
          <div className="progress-bar" role="progressbar" aria-valuenow={percent}>
            <div className="progress-bar__fill" style={{ width: `${percent}%` }} />
          </div>
          <span className="collection__percent">{percent}%</span>
        </div>
      </div>

      {loading ? <Loading label="도감을 여는 중..." /> : null}

      {error ? (
        <div className="empty">
          <p>{error}</p>
          <Button variant="ghost" size="sm" onClick={reload}>
            다시 시도
          </Button>
        </div>
      ) : null}

      {!loading && !error ? (
        <ul className="doll-grid">
          {visible.map((doll) => (
            <li
              key={doll.id}
              className={`doll-card${doll.owned ? '' : ' doll-card--locked'}`}
              title={doll.owned ? doll.name : '미획득'}
            >
              <DollImage
                imagePath={doll.image_path}
                name={doll.name}
                masked={!doll.owned}
                size={doll.size}
              />
              <span className="doll-card__name">{doll.owned ? doll.name : '???'}</span>
              <span className="doll-card__meta">
                {doll.owned ? `×${formatGold(doll.count)}` : SIZE_LABEL[doll.size]}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {!loading && !error && visible.length === 0 ? (
        <div className="empty">
          <p>표시할 인형이 없습니다.</p>
        </div>
      ) : null}
    </div>
  )
}
