import { useToastStore } from '@/store/useToastStore'

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts)

  return (
    <div className="toaster" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast--${t.kind}`}>
          {t.message}
        </div>
      ))}
    </div>
  )
}
