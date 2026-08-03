interface Props {
  label?: string
  /** 화면 전체를 덮는 로딩 */
  full?: boolean
}

export function Loading({ label = '불러오는 중...', full = false }: Props) {
  return (
    <div className={full ? 'loading loading--full' : 'loading'}>
      <span className="loading__spinner" aria-hidden />
      <span className="loading__label">{label}</span>
    </div>
  )
}
