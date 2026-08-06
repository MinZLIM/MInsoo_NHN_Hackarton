import { useCallback, useEffect, useMemo, useState } from 'react'
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
  ITEM_EFFECT,
  MODE_DIFFICULTY,
  MODE_LABEL,
  SCORE_PER_DOLL,
  SHOP_ITEMS,
  TIER_LABEL,
  formatGold,
} from '@/lib/constants'
import {
  messageOf,
  type FinishGameResult,
  type GameMode,
  type ItemId,
  type ItemStock,
} from '@/types/api'
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

  const [inventory, setInventory] = useState<ItemStock[] | null>(null)
  /** 입장 창에서 켜 둔 아이템 */
  const [picked, setPicked] = useState<ItemId[]>([])
  /** 서버가 확정해 준, 이번 판에 실제로 소모된 아이템 */
  const [applied, setApplied] = useState<ItemId[]>([])

  // 보유 아이템은 화면이 넘어갈 때마다 다시 읽는다 (구매·소모가 바로 반영되도록)
  useEffect(() => {
    let alive = true
    api
      .getInventory()
      .then((list) => alive && setInventory(list))
      .catch(() => alive && setInventory([]))
    return () => {
      alive = false
    }
  }, [step])

  /** 이 모드에서 쓸 수 있고 한 개라도 갖고 있는 아이템 */
  const usable = useMemo(() => {
    const stock = Object.fromEntries((inventory ?? []).map((s) => [s.id, s.count]))
    return SHOP_ITEMS.filter((item) => item.modes.includes(mode)).map((item) => ({
      ...item,
      count: stock[item.id] ?? 0,
    }))
  }, [inventory, mode])

  const bonusSec = applied.includes('extra_time') ? ITEM_EFFECT.extraTimeSec : 0
  const gripBoost = applied.includes('grip_boost') ? ITEM_EFFECT.gripBoost : 1

  const cost = ENTRY_COST[mode]
  const gold = profile?.gold ?? 0
  const affordable = gold >= cost

  const openConfirm = (next: GameMode) => {
    setMode(next)
    setPicked([])
    setStep('confirm')
  }

  const toggleItem = (id: ItemId, available: boolean) => {
    if (!available) return
    playSfx('click')
    setPicked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const start = async () => {
    setStarting(true)
    playSfx('coin')
    try {
      const started = await api.startGame(mode, picked)
      setSessionId(started.session_id)
      setApplied(started.items_used)
      setGold(started.gold_after)
      setCaught(0)
      setResult(null)
      setSettleError(null)
      setStep('playing')
      if (started.items_used.length > 0) {
        setInventory((prev) =>
          (prev ?? []).map((s) =>
            started.items_used.includes(s.id) ? { ...s, count: s.count - 1 } : s,
          ),
        )
      }
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
          <ClipStage onEnd={onGameEnd} bonusSec={bonusSec} />
        ) : (
          <ClawStage onEnd={onGameEnd} bonusSec={bonusSec} gripBoost={gripBoost} />
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
              {affordable ? '게임 시작' : '골드 부족'}
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

        {/* 아이템 사용 선택 — 하나도 켜지 않아도 그냥 시작할 수 있다 */}
        {usable.length > 0 ? (
          <div className="item-picker">
            <p className="item-picker__title">사용할 아이템</p>
            <ul className="item-picker__list">
              {usable.map((item) => {
                const available = item.count > 0
                const on = picked.includes(item.id)
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      className={`item-chip${on ? ' is-on' : ''}${available ? '' : ' is-empty'}`}
                      aria-pressed={on}
                      disabled={!available}
                      onClick={() => toggleItem(item.id, available)}
                    >
                      <span className="item-chip__icon" aria-hidden>
                        {item.icon}
                      </span>
                      <span className="item-chip__body">
                        <span className="item-chip__name">{item.name}</span>
                        <span className="item-chip__desc">{item.description}</span>
                      </span>
                      <span className="item-chip__count">
                        {available ? `x${item.count}` : '보유 없음'}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
            <p className="item-picker__note">
              {picked.length > 0
                ? '선택한 아이템은 시작과 동시에 1개씩 소모됩니다.'
                : '아이템 없이 시작할 수 있습니다.'}
            </p>
          </div>
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
