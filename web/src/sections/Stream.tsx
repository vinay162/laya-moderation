import { Ban, Check, ChevronLeft, ChevronRight, Pause, Play, RotateCcw, UserRound } from 'lucide-react'
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
  const { reducedMotion } = usePrefs()

  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState<number>(1)
  const [done, setDone] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [hovered, setHovered] = useState<number | null>(null)
  const [latestFlagged, setLatestFlagged] = useState<number | null>(null)
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
      setDone(n)
      if (n >= comments.length) setPlaying(false)
    },
    [comments.length],
  )

  const flagged = useMemo(() => comments.flatMap((c, i) => (topLabel(c.p) ? [i] : [])), [comments])

  // Show the most recent flagged comment, but change it at most every few seconds so it can be read,
  // and not at all while the pointer or keyboard focus is on the inspector.
  const lastSwap = useRef(0)
  const held = useRef({ pointer: false, focus: false })
  useEffect(() => {
    const now = performance.now()
    if (held.current.pointer || held.current.focus || now - lastSwap.current < SWAP_MS) return
    for (let i = done - 1; i >= Math.max(0, done - 400); i--) {
      if (topLabel(comments[i].p)) {
        lastSwap.current = now
        setLatestFlagged(i)
        break
      }
    }
  }, [done, comments])

  const hold = (key: 'pointer' | 'focus', on: boolean) => {
    held.current[key] = on
    // Give the reader a full interval after they move away.
    if (!on) lastSwap.current = performance.now()
  }

  const reset = () => {
    setDone(0)
    setPicked(null)
    setLatestFlagged(null)
    userPaused.current = false
    setPlaying(true)
  }

  const togglePlay = () => {
    if (done >= comments.length) return reset()
    userPaused.current = playing
    setPlaying(!playing)
  }

  const shownIdx = picked ?? hovered ?? latestFlagged
  const shownMode = picked !== null ? 'Selected' : hovered !== null ? 'Hovered' : 'Latest flagged'
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
    <div ref={wrap} className="grid gap-6">
      <Panel
        title="Moderation stream"
        source={`Replayed at the measured throughput of the real run (${rate.toFixed(1)} comments/sec, ${log.questions_per_comment} questions each)`}
        bodyClassName="grid [&>*]:min-w-0 gap-5 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_20rem]"
      >
        <div className="grid content-start gap-4">
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
        <Counters done={done} total={comments.length} rate={rate} speed={speed} totals={totals} />
      </Panel>

      <div
        onPointerEnter={() => hold('pointer', true)}
        onPointerLeave={() => hold('pointer', false)}
        onFocus={() => hold('focus', true)}
        onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && hold('focus', false)}
      >
        <Inspector
          comment={shownIdx !== null ? comments[shownIdx] : null}
          index={shownIdx}
          mode={shownMode}
          onClear={picked !== null ? () => setPicked(null) : undefined}
          onPrev={prevFlagged !== null ? () => setPicked(prevFlagged) : undefined}
          onNext={nextFlagged !== null ? () => setPicked(nextFlagged) : undefined}
        />
      </div>
    </div>
  )
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

function TileCanvas({ comments, playing, speed, rate, done, onProgress, selected, onHover, onPick }: TileCanvasProps) {
  const { theme } = usePrefs()
  const box = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const [layout, setLayout] = useState({ width: 0, cell: 6, cols: 1, rows: 1 })
  const colors = useRef<{ none: string; flash: string; bg: string; label: string[] }>({ none: '', flash: '', bg: '', label: [] })
  const drawn = useRef(0)
  const position = useRef(0)
  const recent = useRef<{ i: number; at: number }[]>([])
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
  }, [playing, speed, rate, n, layout.width, paint, onProgress])

  const indexAt = (e: PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const col = Math.floor((e.clientX - r.left) / layout.cell)
    const row = Math.floor((e.clientY - r.top) / layout.cell)
    if (col < 0 || col >= layout.cols) return null
    const i = row * layout.cols + col
    return i >= 0 && i < drawn.current ? i : null
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
        onPointerMove={(e) => e.pointerType === 'mouse' && onHover(indexAt(e))}
        onPointerLeave={() => onHover(null)}
        onPointerDown={(e) => onPick(indexAt(e))}
        onKeyDown={onKey}
      />
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
    <div className="grid content-start gap-4 text-sm">
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Processed" value={done.toLocaleString('en-US')} sub={`of ${total.toLocaleString('en-US')}`} />
        <Stat label="Cost so far" value="$0.00" sub="self-hosted" />
        <Stat
          label="Comments per second"
          value={rate.toFixed(1)}
          sub={speed === 1 ? 'as measured' : `measured, shown at ${speed}×`}
        />
        <Stat label="Questions asked" value={(done * 6).toLocaleString('en-US')} sub="6 per comment" />
      </div>

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
        <ul className="grid gap-1">
          {LABELS.map((l) => (
            <li key={l} className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-2 text-ink-2">
                <span aria-hidden="true" className="h-2.5 w-2.5 rounded-[2px]" style={{ background: labelColor(l) }} />
                {LABEL_NAME[l]}
              </span>
              <span className="num">{totals.flagged[l][done].toLocaleString('en-US')}</span>
            </li>
          ))}
        </ul>
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

function Inspector({
  comment,
  index,
  mode,
  onClear,
  onPrev,
  onNext,
}: {
  comment: StreamComment | null
  index: number | null
  mode: string
  onClear?: () => void
  onPrev?: () => void
  onNext?: () => void
}) {
  if (!comment || index === null) {
    return (
      <Panel title="Comment inspector">
        <p className="text-sm text-ink-3">Hover or tap any coloured square to see the comment and all six scores.</p>
      </Panel>
    )
  }
  const step = 'inline-flex items-center gap-1 rounded-full border border-line px-2.5 py-1 text-xs hover:bg-hover disabled:opacity-40 disabled:hover:bg-transparent'
  const d = decide(comment.p[0])
  const { name, color, Icon } = DECISION[d]
  return (
    <Panel
      title="Comment inspector"
      source={`${mode}: comment ${(index + 1).toLocaleString('en-US')} of 10,000`}
      actions={
        <>
          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-white" style={{ background: color }}>
            <Icon aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2.5} />
            {name}
          </span>
          <span className="inline-flex gap-1">
            <button type="button" onClick={onPrev} disabled={!onPrev} className={step}>
              <ChevronLeft aria-hidden="true" className="h-3.5 w-3.5" />
              Previous flagged
            </button>
            <button type="button" onClick={onNext} disabled={!onNext} className={step}>
              Next flagged
              <ChevronRight aria-hidden="true" className="h-3.5 w-3.5" />
            </button>
          </span>
          {onClear && (
            <button type="button" onClick={onClear} className="rounded-full border border-line px-2.5 py-1 text-xs hover:bg-hover">
              Clear selection
            </button>
          )}
        </>
      }
      bodyClassName="grid [&>*]:min-w-0 gap-5 p-4 sm:p-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]"
    >
      <blockquote className="border-l-2 border-line-strong pl-4 text-[15px] leading-relaxed">
        <Redacted text={comment.text} offensive={isOffensive(comment.y, comment.p)} />
      </blockquote>
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">Calibrated probability and human label for each question</caption>
        <thead>
          <tr className="text-left text-xs text-ink-3">
            <th scope="col" className="pb-1 font-medium">Label</th>
            <th scope="col" className="pb-1 font-medium">Calibrated probability</th>
            <th scope="col" className="pb-1 text-right font-medium">Human label</th>
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
      {mode === 'Latest flagged' && (
        <p className="text-xs text-ink-3 md:col-span-2">
          While the replay runs, this shows a newer flagged comment every 4 seconds and holds while your pointer is here.
          Click any square, use Previous and Next, or press Pause to keep one on screen.
        </p>
      )}
    </Panel>
  )
}
