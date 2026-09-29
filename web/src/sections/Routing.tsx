import { Ban, Check, RotateCcw, TriangleAlert, UserRound, type LucideIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { RoutingHistogram, ZONE_COLOR, type Zone } from '../charts/RoutingHistogram'
import { Panel } from '../components/Panel'
import { LoadError, Meaning, Section, Skeleton } from '../components/Section'
import { Slider } from '../components/Slider'
import { useData, type RoutingPoints } from '../lib/data'
import { histogram, route, type RoutingResult } from '../lib/routing'
import { useNearView } from '../lib/useNearView'

export const DEFAULT_APPROVE = 0.1
export const DEFAULT_REMOVE = 0.9

export function Routing() {
  const [ref, near] = useNearView<HTMLDivElement>()
  const state = useData('routing_points', near)
  return (
    <Section
      id="routing"
      title="Routing simulator"
      lede="This is how the model would be used in practice. Every comment gets a calibrated chance of being toxic. Confident calls are handled automatically and everything in between goes to a person. Move the two lines and see what happens across all 63,978 test comments."
    >
      <div ref={ref}>
        {state.status === 'loading' && <Skeleton label="Loading 63,978 scored comments" height={560} />}
        {state.status === 'error' && <LoadError message={state.error} />}
        {state.status === 'ready' && <Simulator data={state.data} />}
      </div>
    </Section>
  )
}

const ZONES: { key: Zone; name: string; Icon: LucideIcon }[] = [
  { key: 'approve', name: 'Approved automatically', Icon: Check },
  { key: 'human', name: 'Sent to a person', Icon: UserRound },
  { key: 'remove', name: 'Removed automatically', Icon: Ban },
]

const pct2 = (v: number | null) => (v === null ? 'none' : `${v.toFixed(2)}%`)

function Simulator({ data }: { data: RoutingPoints }) {
  const [approve, setApprove] = useState(DEFAULT_APPROVE)
  const [remove, setRemove] = useState(DEFAULT_REMOVE)
  const result = useMemo(() => route(data.p, data.y, approve, remove), [data, approve, remove])
  const hist = useMemo(() => histogram(data.p, data.y), [data])
  const isDefault = approve === DEFAULT_APPROVE && remove === DEFAULT_REMOVE

  // Keep approve strictly below remove.
  const onApprove = (v: number) => setApprove(Math.min(v, Math.round((remove - 0.01) * 100) / 100))
  const onRemove = (v: number) => setRemove(Math.max(v, Math.round((approve + 0.01) * 100) / 100))

  return (
    <div className="grid gap-6">
      <Panel
        title="Policy"
        source="Calibrated P(toxic) for the toxic question, full test set"
        actions={
          <button
            type="button"
            onClick={() => {
              setApprove(DEFAULT_APPROVE)
              setRemove(DEFAULT_REMOVE)
            }}
            disabled={isDefault}
            className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-xs font-medium transition-opacity hover:bg-hover disabled:opacity-40"
          >
            <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" />
            Reset to 0.10 / 0.90
          </button>
        }
        bodyClassName="grid gap-8 p-4 sm:p-6"
      >
        <div className="grid gap-8 sm:grid-cols-2 sm:gap-10">
          <Slider
            label="Approve automatically below"
            hint="Comments scored under this are published without review."
            value={approve}
            min={0}
            max={0.5}
            color={ZONE_COLOR.approve}
            onChange={onApprove}
          />
          <Slider
            label="Remove automatically at or above"
            hint="Comments scored at or over this are taken down without review."
            value={remove}
            min={0.5}
            max={0.99}
            color={ZONE_COLOR.remove}
            onChange={onRemove}
          />
        </div>

        <Outcome result={result} />
      </Panel>

      <div className="grid [&>*]:min-w-0 gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Panel title="Where comments land" source="Count per 0.01 of P(toxic), log scale">
          <RoutingHistogram hist={hist} approveBelow={approve} removeAtOrAbove={remove} />
        </Panel>
        <div className="grid content-start gap-4">
          <Quality
            title="Removal precision"
            value={pct2(result.removalPrecisionPct)}
            meaning="Of the comments removed automatically, how many really were toxic. Higher is better."
          />
          <Quality
            title="Toxic among approved"
            value={pct2(result.missedInApprovedPct)}
            meaning="Of the comments published automatically, how many were actually toxic. Lower is better."
          />
          <Meaning>
            The two lines trade off against each other. Widen the middle and people review more but fewer mistakes get
            through. At 0.10 and 0.90 the model handles about 82% of comments on its own.
          </Meaning>
        </div>
      </div>

      <div className="flex gap-3 rounded-xl border border-review/40 bg-review/[0.07] p-4 sm:p-5">
        <TriangleAlert aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-review" />
        <div className="text-sm text-ink-2">
          <p className="font-semibold text-ink">Is 88% removal precision good enough?</p>
          <p className="mt-1 max-w-[80ch]">
            On its own, not for deleting comments outright. At 0.90, about 1 in 8 automatic removals was a comment the
            human labellers called clean. Some of those are label noise (see{' '}
            <a href="#fails" className="underline underline-offset-2 hover:text-ink">
              where it fails
            </a>
            ), but a real platform should
            treat &ldquo;remove&rdquo; as &ldquo;hide until a person checks&rdquo;, or at least offer an appeal. Moving
            the line up barely helps, because calibrated scores rarely go above 0.93: at 0.95 only 2 of 63,978 comments
            are removed. The dependable part is the other end. 77.8% of comments are approved automatically and only
            0.34% of those were actually toxic.
          </p>
        </div>
      </div>
    </div>
  )
}

function Outcome({ result }: { result: RoutingResult }) {
  const share: Record<Zone, number> = { approve: result.approvedPct, human: result.humanPct, remove: result.removedPct }
  const count: Record<Zone, number> = { approve: result.approved, human: result.human, remove: result.removed }
  const automated = result.approvedPct + result.removedPct

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <p className="text-sm text-ink-2">
          Handled without a person:{' '}
          <span className="num text-2xl font-medium text-ink">{automated.toFixed(2)}%</span>
        </p>
        <p className="num text-xs text-ink-3">{result.total.toLocaleString('en-US')} comments</p>
      </div>

      <div className="mt-3 flex h-9 w-full gap-[2px] overflow-hidden rounded-lg" role="img" aria-label={ZONES.map((z) => `${z.name} ${share[z.key].toFixed(2)}%`).join(', ')}>
        {ZONES.map(({ key, Icon }) => (
          <div
            key={key}
            className="flex min-w-0 items-center justify-center overflow-hidden text-white transition-[width] duration-300 ease-out"
            style={{ width: `${share[key]}%`, background: ZONE_COLOR[key] }}
          >
            {share[key] > 6 && (
              <span
                className={`num items-center gap-1 px-2 text-xs font-medium whitespace-nowrap ${
                  share[key] > 16 ? 'inline-flex' : 'hidden sm:inline-flex'
                }`}
              >
                <Icon aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2.5} />
                {share[key].toFixed(1)}%
              </span>
            )}
          </div>
        ))}
      </div>

      <dl className="mt-4 grid gap-3 sm:grid-cols-3">
        {ZONES.map(({ key, name, Icon }) => (
          <div key={key} className="flex items-start gap-3 rounded-lg bg-sunken px-3 py-2.5">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white" style={{ background: ZONE_COLOR[key] }}>
              <Icon aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2.5} />
            </span>
            <div className="flex min-w-0 flex-col">
              <dt className="order-2 text-xs text-ink-2">{name}</dt>
              <dd className="num order-1 text-lg font-medium">{share[key].toFixed(2)}%</dd>
              <dd className="num order-3 text-[11px] text-ink-3">{count[key].toLocaleString('en-US')} comments</dd>
            </div>
          </div>
        ))}
      </dl>
    </div>
  )
}

function Quality({ title, value, meaning }: { title: string; value: string; meaning: string }) {
  return (
    <Panel bodyClassName="px-4 py-4 sm:px-5">
      <div className="num text-3xl font-medium tracking-tight">{value}</div>
      <div className="mt-1 text-sm font-medium">{title}</div>
      <p className="mt-1 text-xs text-ink-3">{meaning}</p>
    </Panel>
  )
}
