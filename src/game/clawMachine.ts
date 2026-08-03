import Matter from 'matter-js'

/**
 * 소형 인형뽑기 물리 엔진 (F2-2).
 * React와 무관한 순수 TS. 화면은 Matter.Render가 그리고, 집게와 인형 이모지는 afterRender에서 덧그린다.
 *
 * 진행 흐름: aim(좌우 조준) → descend(하강) → grab(파지 판정) → ascend(상승)
 *          → carry(투입구로 이동) → release(낙하) → aim
 */

export type ClawPhase = 'aim' | 'descend' | 'grab' | 'ascend' | 'carry' | 'release' | 'stopped'

export interface ClawMachineOptions {
  canvas: HTMLCanvasElement
  /** 인형이 투입구로 떨어질 때마다 호출 (누적 개수) */
  onCatch: (total: number) => void
  onPhaseChange?: (phase: ClawPhase) => void
  /** 집게가 인형을 잡는 데 성공할 확률 (난이도). 아이템으로 올릴 수 있다. */
  grabSuccessRate?: number
  /** 화면에 배치할 인형 이모지 */
  emojis: string[]
}

const WIDTH = 640
const HEIGHT = 440
const WALL = 18

/** 왼쪽 투입구(구멍)의 폭. 이 구간에는 바닥이 없어 인형이 아래로 빠진다. */
const HOLE_WIDTH = 110
/** 인형이 굴러 들어가지 않도록 투입구 옆에 세우는 턱 */
const LIP_HEIGHT = 34

const CLAW_TOP_Y = 56
const CLAW_MAX_Y = HEIGHT - WALL - 46
const CLAW_SPEED_X = 4.2
const CLAW_SPEED_Y = 3.4
const CARRY_SPEED = 3.6
/** 집게 중심에서 이 거리 안에 있는 인형을 잡는다 */
const GRAB_RADIUS = 46

const DOLL_RADIUS = 22
const DOLL_COUNT = 14

const HOLE_CENTER_X = HOLE_WIDTH / 2

export class ClawMachine {
  private engine: Matter.Engine
  private render: Matter.Render
  private runner: Matter.Runner
  private dolls: Matter.Body[] = []
  private emojiOf = new Map<number, string>()

  private phase: ClawPhase = 'aim'
  private clawX = WIDTH / 2
  private clawY = CLAW_TOP_Y
  private held: Matter.Body | null = null
  private caught = 0
  /** aim 단계에서 -1(왼쪽) / 1(오른쪽) / 0(정지) */
  private moveDir = 0
  private destroyed = false

  private readonly opts: Required<Pick<ClawMachineOptions, 'onCatch' | 'grabSuccessRate' | 'emojis'>> &
    ClawMachineOptions

  constructor(options: ClawMachineOptions) {
    // options에 grabSuccessRate: undefined가 들어오면 기본값을 덮어쓰므로 ??로 받는다.
    this.opts = { ...options, grabSuccessRate: options.grabSuccessRate ?? 0.75 }

    this.engine = Matter.Engine.create()
    this.engine.gravity.y = 1

    this.render = Matter.Render.create({
      canvas: options.canvas,
      engine: this.engine,
      options: {
        width: WIDTH,
        height: HEIGHT,
        wireframes: false,
        // 'transparent'로 두면 매 프레임 캔버스가 지워지지 않아 잔상이 남는다.
        background: '#1e1a38',
      },
    })

    this.buildCabinet()
    this.buildDolls()

    Matter.Events.on(this.engine, 'beforeUpdate', this.tick)
    Matter.Events.on(this.render, 'afterRender', this.draw)

    this.runner = Matter.Runner.create()
    Matter.Runner.run(this.runner, this.engine)
    Matter.Render.run(this.render)
  }

  // ---------- 공개 API ----------

  /** aim 단계에서만 좌우로 움직인다 */
  setMove(dir: -1 | 0 | 1) {
    if (this.phase === 'aim') this.moveDir = dir
  }

  /** 집게를 내린다. aim 단계에서만 유효. */
  drop() {
    if (this.phase !== 'aim') return
    this.moveDir = 0
    this.setPhase('descend')
  }

  getPhase() {
    return this.phase
  }

  /** 타임아웃 종료와 언마운트에서 각각 불릴 수 있으므로 두 번째 호출은 무시한다. */
  destroy() {
    if (this.destroyed) return
    this.destroyed = true

    this.setPhase('stopped')
    Matter.Events.off(this.engine, 'beforeUpdate', this.tick)
    Matter.Events.off(this.render, 'afterRender', this.draw)
    Matter.Render.stop(this.render)
    Matter.Runner.stop(this.runner)
    Matter.World.clear(this.engine.world, false)
    Matter.Engine.clear(this.engine)
    // Render가 canvas에 물려 둔 컨텍스트를 정리한다.
    this.render.canvas.getContext('2d')?.clearRect(0, 0, WIDTH, HEIGHT)
  }

  // ---------- 구성 ----------

  private buildCabinet() {
    const wallStyle = { fillStyle: '#363159' }
    const bodies = [
      // 왼쪽 벽 / 오른쪽 벽 / 천장
      Matter.Bodies.rectangle(WALL / 2, HEIGHT / 2, WALL, HEIGHT, {
        isStatic: true,
        render: wallStyle,
      }),
      Matter.Bodies.rectangle(WIDTH - WALL / 2, HEIGHT / 2, WALL, HEIGHT, {
        isStatic: true,
        render: wallStyle,
      }),
      Matter.Bodies.rectangle(WIDTH / 2, WALL / 2, WIDTH, WALL, {
        isStatic: true,
        render: wallStyle,
      }),
      // 바닥 — 투입구(왼쪽 HOLE_WIDTH)를 비워 둔다
      Matter.Bodies.rectangle(
        HOLE_WIDTH + (WIDTH - HOLE_WIDTH) / 2,
        HEIGHT - WALL / 2,
        WIDTH - HOLE_WIDTH,
        WALL,
        { isStatic: true, render: wallStyle },
      ),
      // 인형이 투입구로 굴러 들어가지 않게 막는 턱
      Matter.Bodies.rectangle(
        HOLE_WIDTH,
        HEIGHT - WALL - LIP_HEIGHT / 2,
        10,
        LIP_HEIGHT,
        { isStatic: true, render: { fillStyle: '#4a4478' } },
      ),
    ]
    Matter.Composite.add(this.engine.world, bodies)
  }

  private buildDolls() {
    for (let i = 0; i < DOLL_COUNT; i++) {
      // 턱 오른쪽 영역에만 쌓는다
      const x = HOLE_WIDTH + 50 + ((i * 73) % (WIDTH - HOLE_WIDTH - 120))
      const y = HEIGHT - 70 - Math.floor(i / 5) * 52

      const doll = Matter.Bodies.circle(x, y, DOLL_RADIUS, {
        restitution: 0.15,
        friction: 0.6,
        frictionAir: 0.02,
        density: 0.0012,
        // 이모지를 직접 그리므로 Matter의 기본 렌더는 끈다
        render: { visible: false },
      })

      this.emojiOf.set(doll.id, this.opts.emojis[i % this.opts.emojis.length] ?? '🧸')
      this.dolls.push(doll)
    }
    Matter.Composite.add(this.engine.world, this.dolls)
  }

  // ---------- 진행 ----------

  private setPhase(next: ClawPhase) {
    this.phase = next
    this.opts.onPhaseChange?.(next)
  }

  private tick = () => {
    switch (this.phase) {
      case 'aim':
        this.clawX = clamp(
          this.clawX + this.moveDir * CLAW_SPEED_X,
          HOLE_WIDTH + 30,
          WIDTH - WALL - 30,
        )
        break

      case 'descend': {
        this.clawY += CLAW_SPEED_Y
        // 인형을 감지했더라도 집게 끝이 인형 높이까지 내려가야 멈춘다. 공중에서 잡히면 어색하다.
        const target = this.nearestDoll()
        const reached = target !== null && this.clawY + 30 >= target.position.y - 6
        if (this.clawY >= CLAW_MAX_Y || reached) this.setPhase('grab')
        break
      }

      case 'grab': {
        const target = this.nearestDoll()
        // 난이도 — 집게 힘이 모자라면 놓친다
        if (target && Math.random() < this.opts.grabSuccessRate) {
          this.held = target
          Matter.Body.setStatic(target, true)
        }
        this.setPhase('ascend')
        break
      }

      case 'ascend':
        this.clawY -= CLAW_SPEED_Y
        if (this.clawY <= CLAW_TOP_Y) {
          this.clawY = CLAW_TOP_Y
          this.setPhase(this.held ? 'carry' : 'aim')
        }
        break

      case 'carry':
        this.clawX += (HOLE_CENTER_X - this.clawX > 0 ? 1 : -1) * CARRY_SPEED
        if (Math.abs(this.clawX - HOLE_CENTER_X) <= CARRY_SPEED) {
          this.clawX = HOLE_CENTER_X
          this.setPhase('release')
        }
        break

      case 'release':
        if (this.held) {
          Matter.Body.setStatic(this.held, false)
          Matter.Body.setVelocity(this.held, { x: 0, y: 0 })
          this.held = null
        }
        // 투입구 위이므로 잡고 있던 인형은 그대로 아래로 빠진다.
        // aim 단계의 좌측 한계로 미리 옮겨 두어야 집게가 순간이동하지 않는다.
        this.clawX = HOLE_WIDTH + 30
        this.setPhase('aim')
        break

      case 'stopped':
        return
    }

    if (this.held) {
      Matter.Body.setPosition(this.held, { x: this.clawX, y: this.clawY + 34 })
      Matter.Body.setAngle(this.held, 0)
    }

    this.collectFallen()
  }

  /** 화면 아래로 빠진 인형을 획득 처리한다 */
  private collectFallen() {
    for (let i = this.dolls.length - 1; i >= 0; i--) {
      const doll = this.dolls[i]
      if (doll.position.y <= HEIGHT + DOLL_RADIUS * 2) continue

      Matter.Composite.remove(this.engine.world, doll)
      this.dolls.splice(i, 1)
      this.emojiOf.delete(doll.id)
      this.caught += 1
      this.opts.onCatch(this.caught)
    }
  }

  private nearestDoll(): Matter.Body | null {
    let best: Matter.Body | null = null
    let bestDist = GRAB_RADIUS

    for (const doll of this.dolls) {
      const dx = doll.position.x - this.clawX
      const dy = doll.position.y - (this.clawY + 30)
      const dist = Math.hypot(dx, dy)
      if (dist < bestDist) {
        bestDist = dist
        best = doll
      }
    }
    return best
  }

  // ---------- 렌더 ----------

  private draw = () => {
    const ctx = this.render.context
    ctx.save()

    // 투입구
    ctx.fillStyle = 'rgba(124, 92, 255, 0.18)'
    ctx.fillRect(WALL, HEIGHT - WALL - 6, HOLE_WIDTH - WALL, 6)
    ctx.fillStyle = '#a9a3c9'
    ctx.font = '12px system-ui'
    ctx.textAlign = 'center'
    ctx.fillText('투입구', HOLE_CENTER_X, HEIGHT - 30)

    // 인형
    ctx.font = `${DOLL_RADIUS * 2}px system-ui`
    ctx.textBaseline = 'middle'
    for (const doll of this.dolls) {
      ctx.save()
      ctx.translate(doll.position.x, doll.position.y)
      ctx.rotate(doll.angle)
      ctx.fillText(this.emojiOf.get(doll.id) ?? '🧸', 0, 0)
      ctx.restore()
    }

    this.drawClaw(ctx)
    ctx.restore()
  }

  private drawClaw(ctx: CanvasRenderingContext2D) {
    const open = this.phase === 'aim' || this.phase === 'descend'
    const spread = open ? 17 : 7

    ctx.strokeStyle = '#e0aa3e'
    ctx.lineWidth = 5
    ctx.lineCap = 'round'

    // 와이어
    ctx.beginPath()
    ctx.moveTo(this.clawX, WALL)
    ctx.lineTo(this.clawX, this.clawY - 10)
    ctx.stroke()

    // 집게 두 갈래
    ctx.beginPath()
    ctx.moveTo(this.clawX, this.clawY - 10)
    ctx.lineTo(this.clawX - spread, this.clawY + 20)
    ctx.moveTo(this.clawX, this.clawY - 10)
    ctx.lineTo(this.clawX + spread, this.clawY + 20)
    ctx.stroke()
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export const CANVAS_SIZE = { width: WIDTH, height: HEIGHT }
