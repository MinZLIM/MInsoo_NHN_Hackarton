import { useMemo, useState } from 'react'
import { AppHeader } from '@/components/AppHeader'
import { DollImage } from '@/components/DollImage'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Loading } from '@/components/ui/Loading'
import { useAsync } from '@/hooks/useAsync'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/useAuthStore'
import { toast } from '@/store/useToastStore'
import {
  MODE_LABEL,
  SELL_PRICE,
  SHOP_ITEMS,
  SIZE_LABEL,
  formatGold,
} from '@/lib/constants'
import { messageOf, type CollectionEntry, type ItemStock } from '@/types/api'

type Tab = 'sell' | 'item' | 'transfer'

/**
 * 상점 — 인형 판매(REQ-SHOP-01) · 아이템 구매(REQ-SHOP-02) · 송금(REQ-SHOP-03).
 * 산 아이템은 게임 방에 들어갈 때 쓸지 고른다. (pages/Game)
 */
export function Shop() {
  const [tab, setTab] = useState<Tab>('sell')

  return (
    <div className="page">
      <AppHeader title="상점" />

      <div className="filter-tabs shop__tabs" role="tablist">
        <button
          role="tab"
          aria-selected={tab === 'sell'}
          className={tab === 'sell' ? 'is-active' : ''}
          onClick={() => setTab('sell')}
        >
          인형 판매
        </button>
        <button
          role="tab"
          aria-selected={tab === 'item'}
          className={tab === 'item' ? 'is-active' : ''}
          onClick={() => setTab('item')}
        >
          아이템
        </button>
        <button
          role="tab"
          aria-selected={tab === 'transfer'}
          className={tab === 'transfer' ? 'is-active' : ''}
          onClick={() => setTab('transfer')}
        >
          송금
        </button>
      </div>

      {tab === 'sell' ? <SellTab /> : tab === 'item' ? <ItemTab /> : <TransferTab />}
    </div>
  )
}

function ItemTab() {
  const setGold = useAuthStore((s) => s.setGold)
  const gold = useAuthStore((s) => s.profile?.gold ?? 0)
  const { data, loading, error, reload } = useAsync<ItemStock[]>(() => api.getInventory(), [])
  const [busy, setBusy] = useState<string | null>(null)

  const stock = useMemo(
    () => Object.fromEntries((data ?? []).map((s) => [s.id, s.count])),
    [data],
  )

  const buy = async (id: ItemStock['id'], name: string) => {
    setBusy(id)
    try {
      const result = await api.buyItem(id, 1)
      setGold(result.gold_after)
      toast.success(`${name}을(를) 구매했습니다. (보유 ${result.count}개)`)
      reload()
    } catch (err) {
      toast.error(messageOf(err))
    } finally {
      setBusy(null)
    }
  }

  if (loading) return <Loading label="아이템을 불러오는 중..." />
  if (error)
    return (
      <div className="empty">
        <p>{error}</p>
        <Button variant="ghost" size="sm" onClick={reload}>
          다시 시도
        </Button>
      </div>
    )

  return (
    <>
      <ul className="item-list">
        {SHOP_ITEMS.map((item) => {
          const owned = stock[item.id] ?? 0
          return (
            <li key={item.id} className="item-card">
              <span className="item-card__icon" aria-hidden>
                {item.icon}
              </span>
              <span className="item-card__body">
                <span className="item-card__name">
                  {item.name}
                  <em className="item-card__own">보유 {owned}개</em>
                </span>
                <span className="item-card__desc">{item.description}</span>
                <span className="item-card__modes">
                  {item.modes.map((m) => MODE_LABEL[m]).join(' · ')} 전용
                </span>
              </span>
              <Button
                size="sm"
                loading={busy === item.id}
                disabled={gold < item.price}
                onClick={() => void buy(item.id, item.name)}
              >
                {formatGold(item.price)} G
              </Button>
            </li>
          )
        })}
      </ul>

      <p className="shop__note">
        구매한 아이템은 게임 방에 들어갈 때 사용 여부를 고를 수 있습니다.
      </p>
    </>
  )
}

function SellTab() {
  const setGold = useAuthStore((s) => s.setGold)
  const { data, loading, error, reload } = useAsync<CollectionEntry[]>(
    () => api.getCollection(),
    [],
  )
  const [target, setTarget] = useState<CollectionEntry | null>(null)
  const [count, setCount] = useState(1)
  const [busy, setBusy] = useState(false)

  const owned = useMemo(() => (data ?? []).filter((d) => d.count > 0), [data])

  const open = (doll: CollectionEntry) => {
    setTarget(doll)
    setCount(1)
  }

  const sell = async () => {
    if (!target) return
    setBusy(true)
    try {
      const result = await api.sellDoll(target.id, count)
      setGold(result.gold_after)
      toast.success(`${target.name} ${result.sold}개를 ${formatGold(result.earned)} Gold에 판매했습니다.`)
      setTarget(null)
      reload()
    } catch (err) {
      toast.error(messageOf(err))
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <Loading label="보유 인형을 불러오는 중..." />
  if (error)
    return (
      <div className="empty">
        <p>{error}</p>
        <Button variant="ghost" size="sm" onClick={reload}>
          다시 시도
        </Button>
      </div>
    )

  if (owned.length === 0)
    return (
      <div className="empty">
        <p>판매할 인형이 없습니다.</p>
        <p className="empty__sub">게임에서 인형을 획득해 보세요.</p>
      </div>
    )

  return (
    <>
      <ul className="sell-list">
        {owned.map((doll) => (
          <li key={doll.id} className="sell-item">
            <DollImage
              imagePath={doll.image_path}
              name={doll.name}
              size={doll.size}
              dollSize={doll.size}
            />
            <span className="sell-item__body">
              <span className="sell-item__name">{doll.name}</span>
              <span className="sell-item__meta">
                {SIZE_LABEL[doll.size]} · 보유 {doll.count}개 · 개당{' '}
                {formatGold(SELL_PRICE[doll.size])} Gold
              </span>
            </span>
            <Button size="sm" onClick={() => open(doll)}>
              판매
            </Button>
          </li>
        ))}
      </ul>

      <Modal
        open={target !== null}
        title={`${target?.name ?? ''} 판매`}
        onClose={() => setTarget(null)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setTarget(null)}>
              취소
            </Button>
            <Button onClick={sell} loading={busy}>
              {target ? `${formatGold(SELL_PRICE[target.size] * count)} Gold에 판매` : '판매'}
            </Button>
          </>
        }
      >
        {target ? (
          <>
            <p>
              보유 {target.count}개 중 판매할 수량을 고르세요.
            </p>
            <div className="counter">
              <Button
                variant="ghost"
                size="sm"
                disabled={count <= 1}
                onClick={() => setCount((c) => c - 1)}
              >
                −
              </Button>
              <strong className="counter__value">{count}</strong>
              <Button
                variant="ghost"
                size="sm"
                disabled={count >= target.count}
                onClick={() => setCount((c) => c + 1)}
              >
                +
              </Button>
            </div>
          </>
        ) : null}
      </Modal>
    </>
  )
}

function TransferTab() {
  const profile = useAuthStore((s) => s.profile)
  const setGold = useAuthStore((s) => s.setGold)

  const [nickname, setNickname] = useState('')
  const [amount, setAmount] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const gold = profile?.gold ?? 0
  const parsed = Number(amount)

  const validate = (): string | null => {
    if (nickname.trim().length < 2) return '받는 사람의 닉네임을 입력해 주세요.'
    if (nickname.trim() === profile?.nickname) return '자기 자신에게는 송금할 수 없습니다.'
    if (!Number.isInteger(parsed) || parsed <= 0) return '금액은 1 이상의 정수여야 합니다.'
    if (parsed > gold) return '보유 골드보다 많이 보낼 수 없습니다.'
    return null
  }

  const submit = () => {
    const invalid = validate()
    if (invalid) {
      setError(invalid)
      return
    }
    setError(null)
    setConfirming(true)
  }

  const transfer = async () => {
    setBusy(true)
    try {
      const result = await api.transferGold(nickname.trim(), parsed)
      setGold(result.gold_after)
      toast.success(`${result.to} 님에게 ${formatGold(result.amount)} Gold를 보냈습니다.`)
      setNickname('')
      setAmount('')
      setConfirming(false)
    } catch (err) {
      setError(messageOf(err))
      setConfirming(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="transfer">
        <label className="field">
          <span>받는 사람 닉네임</span>
          <input
            type="text"
            value={nickname}
            maxLength={12}
            placeholder="상대방 닉네임"
            onChange={(e) => setNickname(e.target.value)}
          />
        </label>

        <label className="field">
          <span>보낼 금액 (보유 {formatGold(gold)} Gold)</span>
          <input
            type="number"
            value={amount}
            min={1}
            max={gold}
            placeholder="0"
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>

        {error ? <p className="field__error">{error}</p> : null}

        <Button size="lg" onClick={submit}>
          송금하기
        </Button>
      </div>

      <Modal
        open={confirming}
        title="송금 확인"
        dismissable={false}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirming(false)} disabled={busy}>
              취소
            </Button>
            <Button onClick={transfer} loading={busy}>
              보내기
            </Button>
          </>
        }
      >
        <p>
          <strong>{nickname.trim()}</strong> 님에게{' '}
          <strong>{formatGold(parsed || 0)} Gold</strong>를 보냅니다.
        </p>
        <p>송금 후 잔액은 {formatGold(gold - (parsed || 0))} Gold입니다.</p>
        <p className="field__error">보낸 골드는 되돌릴 수 없습니다.</p>
      </Modal>
    </>
  )
}
