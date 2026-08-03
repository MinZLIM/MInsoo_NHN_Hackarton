import { useCallback, useEffect, useState } from 'react'
import { messageOf } from '@/types/api'

interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: string | null
  reload: () => void
}

/** 화면 진입 시 서버에서 한 번 읽어오는 패턴을 모아둔다. (로딩/에러 상태 일관성) */
export function useAsync<T>(fetcher: () => Promise<T>, deps: unknown[] = []): AsyncState<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nonce, setNonce] = useState(0)

  // fetcher는 매 렌더마다 새로 만들어지므로 deps로만 재실행을 판단한다.
  const run = useCallback(fetcher, deps)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)

    run()
      .then((result) => {
        if (alive) setData(result)
      })
      .catch((err) => {
        if (alive) setError(messageOf(err))
      })
      .finally(() => {
        if (alive) setLoading(false)
      })

    return () => {
      alive = false
    }
  }, [run, nonce])

  return { data, loading, error, reload: () => setNonce((n) => n + 1) }
}
