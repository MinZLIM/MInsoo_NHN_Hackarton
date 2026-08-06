import { useEffect, useState } from 'react'
import { dollEmoji, dollImageUrl } from '@/lib/assets'
import type { DollSize } from '@/types/api'

interface Props {
  imagePath: string
  name: string
  /** 미획득 인형은 실루엣으로 마스킹한다 (REQ-COLL-02) */
  masked?: boolean
  /** 화면에 얼마나 크게 그릴지 */
  size?: DollSize | 'inline'
  /** 인형 등급. 대형은 썸네일에도 왕관이 보인다. */
  dollSize?: DollSize
}

/**
 * 인형 그림.
 *
 * Storage에 실제 에셋이 올라오면 그걸 쓰고, 없으면 3D 인형을 한 번 그려
 * 정면 샷을 만들어 쓴다. 상세에서 보는 인형과 목록의 그림이 같아야 한다.
 * 3D도 못 쓰는 환경(WebGL 미지원)에서는 이모지로 내려간다.
 */
export function DollImage({
  imagePath,
  name,
  masked = false,
  size = 'small',
  dollSize,
}: Props) {
  const [failed, setFailed] = useState(false)
  const [thumb, setThumb] = useState<string | null>(null)
  const assetUrl = dollImageUrl(imagePath)
  const needsThumb = !assetUrl || failed

  useEffect(() => {
    if (!needsThumb) return
    let alive = true
    // three.js는 무겁다. 썸네일이 실제로 필요할 때만 받아온다.
    import('@/game/three/dollThumbnails')
      .then((m) => m.dollThumbnail(name, dollSize ?? 'small'))
      .then((url) => {
        if (alive) setThumb(url)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [needsThumb, name, dollSize])

  const url = needsThumb ? thumb : assetUrl

  return (
    <span
      className={`doll-image doll-image--${size}${masked ? ' doll-image--masked' : ''}`}
      role="img"
      aria-label={masked ? '미획득 인형' : name}
    >
      {url ? (
        <img src={url} alt="" onError={() => setFailed(true)} />
      ) : (
        <span aria-hidden>{dollEmoji(imagePath)}</span>
      )}
    </span>
  )
}
