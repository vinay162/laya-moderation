import { Play, RotateCcw } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ReplayBadge } from '../components/Badge'
import { Panel } from '../components/Panel'
import { LoadError, Meaning, Section, Skeleton } from '../components/Section'
import { useData, type RaceEntry } from '../lib/data'
import { usePrefs } from '../lib/prefs'
import { useNearView } from '../lib/useNearView'

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

export function Race() {
  const [ref, near] = useNearView<HTMLDivElement>('150px')
  const state = useData('race_log', near)
  return (
    <Section
      id="race"
      title="Laya vs an LLM API"
      badge={<ReplayBadge />}
      lede="A popular shortcut for moderation is to send every comment to a large language model. Here are the same comments scored both ways, one at a time, with the latency each request really took."
    >
      <div ref={ref}>
        {state.status === 'loading' && <Skeleton label="Loading race results" height={360} />}
        {state.status === 'error' && <LoadError message={state.error} />}
        {state.status === 'ready' && <RaceBody entries={state.data} />}
      </div>
    </Section>
  )
}

interface Lane {
  key: 'laya' | 'gemini'
  name: string
  detail: string
  cost: string
  ms: number[]
}

function RaceBody({ entries }: { entries: RaceEntry[] }) {
  // Only the requests Gemini answered, used for both lanes so they race over identical comments.
  const ok = useMemo(() => entries.filter((e) => e.gemini.ok && e.gemini.ms !== undefined), [entries])
  const lanes: Lane[] = useMemo(
    () => [
      {
        key: 'laya',
        name: 'Laya',
        detail: 'Self-hosted on one Kaggle T4 GPU. All 6 questions in one batch.',
        cost: '$0 per request',
        ms: ok.map((e) => e.laya.ms),
      },
      {
        key: 'gemini',
        name: 'Gemini 2.5 Flash',
        detail: 'One API call per comment over the internet, asking for all 6 labels.',
        cost: 'Billed per token',
        ms: ok.map((e) => e.gemini.ms!),
      },
    ],
    [ok],
  )
  const longest = Math.max(...lanes.map((l) => l.ms.reduce((s, v) => s + v, 0)))

  const { reducedMotion } = usePrefs()
  const [speed, setSpeed] = useState(1)
  const [elapsed, setElapsed] = useState(0)
  const [running, setRunning] = useState(false)
  const wrap = useRef<HTMLDivElement>(null)
  const started = useRef(false)

  // Start once when the panel scrolls into view (not for reduced motion; the button still works).
  useEffect(() => {
    const el = wrap.current
    if (!el || reducedMotion) return
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !started.current) {
          started.current = true
          setRunning(true)
        }
      },
      { threshold: 0.4 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [reducedMotion])

  const clock = useRef(0)
  useEffect(() => {
    if (!running) return
    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      clock.current = Math.min(longest, clock.current + (now - last) * speed)
      last = now
      setElapsed(clock.current)
      if (clock.current >= longest) setRunning(false)
      else raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [running, speed, longest])

  const restart = () => {
    started.current = true
    clock.current = 0
    setElapsed(0)
    setRunning(true)
  }

  const [laya, gemini] = lanes
  const layaMedian = median(laya.ms)
  const geminiMedian = median(gemini.ms)

  return (
    <div ref={wrap} className="grid gap-6">
      <Panel
        title={`The same ${ok.length} comments, one request at a time`}
        source="Recorded latency per request; rate-limit pauses between calls are not counted"
        actions={
          <>
            <div role="radiogroup" aria-label="Race speed" className="flex gap-1 rounded-full border border-line bg-sunken p-0.5">
              {[
                { v: 1, label: 'Real time' },
                { v: 5, label: '5× fast-forward' },
              ].map((s) => (
                <button
                  key={s.v}
                  type="button"
                  role="radio"
                  aria-checked={speed === s.v}
                  onClick={() => setSpeed(s.v)}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    speed === s.v ? 'bg-panel text-ink shadow-sm ring-1 ring-line-strong' : 'text-ink-3 hover:text-ink-2'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={restart}
              className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3 py-1 text-xs font-semibold text-bg"
            >
              {elapsed > 0 ? <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" /> : <Play aria-hidden="true" className="h-3.5 w-3.5" />}
              {elapsed > 0 ? 'Restart' : 'Start'}
            </button>
          </>
        }
        bodyClassName="grid gap-6 p-4 sm:p-6"
      >
        {lanes.map((lane) => (
          <LaneView key={lane.key} lane={lane} elapsed={elapsed} strong={lane.key === 'laya'} />
        ))}
        <p className="num text-xs text-ink-3" aria-live="off">
          Clock: {(elapsed / 1000).toFixed(1)} s{speed !== 1 && ' (fast-forward)'}
        </p>
      </Panel>

      <div className="grid [&>*]:min-w-0 gap-4 sm:grid-cols-2">
        <Panel bodyClassName="px-4 py-4 sm:px-5">
          <div className="num text-3xl font-medium tracking-tight">{Math.round(layaMedian)} ms</div>
          <div className="mt-1 text-sm font-medium">Laya, median per comment</div>
          <p className="mt-1 text-xs text-ink-3">Kaggle T4 GPU, 6 questions per comment. $0 per request.</p>
        </Panel>
        <Panel bodyClassName="px-4 py-4 sm:px-5">
          <div className="num text-3xl font-medium tracking-tight text-ink-2">{Math.round(geminiMedian).toLocaleString('en-US')} ms</div>
          <div className="mt-1 text-sm font-medium">Gemini 2.5 Flash, median per comment</div>
          <p className="mt-1 text-xs text-ink-3">API call over the internet. Billed per token.</p>
        </Panel>
      </div>
      <Meaning>
        Gemini&rsquo;s free tier answered {ok.length} of {entries.length} requests before hitting its quota, so only
        those {ok.length} are used in both lanes, and accuracy is not compared. Laya&rsquo;s first request includes a
        one-off warm-up of {Math.round(laya.ms[0])} ms. This compares latency and cost only; it says nothing about which
        model moderates better.
      </Meaning>
    </div>
  )
}

function LaneView({ lane, elapsed, strong }: { lane: Lane; elapsed: number; strong: boolean }) {
  const ends = useMemo(() => {
    let sum = 0
    return lane.ms.map((m) => (sum += m))
  }, [lane.ms])
  const total = ends[ends.length - 1]
  const finished = ends.filter((t) => t <= elapsed).length
  const current = Math.min(finished, lane.ms.length - 1)
  const start = current ? ends[current - 1] : 0
  const partial = finished < lane.ms.length ? Math.max(0, Math.min(1, (elapsed - start) / lane.ms[current])) : 1
  const done = finished === lane.ms.length

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div>
          <h3 className={`font-semibold ${strong ? 'text-ink' : 'text-ink-2'}`}>{lane.name}</h3>
          <p className="text-xs text-ink-3">{lane.detail}</p>
        </div>
        <p className="num text-sm">
          <span className={strong ? 'font-medium text-ink' : 'text-ink-2'}>
            {finished}/{lane.ms.length}
          </span>
          <span className="text-ink-3"> done</span>
          {done && <span className="ml-2 text-ink-3">in {(total / 1000).toFixed(2)} s</span>}
        </p>
      </div>
      <div className="mt-3 flex gap-[3px]" aria-hidden="true">
        {lane.ms.map((m, i) => {
          const fill = i < finished ? 1 : i === finished ? partial : 0
          return (
            <div key={i} className="relative h-7 flex-1 overflow-hidden rounded-[4px] bg-sunken" title={`${Math.round(m)} ms`}>
              <div
                className="absolute inset-y-0 left-0"
                style={{ width: `${fill * 100}%`, background: strong ? 'var(--m-laya)' : 'var(--m-detoxify)' }}
              />
            </div>
          )
        })}
      </div>
      <p className="sr-only">
        {lane.name} finished {finished} of {lane.ms.length} requests.
      </p>
    </div>
  )
}
