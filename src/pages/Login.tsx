import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'
import { toast } from '@/store/useToastStore'
import { Button } from '@/components/ui/Button'
import { Loading } from '@/components/ui/Loading'
import { messageOf } from '@/types/api'
import { USE_MOCK } from '@/lib/supabase'
import { formatGold } from '@/lib/constants'
import { MASTER_ACCOUNT } from '@/mocks/api'
import storefront from '@/assets/login-scene.webp'
import storefrontSmall from '@/assets/login-scene-sm.webp'

type Tab = 'signIn' | 'signUp'

export function Login() {
  const { profile, ready, loading, signIn, signUp } = useAuthStore()
  const navigate = useNavigate()

  const [tab, setTab] = useState<Tab>('signIn')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (!ready) return <Loading full label="세션 확인 중..." />
  if (profile) return <Navigate to="/lobby" replace />

  const validate = (): string | null => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return '이메일 형식을 확인해 주세요.'
    if (password.length < 6) return '비밀번호는 6자 이상이어야 합니다.'
    if (tab === 'signUp' && nickname.trim().length < 2) {
      return '닉네임은 2자 이상이어야 합니다.'
    }
    return null
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const invalid = validate()
    if (invalid) {
      setError(invalid)
      return
    }
    setError(null)

    try {
      if (tab === 'signIn') {
        await signIn(email, password)
        toast.success('로그인되었습니다.')
      } else {
        await signUp(email, password, nickname.trim())
        toast.success(`가입 완료! ${formatGold(10000)} Gold를 받았습니다.`)
      }
      navigate('/lobby', { replace: true })
    } catch (err) {
      setError(messageOf(err))
    }
  }

  return (
    <div className="login">
      {/* 가게 전경. 간판에 이미 제목이 그려져 있어 카드 안에서는 반복하지 않는다. */}
      <img
        className="login__scene"
        src={storefront}
        srcSet={`${storefrontSmall} 770w, ${storefront} 1540w`}
        sizes="100vw"
        alt="인형뽑기 게임장 입구"
        fetchPriority="high"
      />
      <div className="login__scrim" aria-hidden />

      <div className="login__card">
        <h1 className="login__logo">🧸 웹 인형뽑기 게임</h1>
        <p className="login__desc">
          가입하면 <strong>{formatGold(10000)} Gold</strong>를 드립니다.
        </p>

        <div className="login__tabs" role="tablist">
          <button
            role="tab"
            aria-selected={tab === 'signIn'}
            className={tab === 'signIn' ? 'is-active' : ''}
            onClick={() => {
              setTab('signIn')
              setError(null)
            }}
          >
            로그인
          </button>
          <button
            role="tab"
            aria-selected={tab === 'signUp'}
            className={tab === 'signUp' ? 'is-active' : ''}
            onClick={() => {
              setTab('signUp')
              setError(null)
            }}
          >
            회원가입
          </button>
        </div>

        <form className="login__form" onSubmit={onSubmit}>
          <label className="field">
            <span>이메일</span>
            <input
              type="email"
              value={email}
              autoComplete="email"
              placeholder="player@example.com"
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>

          <label className="field">
            <span>비밀번호</span>
            <input
              type="password"
              value={password}
              autoComplete={tab === 'signIn' ? 'current-password' : 'new-password'}
              placeholder="6자 이상"
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          {tab === 'signUp' ? (
            <label className="field">
              <span>닉네임</span>
              <input
                type="text"
                value={nickname}
                maxLength={12}
                placeholder="랭킹·송금에 표시됩니다"
                onChange={(e) => setNickname(e.target.value)}
              />
            </label>
          ) : null}

          {error ? <p className="field__error">{error}</p> : null}

          <Button type="submit" size="lg" loading={loading}>
            {tab === 'signIn' ? '로그인' : '가입하고 시작하기'}
          </Button>
        </form>

        {USE_MOCK ? (
          <div className="login__mock">
            <p>⚠️ mock 모드입니다. 아무 이메일/비밀번호나 입력하면 진입됩니다.</p>
            <button
              type="button"
              className="login__master"
              onClick={() => {
                setTab('signIn')
                setEmail(MASTER_ACCOUNT.email)
                setPassword(MASTER_ACCOUNT.password)
                setError(null)
              }}
            >
              🎮 게임 마스터 계정으로 채우기 (인형 45종 · {formatGold(MASTER_ACCOUNT.gold)} Gold)
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
