import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { DollImage } from '@/components/DollImage'
import { SELL_PRICE, SIZE_LABEL, formatGold } from '@/lib/constants'
import type { CollectionEntry } from '@/types/api'

interface Props {
  doll: CollectionEntry | null
  onClose: () => void
}

/**
 * 인형 상세.
 *
 * 가운데 뷰포트는 나중에 3D 모델을 띄울 자리다. 모델 파일(.glb)이 들어오면
 * 이 자리에 <Canvas> + OrbitControls를 넣어 회전시켜 볼 수 있게 한다.
 * 지금은 모델이 없어 이모지를 크게 보여주고 안내만 띄운다.
 */
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
            <DollImage
              imagePath={doll.image_path}
              name={doll.name}
              masked={!doll.owned}
              size="large"
            />
            <p className="doll-detail__hint">
              {doll.owned
                ? '🧊 3D 모델이 추가되면 여기서 돌려볼 수 있습니다'
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
