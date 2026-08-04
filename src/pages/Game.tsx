import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppHeader } from '@/components/AppHeader'
import { ClawStage } from '@/components/game/ClawStage'
import { ClipStage } from '@/components/game/ClipStage'
import { TimingStage } from '@/components/game/TimingStage'
import { DollImage } from '@/components/DollImage'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Loading } from '@/components/ui/Loading'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/useAuthStore'
import { toast } from '@/store/useToastStore'
import {
  ENTRY_COST,
  MODE_DIFFICULTY,
  MODE_LABEL,
  SCORE_PER_DOLL,
  TIER_LABEL,
  formatGold,
} from '@/lib/constants'
import { messageOf, type FinishGameResult, type GameMode } from '@/types/api'
import { playSfx } from '@/lib/sfx'

/**
 * 게임 공용 프레임 (F2-1).
 * select → confirm → playing → settling → result
 * 정산(finish_game) 실패 시 result로 넘어가지 않고 재시도를 제공한다. (F2-4)
 */
type Step = 'select' | 'confirm' | 'playing' | 'settling' | 'result'

const MODES: { mode: GameMode; icon: string; rule: string }[] = [
  { mode: 'small', icon: '🧸', rule: '60초 타임어택 · 집게 직접 조작' },
  { mode: 'medium', icon: '🐻', rule: '60초 타임어택 · 회전 빨래집게' },
  { mode: 'large', icon: '🐉', rule: '20.00초 타이밍 클릭 (1회성)' },
]

export function Game() {
  const navigate = useNavigate()
  const profile = useAuthStore((s) => s.profile)
  const setGold = useAuthStore((s) => s.setGold)

  const [step, setStep] = useState<Step>('select')
  const [mode, setMode] = useState<GameMode>('small')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)
  const [caught, setCaught] = useState(0)
  const [result, setResult] = useState<FinishGameResult | null>(null)
  const [settleError, setSettleError] = useState<string | null>(null)

  const cost = ENTRY_COST[mode]
  const gold = profile?.gold ?? 0
  const affordable = gold >= cost

  const openConfirm = (next: GameMode) => {
    setMode(next)
    setStep('confirm')
  }

  const start = async () => {
    setStarting(true)
    playSfx('coin')
    try {
      const started = await api.startGame(mode)
      setSessionId(started.session_id)
      setGold(started.gold_after)
      setCaught(0)
      setResult(null)
      setSettleError(null)
      setStep('playing')
    } catch (err) {
      toast.error(messageOf(err))
      setStep('select')
    } finally {
      setStarting(false)
    }
  }

  /** 결과를 서버에 제출한다. 실패하면 같은 세션으로 재시도할 수 있다. (F2-4) */
  const settle = useCallback(
    async (session: string, total: number) => {
      setStep('settling')
      setSettleError(null)
      try {
        const finished = await api.finishGame(session, total)
        setResult(finished)
        setStep('result')
      } catch (err) {
        setSettleError(messageOf(err))
      }
    },
    [],
  )

  const onGameEnd = useCallback(
    (total: number) => {
      setCaught(total)
      if (sessionId) void settle(sessionId, total)
    },
    [sessionId, settle],
  )

  return (
    <div className="page">
      <AppHeader title="게임 실행" />

      {step === 'select' ? (
        <ul className="mode-list">
          {MODES.map(({ mode: m, icon, rule }) => (
            <li key={m}>
              <button className="mode-card" onClick={() => openConfirm(m)}>
                <span className="mode-card__icon" aria-hidden>
                  {icon}
                </span>
                <span className="mode-card__body">
                  <span className="mode-card__title">{MODE_LABEL[m]}</span>
                  <span className="mode-card__rule">{rule}</span>
                  <span className="mode-card__meta">
                    난이도 {MODE_DIFFICULTY[m]} · 입장료 {formatGold(ENTRY_COST[m])} Gold
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {step === 'playing' ? (
        mode === 'large' ? (
          <TimingStage onEnd={onGameEnd} />
        ) : mode === 'medium' ? (
          <ClipStage onEnd={onGameEnd} />
        ) : (
          <ClawStage onEnd={onGameEnd} />
        )
      ) : null}

      {step === 'settling' ? (
        settleError ? (
          <div className="empty">
            <p>결과 저장에 실패했습니다. {settleError}</p>
            <p className="empty__sub">
              획득한 {caught}개는 아직 반영되지 않았습니다. 다시 시도해 주세요.
            </p>
            <div className="empty__actions">
              <Button onClick={() => sessionId && void settle(sessionId, caught)}>
                다시 시도
              </Button>
              <Button variant="ghost" onClick={() => navigate('/lobby')}>
                로비로
              </Button>
            </div>
          </div>
        ) : (
          <Loading label="결과를 저장하는 중..." />
        )
      ) : null}

      {/* 입장 비용 확인 (REQ-GAME-02) */}
      <Modal
        open={step === 'confirm'}
        title={MODE_LABEL[mode]}
        onClose={() => setStep('select')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setStep('select')}>
              취소
            </Button>
            <Button onClick={start} loading={starting} disabled={!affordable}>
              {affordable ? '입장하기' : '골드 부족'}
            </Button>
          </>
        }
      >
        <p>
          입장료 <strong>{formatGold(cost)} Gold</strong>가 차감됩니다.
        </p>
        <p>
          보유 {formatGold(gold)} → 입장 후 {formatGold(Math.max(0, gold - cost))} Gold
        </p>
        {!affordable ? (
          <p className="field__error">골드가 부족합니다. 상점에서 인형을 판매해 보세요.</p>
        ) : null}
      </Modal>

      {/* 결과 정산 (REQ-GAME-01) */}
      <Modal
        open={step === 'result'}
        title="게임 결과"
        dismissable={false}
        footer={
          <>
            <Button variant="ghost" onClick={() => navigate('/collection')}>
              콜렉터함
            </Button>
            <Button onClick={() => setStep('select')}>한 번 더</Button>
          </>
        }
      >
        <div className="result">
          <p className="result__score">
            <strong>{result?.score ?? caught * SCORE_PER_DOLL}</strong>점
          </p>
          <p className="result__count">인형 {result?.dolls.length ?? caught}개 획득</p>

          {result && result.dolls.length > 0 ? (
            <ul className="result__dolls">
              {result.dolls.map((doll, i) => (
                <li key={`${doll.id}-${i}`}>
                  <DollImage imagePath={doll.image_path} name={doll.name} size="inline" />
                  <span>{doll.name}</span>
                  {doll.is_new ? <em className="result__new">NEW</em> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="result__empty">획득한 인형이 없습니다. 다음엔 꼭!</p>
          )}

          {/* 승·강등 알림 (REQ-RANK-02) */}
          {result?.rank && result.rank.changed !== 'none' ? (
            <p className={`result__rank${result.rank.changed === 'demote' ? ' is-demote' : ''}`}>
              {result.rank.changed === 'promote' ? '🎉 승급!' : '📉 강등'}{' '}
              {TIER_LABEL[result.rank.before]} → {TIER_LABEL[result.rank.after]}
            </p>
          ) : null}
        </div>
      </Modal>
    </div>
  )
}
