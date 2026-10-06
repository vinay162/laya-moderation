import { Ban, Check, ChevronLeft, ChevronRight, Pause, Pin, Play, Radio, RotateCcw, UserRound } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { ReplayBadge } from '../components/Badge'
import { Panel } from '../components/Panel'
import { isOffensive, Redacted } from '../components/Redacted'
import { LoadError, Section, Skeleton } from '../components/Section'
import { useData, type StreamComment, type StreamLog } from '../lib/data'
import { LABEL_NAME, LABELS, labelColor } from '../lib/labels'
import { usePrefs } from '../lib/prefs'
import { decide, FLAG_AT, streamTotals, topLabel, type Decision } from '../lib/stream'
import { useNearView } from '../lib/useNearView'

const SPEEDS = [
  { value: 1, label: 'Real rate' },
  { value: 5, label: '5× fast-forward' },
  { value: 20, label: '20× fast-forward' },
] as const

/** How long the inspector keeps the latest flagged comment before showing a newer one. */
const SWAP_MS = 4000

const DECISION: Record<Decision, { name: string; color: string; Icon: typeof Check }> = {
  approve: { name: 'Approved', color: 'var(--ok)', Icon: Check },
  human: { name: 'To a person', color: 'var(--review)', Icon: UserRound },
  remove: { name: 'Removed', color: 'var(--remove)', Icon: Ban },
}

export function Stream() {
  const [ref, near] = useNearView<HTMLDivElement>('150px')
  const state = useData('stream_log', near)
  return (
    <Section
      id="stream"
      title="Moderating 10,000 comments"
      badge={<ReplayBadge />}
      lede="Each square is one real comment from the Jigsaw test set. The model asks six questions about it and the square takes the colour of the strongest label, or stays grey if nothing reaches 50%. Hover or tap a square to see what the model said."
    >
      <div ref={ref}>
        {state.status === 'loading' && <Skeleton label="Loading 10,000 scored comments" height={560} />}
        {state.status === 'error' && <LoadError message={state.error} />}
        {state.status === 'ready' && <Replay log={state.data} />}
      </div>
    </Section>
  )
}

function Replay({ log }: { log: StreamLog }) {
  const { comments } = log
  const rate = log.comments_per_sec
  const totals = useMemo(() => streamTotals(comments), [comments])
  const flagged = useMemo(() => comments.flatMap((c, i) => (topLabel(c.p) ? [i] : [])), [comments])
  const { reducedMotion } = usePrefs()

  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState<number>(1)
  const [done, setDone] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [hovered, setHovered] = useState<number | null>(null)
  const [latestFlagged, setLatestFlagged] = useState<number | null>(null)
  const [swapKey, setSwapKey] = useState(0)
  const doneRef = useRef(0)
  const userPaused = useRef(reducedMotion)
  const wrap = useRef<HTMLDivElement>(null)

  // Play while the panel is on screen, unless the visitor paused it or prefers reduced motion.
  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setPlaying(e.isIntersecting && !userPaused.current), { threshold: 0.25 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const onProgress = useCallback(
    (n: number) => {
      doneRef.current = n
      setDone(n)
      if (n >= comments.length) setPlaying(false)
    },
    [comments.length],
  )

  // While playing, move the inspector to the newest flagged comment every SWAP_MS.
  // A manual "back to live" bumps swapKey, which restarts the timer and the countdown bar together.
  useEffect(() => {
    if (!playing) return
    const t = setTimeout(() => {
      setLatestFlagged(lastFlaggedBefore(flagged, doneRef.current))
      setSwapKey((k) => k + 1)
    }, SWAP_MS)
    return () => clearTimeout(t)
  }, [playing, swapKey, flagged])

  const reset = () => {
    doneRef.current = 0
    setDone(0)
    setPicked(null)
    setLatestFlagged(null)
    setSwapKey((k) => k + 1)
    userPaused.current = false
    setPlaying(true)
  }

  const togglePlay = () => {
    if (done >= comments.length) return reset()
    userPaused.current = playing
    setPlaying(!playing)
  }

  const backToLive = () => {
    setPicked(null)
    setLatestFlagged(lastFlaggedBefore(flagged, done))
    setSwapKey((k) => k + 1)
  }

  // Until the first swap, show the first flagged comment once it has been processed.
  const liveIdx = latestFlagged ?? (flagged[0] < done ? flagged[0] : null)
  const shownIdx = picked ?? hovered ?? liveIdx
  const mode: InspectorMode = picked !== null ? 'pinned' : hovered !== null ? 'hover' : 'live'
  const finished = done >= comments.length

  // Step through flagged comments that have already been processed.
  let prevFlagged: number | null = null
  let nextFlagged: number | null = null
  for (const i of flagged) {
    if (i >= done) break
    if (shownIdx === null || i < shownIdx) prevFlagged = i
    else if (i > shownIdx) {
      nextFlagged = i
      break
    }
  }

  return (
    <div ref={wrap}>
      <Panel
        title="Moderation stream"
        source={`Replayed at the measured throughput of the real run (${rate.toFixed(1)} comments/sec, ${log.questions_per_comment} questions each)`}
        bodyClassName="grid [&>*]:min-w-0 gap-5 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_22rem] lg:grid-rows-[auto_1fr]"
      >
        <div className="grid content-start gap-4 lg:col-start-1 lg:row-start-1">
          <TileCanvas
            comments={comments}
            playing={playing}
            speed={speed}
            rate={rate}
            done={done}
            onProgress={onProgress}
            selected={picked}
            onHover={setHovered}
            onPick={setPicked}
          />
          <Controls
            playing={playing}
            finished={finished}
            onToggle={togglePlay}
            onReset={reset}
            speed={speed}
            onSpeed={setSpeed}
            progress={done / comments.length}
          />
        </div>
        <Inspector
          comment={shownIdx !== null ? comments[shownIdx] : null}
          index={shownIdx}
          mode={mode}
          counting={mode === 'live' && playing}
          swapKey={swapKey}
          onPin={shownIdx !== null ? () => setPicked(shownIdx) : undefined}
          onLive={backToLive}
          onPrev={prevFlagged !== null ? () => setPicked(prevFlagged) : undefined}
          onNext={nextFlagged !== null ? () => setPicked(nextFlagged) : undefined}
        />
        <Counters done={done} total={comments.length} rate={rate} speed={speed} totals={totals} />
      </Panel>
    </div>
  )
}

/** The last flagged comment among the first n processed, or null. `flagged` is sorted. */
function lastFlaggedBefore(flagged: number[], n: number): number | null {
  for (let k = flagged.length - 1; k >= 0; k--) if (flagged[k] < n) return flagged[k]
  return null
}

/* ---------- Canvas ---------- */

interface TileCanvasProps {
  comments: StreamComment[]
  playing: boolean
  speed: number
  rate: number
  done: number
  onProgress: (n: number) => void
  selected: number | null
  onHover: (i: number | null) => void
  onPick: (i: number | null) => void
}

const FLASH_MS = 350
/** Magnifier: tiles shown on each side of the hovered one, and their size in px. */
const LOUPE_R = 4
const LOUPE_CELL = 14
const LOUPE_SIZE = (2 * LOUPE_R + 1) * LOUPE_CELL

function TileCanvas({ comments, playing, speed, rate, done, onProgress, selected, onHover, onPick }: TileCanvasProps) {
  const { theme } = usePrefs()
  const box = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const [layout, setLayout] = useState({ width: 0, cell: 6, cols: 1, rows: 1 })
  const colors = useRef<{ none: string; flash: string; bg: string; label: string[] }>({ none: '', flash: '', bg: '', label: [] })
  const drawn = useRef(0)
  const position = useRef(0)
  const recent = useRef<{ i: number; at: number }[]>([])
  const hover = useRef<{ i: number; x: number; y: number } | null>(null)
  const loupe = useRef<HTMLDivElement>(null)
  const loupeCanvas = useRef<HTMLCanvasElement>(null)
  const hoverRing = useRef<HTMLSpanElement>(null)
  const n = comments.length
  const tops = useMemo(() => comments.map((c) => topLabel(c.p)), [comments])

  // Size the grid so all 10,000 tiles fit in roughly a fixed height.
  useEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const width = Math.floor(entry.contentRect.width)
      const target = width < 640 ? 420 : 460
      const cell = Math.max(3, Math.floor(Math.sqrt((width * target) / n)))
      const cols = Math.floor(width / cell)
      setLayout({ width, cell, cols, rows: Math.ceil(n / cols) })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [n])

  const tileRect = useCallback(
    (i: number) => {
      const { cell, cols } = layout
      const gap = cell >= 6 ? 1.5 : 1
      return [(i % cols) * cell, Math.floor(i / cols) * cell, cell - gap, cell - gap] as const
    },
    [layout],
  )

  const paint = useCallback(
    (ctx: CanvasRenderingContext2D, i: number, flash = false) => {
      const c = colors.current
      const top = tops[i]
      ctx.fillStyle = flash ? c.flash : top ? c.label[LABELS.indexOf(top)] : c.none
      ctx.fillRect(...tileRect(i))
    },
    [tops, tileRect],
  )

  // Full redraw on resize, theme change or reset.
  const redraw = useCallback(() => {
    const cv = canvas.current
    if (!cv || !layout.width) return
    const css = getComputedStyle(document.documentElement)
    const v = (name: string) => css.getPropertyValue(name).trim()
    colors.current = {
      none: v('--l-none'),
      flash: v('--ink'),
      bg: v('--line'),
      label: LABELS.map((l) => v(`--l-${l}`)),
    }
    const dpr = window.devicePixelRatio || 1
    const h = layout.rows * layout.cell
    cv.width = layout.width * dpr
    cv.height = h * dpr
    cv.style.width = `${layout.width}px`
    cv.style.height = `${h}px`
    const ctx = cv.getContext('2d')!
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    // Empty slots are drawn faintly so the size of the whole run is visible from the start.
    ctx.globalAlpha = 0.55
    ctx.fillStyle = colors.current.bg
    for (let i = drawn.current; i < n; i++) ctx.fillRect(...tileRect(i))
    ctx.globalAlpha = 1
    for (let i = 0; i < drawn.current; i++) paint(ctx, i)
    recent.current = []
  }, [layout, n, paint, tileRect])

  // Magnified view of the tiles around the pointer. Positioned and drawn directly, without React renders,
  // because it follows every mouse move.
  const drawLoupe = useCallback(() => {
    const wrapEl = loupe.current
    const cv = loupeCanvas.current
    const ring = hoverRing.current
    const h = hover.current
    if (!wrapEl || !cv || !ring) return
    if (!h) {
      wrapEl.style.display = 'none'
      ring.style.display = 'none'
      return
    }
    const [tx, ty, tw, th] = tileRect(h.i)
    Object.assign(ring.style, { display: 'block', left: `${tx}px`, top: `${ty}px`, width: `${tw}px`, height: `${th}px` })

    const box = LOUPE_SIZE + 10 // canvas plus padding and border
    let left = h.x + 18
    if (left + box > layout.width) left = h.x - box - 18
    let top = h.y - box - 18
    if (top < 0) top = h.y + 18
    Object.assign(wrapEl.style, { display: 'block', left: `${left}px`, top: `${top}px` })

    const dpr = window.devicePixelRatio || 1
    if (cv.width !== LOUPE_SIZE * dpr) {
      cv.width = cv.height = LOUPE_SIZE * dpr
      cv.style.width = cv.style.height = `${LOUPE_SIZE}px`
    }
    const ctx = cv.getContext('2d')!
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, LOUPE_SIZE, LOUPE_SIZE)
    const c = colors.current
    const { cols } = layout
    const row0 = Math.floor(h.i / cols)
    const col0 = h.i % cols
    for (let dr = -LOUPE_R; dr <= LOUPE_R; dr++) {
      for (let dc = -LOUPE_R; dc <= LOUPE_R; dc++) {
        const r = row0 + dr
        const col = col0 + dc
        const i = r * cols + col
        if (r < 0 || col < 0 || col >= cols || i >= n) continue
        const top = tops[i]
        ctx.globalAlpha = i < drawn.current ? 1 : 0.55
        ctx.fillStyle = i >= drawn.current ? c.bg : top ? c.label[LABELS.indexOf(top)] : c.none
        ctx.fillRect((dc + LOUPE_R) * LOUPE_CELL + 1.5, (dr + LOUPE_R) * LOUPE_CELL + 1.5, LOUPE_CELL - 3, LOUPE_CELL - 3)
      }
    }
    ctx.globalAlpha = 1
    ctx.strokeStyle = c.flash
    ctx.lineWidth = 2
    ctx.strokeRect(LOUPE_R * LOUPE_CELL + 0.5, LOUPE_R * LOUPE_CELL + 0.5, LOUPE_CELL - 1, LOUPE_CELL - 1)
  }, [layout, n, tops, tileRect])

  useEffect(() => {
    // Theme is read from CSS variables inside redraw, so a theme change needs a repaint.
    void theme
    redraw()
  }, [redraw, theme])

  // Parent reset: done went back to 0.
  useEffect(() => {
    if (done === 0 && drawn.current > 0) {
      drawn.current = 0
      position.current = 0
      redraw()
    }
  }, [done, redraw])

  // Animation loop: advance by rate x speed comments per second and paint only what changed.
  useEffect(() => {
    if (!playing || !layout.width) return
    const ctx = canvas.current!.getContext('2d')!
    let raf = 0
    let last = performance.now()
    let lastReport = 0
    const frame = (now: number) => {
      // A frame timestamp can be slightly earlier than the performance.now() taken when the loop started,
      // so clamp at 0: a negative step would push the count to -1.
      const dt = Math.max(0, Math.min(0.1, (now - last) / 1000))
      last = now
      position.current = Math.min(n, position.current + dt * rate * speed)
      const target = Math.floor(position.current)
      for (let i = drawn.current; i < target; i++) {
        paint(ctx, i, true)
        recent.current.push({ i, at: now })
      }
      drawn.current = Math.max(drawn.current, target)
      if (hover.current) drawLoupe()
      while (recent.current.length && now - recent.current[0].at > FLASH_MS) paint(ctx, recent.current.shift()!.i)
      if (now - lastReport > 100 || target >= n) {
        lastReport = now
        onProgress(target)
      }
      if (target < n || recent.current.length) raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      for (const r of recent.current) paint(ctx, r.i)
      recent.current = []
    }
  }, [playing, speed, rate, n, layout.width, paint, onProgress, drawLoupe])

  const indexAt = (e: PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const col = Math.floor((e.clientX - r.left) / layout.cell)
    const row = Math.floor((e.clientY - r.top) / layout.cell)
    if (col < 0 || col >= layout.cols) return null
    const i = row * layout.cols + col
    return i >= 0 && i < drawn.current ? i : null
  }

  const onMove = (e: PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType !== 'mouse') return
    const i = indexAt(e)
    const r = e.currentTarget.getBoundingClientRect()
    hover.current = i === null ? null : { i, x: e.clientX - r.left, y: e.clientY - r.top }
    drawLoupe()
    onHover(i)
  }

  const onLeave = () => {
    hover.current = null
    drawLoupe()
    onHover(null)
  }

  const onKey = (e: KeyboardEvent<HTMLCanvasElement>) => {
    const max = drawn.current - 1
    if (max < 0) return
    const step: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: layout.cols, ArrowUp: -layout.cols }
    if (e.key === 'Escape') return onPick(null)
    if (!(e.key in step)) return
    e.preventDefault()
    onPick(Math.min(max, Math.max(0, (selected ?? max) + step[e.key])))
  }

  const sel = selected !== null ? tileRect(selected) : null

  return (
    <div ref={box} className="relative min-w-0">
      <canvas
        ref={canvas}
        tabIndex={0}
        role="img"
        aria-label={`Grid of ${n.toLocaleString('en-US')} comments, ${done.toLocaleString('en-US')} processed so far. Use arrow keys to inspect processed comments.`}
        className="block cursor-crosshair touch-manipulation rounded-md"
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        onPointerDown={(e) => onPick(indexAt(e))}
        onKeyDown={onKey}
      />
      <span
        ref={hoverRing}
        aria-hidden="true"
        className="pointer-events-none absolute hidden rounded-[2px] ring-2 ring-ink/70"
      />
      <div
        ref={loupe}
        aria-hidden="true"
        className="pointer-events-none absolute z-10 hidden rounded-lg border border-line-strong bg-panel p-1 shadow-lg"
      >
        <canvas ref={loupeCanvas} className="block" />
      </div>
      {sel && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute rounded-[2px] ring-2 ring-ink ring-offset-1 ring-offset-panel"
          style={{ left: sel[0], top: sel[1], width: sel[2], height: sel[3] }}
        />
      )}
    </div>
  )
}

/* ---------- Controls and counters ---------- */

function Controls(props: {
  playing: boolean
  finished: boolean
  onToggle: () => void
  onReset: () => void
  speed: number
  onSpeed: (s: number) => void
  progress: number
}) {
  const { playing, finished, onToggle, onReset, speed, onSpeed, progress } = props
  return (
    <div className="grid gap-3">
      <div className="h-1 overflow-hidden rounded-full bg-sunken" aria-hidden="true">
        <div className="spectrum h-full rounded-full" style={{ width: `${progress * 100}%` }} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onToggle}
          className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-1.5 text-sm font-semibold text-bg"
        >
          {playing ? <Pause aria-hidden="true" className="h-4 w-4" /> : <Play aria-hidden="true" className="h-4 w-4" />}
          {playing ? 'Pause' : finished ? 'Replay' : 'Play'}
        </button>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm hover:bg-hover"
        >
          <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" />
          Reset
        </button>
        <div role="radiogroup" aria-label="Replay speed" className="ml-auto flex flex-wrap gap-1 rounded-full border border-line bg-sunken p-0.5">
          {SPEEDS.map((s) => (
            <button
              key={s.value}
              type="button"
              role="radio"
              aria-checked={speed === s.value}
              onClick={() => onSpeed(s.value)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                speed === s.value ? 'bg-panel text-ink shadow-sm ring-1 ring-line-strong' : 'text-ink-3 hover:text-ink-2'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function Counters({
  done,
  total,
  rate,
  speed,
  totals,
}: {
  done: number
  total: number
  rate: number
  speed: number
  totals: ReturnType<typeof streamTotals>
}) {
  const routed = (k: Decision) => totals.routed[k][done]
  return (
    <div className="grid content-start gap-4 text-sm lg:col-start-1 lg:row-start-2">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Processed" value={done.toLocaleString('en-US')} sub={`of ${total.toLocaleString('en-US')}`} />
        <Stat label="Cost so far" value="$0.00" sub="self-hosted" />
        <Stat
          label="Comments per second"
          value={rate.toFixed(1)}
          sub={speed === 1 ? 'as measured' : `measured, shown at ${speed}×`}
        />
        <Stat label="Questions asked" value={(done * 6).toLocaleString('en-US')} sub="6 per comment" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 sm:gap-6 [&>*]:min-w-0">
        <div>
          <p className="mb-2 text-xs text-ink-3">Routing on P(toxic): approve below 0.10, remove at 0.90+</p>
          <div className="flex h-2 gap-[2px] overflow-hidden rounded-full bg-sunken" aria-hidden="true">
            {(['approve', 'human', 'remove'] as const).map((k) => (
              <div key={k} style={{ width: done ? `${(100 * routed(k)) / done}%` : 0, background: DECISION[k].color }} />
            ))}
          </div>
          <ul className="mt-2 grid gap-1">
            {(['approve', 'human', 'remove'] as const).map((k) => {
              const { name, color, Icon } = DECISION[k]
              return (
                <li key={k} className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-2 text-ink-2">
                    <Icon aria-hidden="true" className="h-3.5 w-3.5" style={{ color }} strokeWidth={2.5} />
                    {name}
                  </span>
                  <span className="num">{routed(k).toLocaleString('en-US')}</span>
                </li>
              )
            })}
          </ul>
        </div>

        <div>
          <p className="mb-2 text-xs text-ink-3">Flagged at 50%+ (a comment can have several labels)</p>
          <ul className="grid grid-cols-2 gap-x-5 gap-y-1">
            {LABELS.map((l) => (
              <li key={l} className="flex items-center justify-between gap-2">
                <span className="inline-flex min-w-0 items-center gap-2 text-ink-2">
                  <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-[2px]" style={{ background: labelColor(l) }} />
                  <span className="truncate">{LABEL_NAME[l]}</span>
                </span>
                <span className="num">{totals.flagged[l][done].toLocaleString('en-US')}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-lg bg-sunken px-3 py-2">
      <div className="num text-lg font-medium">{value}</div>
      <div className="text-xs text-ink-2">{label}</div>
      <div className="text-[11px] text-ink-3">{sub}</div>
    </div>
  )
}

/* ---------- Inspector ---------- */

type InspectorMode = 'live' | 'hover' | 'pinned'

const MODE_TEXT: Record<InspectorMode, string> = {
  live: 'Live: newest flagged',
  hover: 'Hovering',
  pinned: 'Pinned',
}

function Inspector({
  comment,
  index,
  mode,
  counting,
  swapKey,
  onPin,
  onLive,
  onPrev,
  onNext,
}: {
  comment: StreamComment | null
  index: number | null
  mode: InspectorMode
  /** True while the live view is waiting to move to a newer comment. */
  counting: boolean
  swapKey: number
  onPin?: () => void
  onLive: () => void
  onPrev?: () => void
  onNext?: () => void
}) {
  const btn =
    'inline-flex items-center gap-1 rounded-full border border-line px-2.5 py-1 text-xs hover:bg-hover disabled:opacity-40 disabled:hover:bg-transparent'
  return (
    <section
      aria-label="Comment inspector"
      className="grid content-start gap-4 border-t border-line pt-5 [&>*]:min-w-0 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-5"
    >
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-[15px] font-semibold tracking-tight">Comment inspector</h3>
            <p className="text-xs text-ink-3">
              {index === null
                ? 'Waiting for the first flagged comment'
                : `${MODE_TEXT[mode]}, comment ${(index + 1).toLocaleString('en-US')}`}
            </p>
          </div>
          {comment && <DecisionChip pToxic={comment.p[0]} />}
        </div>
        {/* Countdown to the next live comment. Hidden for reduced motion, where it would only flash. */}
        <div className="mt-2 h-0.5 overflow-hidden rounded-full bg-sunken motion-reduce:hidden" aria-hidden="true">
          {counting && <div key={swapKey} className="inspector-countdown h-full origin-left rounded-full bg-ink-3" />}
        </div>
      </div>

      {comment && index !== null ? (
        <>
          {/* Revealing or clicking the text keeps this comment on screen. */}
          <blockquote
            className="min-h-[4.5rem] border-l-2 border-line-strong pl-4 text-[15px] leading-relaxed"
            onClickCapture={mode === 'pinned' ? undefined : onPin}
          >
            <Redacted text={comment.text} offensive={isOffensive(comment.y, comment.p)} />
          </blockquote>
          <ScoreRows comment={comment} />
        </>
      ) : (
        <p className="text-sm text-ink-3">
          The newest flagged comment shows up here as the replay runs. Hover or tap any coloured square to see its six
          scores.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        {mode === 'pinned' ? (
          <button type="button" onClick={onLive} className={`${btn} border-line-strong font-medium text-ink`}>
            <Radio aria-hidden="true" className="h-3.5 w-3.5" />
            Back to live
          </button>
        ) : (
          <button type="button" onClick={onPin} disabled={!onPin} className={`${btn} border-line-strong font-medium text-ink`}>
            <Pin aria-hidden="true" className="h-3.5 w-3.5" />
            Keep this one
          </button>
        )}
        <button type="button" onClick={onPrev} disabled={!onPrev} className={btn} aria-label="Previous flagged comment">
          <ChevronLeft aria-hidden="true" className="h-3.5 w-3.5" />
          Previous
        </button>
        <button type="button" onClick={onNext} disabled={!onNext} className={btn} aria-label="Next flagged comment">
          Next
          <ChevronRight aria-hidden="true" className="h-3.5 w-3.5" />
        </button>
      </div>
      {mode === 'live' && (
        <p className="text-xs text-ink-3">
          Changes every 4 seconds while the replay runs. Hover a square to look at it, or click or tap it to keep it here.
        </p>
      )}
    </section>
  )
}

function DecisionChip({ pToxic }: { pToxic: number }) {
  const { name, color, Icon } = DECISION[decide(pToxic)]
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-white"
      style={{ background: color }}
    >
      <Icon aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2.5} />
      {name}
    </span>
  )
}

function ScoreRows({ comment }: { comment: StreamComment }) {
  return (
    <table className="w-full border-collapse text-sm">
      <caption className="sr-only">Calibrated probability and human label for each question</caption>
      <thead>
        <tr className="text-left text-xs text-ink-3">
          <th scope="col" className="pb-1 font-medium">Label</th>
          <th scope="col" className="pb-1 font-medium">Probability</th>
          <th scope="col" className="pb-1 text-right font-medium">Human</th>
        </tr>
      </thead>
      <tbody>
        {LABELS.map((l, j) => {
          const p = comment.p[j]
          const yes = comment.y[j] === 1
          const right = p >= FLAG_AT === yes
          return (
            <tr key={l}>
              <th scope="row" className="py-1 pr-3 text-left font-normal whitespace-nowrap text-ink-2">
                {LABEL_NAME[l]}
              </th>
              <td className="w-full py-1 pr-3">
                <div className="flex items-center gap-2">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-sunken">
                    <div className="h-full rounded-full transition-[width] duration-300" style={{ width: `${p * 100}%`, background: labelColor(l) }} />
                  </div>
                  <span className="num w-10 text-right text-xs">{p.toFixed(3)}</span>
                </div>
              </td>
              <td className="py-1 text-right whitespace-nowrap">
                <span className="text-xs text-ink-2">{yes ? 'Yes' : 'No'}</span>
                <span
                  className={`ml-2 inline-block w-4 text-center font-semibold ${right ? 'text-ok' : 'text-remove'}`}
                  aria-label={right ? 'model agrees at 50%' : 'model disagrees at 50%'}
                >
                  {right ? '✓' : '✗'}
                </span>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
