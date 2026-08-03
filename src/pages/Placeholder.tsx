import { AppHeader } from '@/components/AppHeader'

interface Props {
  title: string
  /** 이 화면을 구현하기로 한 날짜 (TASKS.md 기준) */
  due: string
  tasks: string[]
}

/**
 * 08.03 시점의 라우팅 골격용 placeholder.
 * 각 화면 구현 시 이 컴포넌트 사용을 제거한다.
 */
export function Placeholder({ title, due, tasks }: Props) {
  return (
    <div className="page">
      <AppHeader title={title} />
      <div className="placeholder">
        <p className="placeholder__due">🚧 {due} 구현 예정</p>
        <ul className="placeholder__list">
          {tasks.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}
