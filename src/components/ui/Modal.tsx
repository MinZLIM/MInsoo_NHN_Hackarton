import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  open: boolean
  title?: string
  onClose?: () => void
  children: ReactNode
  footer?: ReactNode
  /** 배경 클릭·ESC로 닫히지 않게 한다 (결제/정산 확인용) */
  dismissable?: boolean
}

export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  dismissable = true,
}: Props) {
  useEffect(() => {
    if (!open || !dismissable) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, dismissable, onClose])

  if (!open) return null

  return createPortal(
    <div
      className="modal__backdrop"
      onClick={dismissable ? onClose : undefined}
      role="presentation"
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        {title ? <h2 className="modal__title">{title}</h2> : null}
        <div className="modal__body">{children}</div>
        {footer ? <div className="modal__footer">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  )
}
