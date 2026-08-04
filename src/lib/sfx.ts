/**
 * 게임 사운드.
 *
 * 음원 파일을 쓰지 않고 WebAudio로 직접 합성한다. 에셋이 없어도 되고,
 * 번들이 늘지 않으며, GitHub Pages에서 추가 요청도 발생하지 않는다.
 *
 * 브라우저 정책상 사용자 조작 전에는 소리를 낼 수 없으므로,
 * AudioContext는 첫 재생 요청(=클릭) 때 만든다.
 */

export type SfxName = 'click' | 'motor' | 'grab' | 'win' | 'miss' | 'coin' | 'tick'

let ctx: AudioContext | null = null
let master: GainNode | null = null
let muted = false

function audio() {
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as Record<string, typeof AudioContext>).webkitAudioContext
    if (!Ctor) return null
    ctx = new Ctor()
    master = ctx.createGain()
    master.gain.value = muted ? 0 : 0.85
    master.connect(ctx.destination)
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

/** 짧은 음 하나 */
function tone(
  freq: number,
  dur: number,
  opts: { type?: OscillatorType; vol?: number; at?: number; slideTo?: number } = {},
) {
  const c = audio()
  if (!c || !master) return
  const { type = 'square', vol = 0.18, at = c.currentTime, slideTo } = opts

  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, at)
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), at + dur)

  gain.gain.setValueAtTime(0.0001, at)
  gain.gain.exponentialRampToValueAtTime(vol, at + 0.012)
  gain.gain.exponentialRampToValueAtTime(0.0001, at + dur)

  osc.connect(gain).connect(master)
  osc.start(at)
  osc.stop(at + dur + 0.03)
}

/** 노이즈 한 줌 — 금속성 '철컹' 소리에 쓴다 */
function noise(dur: number, freq: number, q = 6, vol = 0.25) {
  const c = audio()
  if (!c || !master) return
  const frames = Math.floor(c.sampleRate * dur)
  const buffer = c.createBuffer(1, frames, c.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames)

  const src = c.createBufferSource()
  src.buffer = buffer

  const filter = c.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = freq
  filter.Q.value = q

  const gain = c.createGain()
  gain.gain.value = vol

  src.connect(filter).connect(gain).connect(master)
  src.start()
}

export function playSfx(name: SfxName) {
  const c = audio()
  if (!c) return
  const t = c.currentTime

  switch (name) {
    case 'click':
      tone(880, 0.05, { type: 'square', vol: 0.16 })
      tone(1320, 0.04, { type: 'square', vol: 0.08, at: t + 0.02 })
      break

    case 'motor':
      // 집게가 내려갈 때 나는 모터음
      tone(220, 0.5, { type: 'sawtooth', vol: 0.07, slideTo: 130 })
      break

    case 'grab':
      noise(0.16, 2400, 9, 0.22)
      tone(160, 0.1, { type: 'square', vol: 0.1 })
      break

    case 'win':
      // 상승 아르페지오
      ;[523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
        tone(f, 0.22, { type: 'triangle', vol: 0.2, at: t + i * 0.075 }),
      )
      break

    case 'miss':
      tone(200, 0.26, { type: 'sawtooth', vol: 0.12, slideTo: 90 })
      break

    case 'coin':
      tone(988, 0.08, { type: 'square', vol: 0.18 })
      tone(1319, 0.18, { type: 'square', vol: 0.16, at: t + 0.07 })
      break

    case 'tick':
      tone(1500, 0.03, { type: 'square', vol: 0.07 })
      break
  }
}

/* ---------------- 배경 음악 ---------------- */

const BPM = 104
const STEP = 60 / BPM / 2

/** A 마이너 펜타토닉. null은 쉼표. */
const BASS = [110, null, 110, null, 87.31, null, 98, null, 82.41, null, 82.41, null, 98, null, 110, null]
const LEAD = [
  null, 659.25, null, 523.25, null, 587.33, null, 440, null, 493.88, null, 587.33, null, 523.25,
  null, 659.25,
]

let bgmTimer: ReturnType<typeof setInterval> | null = null
let nextStepAt = 0
let step = 0

function scheduleAhead() {
  const c = audio()
  if (!c) return
  // 0.3초 앞까지 미리 예약해 둬야 타이밍이 흔들리지 않는다
  while (nextStepAt < c.currentTime + 0.3) {
    const bass = BASS[step % BASS.length]
    const lead = LEAD[step % LEAD.length]
    if (bass) tone(bass, STEP * 1.6, { type: 'triangle', vol: 0.075, at: nextStepAt })
    if (lead) tone(lead, STEP * 0.8, { type: 'square', vol: 0.035, at: nextStepAt })
    nextStepAt += STEP
    step++
  }
}

export function startBgm() {
  if (bgmTimer) return
  const c = audio()
  if (!c) return
  nextStepAt = c.currentTime + 0.1
  step = 0
  scheduleAhead()
  bgmTimer = setInterval(scheduleAhead, 60)
}

export function stopBgm() {
  if (!bgmTimer) return
  clearInterval(bgmTimer)
  bgmTimer = null
}

export function setMuted(next: boolean) {
  muted = next
  if (master && ctx) {
    master.gain.setTargetAtTime(next ? 0 : 0.85, ctx.currentTime, 0.02)
  }
}

export function isMuted() {
  return muted
}
