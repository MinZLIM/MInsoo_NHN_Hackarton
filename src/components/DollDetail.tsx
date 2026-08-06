import { Suspense, lazy } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { DollImage } from '@/components/DollImage'
import { SELL_PRICE, SIZE_LABEL, formatGold } from '@/lib/constants'
import type { CollectionEntry } from '@/types/api'

// three.js는 무겁다. 상세를 열 때만 받아온다.
const DollViewer = lazy(() =>
  import('@/components/DollViewer').then((m) => ({ default: m.DollViewer })),
)

interface Props {
  doll: CollectionEntry | null
  onClose: () => void
}

/** 인형 상세 — 3D로 돌려보고 스펙을 확인한다. */
export function DollDetail({ doll, onClose }: Props) {
  return (
    <Modal
      open={doll !== null}
      title={doll?.owned ? doll.name : '미획득 인형'}
      onClose={onClose}
      footer={
        <Button variant="ghost" onClick={onClose}>
          닫기
        </Button>
      }
    >
      {doll ? (
        <div className="doll-detail">
          <div className={`doll-detail__viewer${doll.owned ? '' : ' is-locked'}`}>
            <Suspense
              fallback={
                <DollImage
                  imagePath={doll.image_path}
                  name={doll.name}
                  masked={!doll.owned}
                  size="large"
                  dollSize={doll.size}
                />
              }
            >
              <DollViewer name={doll.name} size={doll.size} masked={!doll.owned} />
            </Suspense>

            <p className="doll-detail__hint">
              {doll.owned
                ? '🖱️ 드래그해서 돌려보세요'
                : '🔒 아직 획득하지 않은 인형입니다'}
            </p>
          </div>

          <dl className="doll-detail__spec">
            <div>
              <dt>크기</dt>
              <dd>{SIZE_LABEL[doll.size]}</dd>
            </div>
            <div>
              <dt>보유</dt>
              <dd>{doll.owned ? `${doll.count}개` : '—'}</dd>
            </div>
            <div>
              <dt>판매가</dt>
              <dd className="is-gold">{formatGold(SELL_PRICE[doll.size])} G</dd>
            </div>
          </dl>
        </div>
      ) : null}
    </Modal>
  )
}
