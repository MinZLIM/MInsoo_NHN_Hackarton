import { useState } from 'react'
import { dollEmoji, dollImageUrl } from '@/lib/assets'
import type { DollSize } from '@/types/api'

interface Props {
  imagePath: string
  name: string
  /** 미획득 인형은 실루엣으로 마스킹한다 (REQ-COLL-02) */
  masked?: boolean
  size?: DollSize | 'inline'
}

/**
 * 인형 이미지. Storage에 실제 에셋이 올라오면 자동으로 그걸 쓰고,
 * 없거나 로딩에 실패하면 이모지로 대체한다. (C-3)
 */
export function DollImage({ imagePath, name, masked = false, size = 'small' }: Props) {
  const [failed, setFailed] = useState(false)
  const url = dollImageUrl(imagePath)

  return (
    <span
      className={`doll-image doll-image--${size}${masked ? ' doll-image--masked' : ''}`}
      role="img"
      aria-label={masked ? '미획득 인형' : name}
    >
      {url && !failed ? (
        <img src={url} alt="" onError={() => setFailed(true)} />
      ) : (
        <span aria-hidden>{dollEmoji(imagePath)}</span>
      )}
    </span>
  )
}
