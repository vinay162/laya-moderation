import { BINS, type Histogram } from '../lib/routing'
import { Tip, useTip } from './Tooltip'
import { scale, useWidth } from './useWidth'

export type Zone = 'approve' | 'human' | 'remove'
export const ZONE_COLOR: Record<Zone, string> = {
  approve: 'var(--ok)',
  human: 'var(--review)',
  remove: 'var(--remove)',
}

const ROW_H = 84
const GAP = 30
const PAD = { top: 44, bottom: 26, left: 40, right: 8 }
const TICKS = [0, 0.2, 0.4, 0.6, 0.8, 1]
const COUNT_TICKS = [10, 100, 1000, 10000]

interface Props {
  hist: Histogram
  approveBelow: number
  removeAtOrAbove: number
}

/**
 * Two histograms of calibrated P(toxic), one for comments labelled clean and one for comments labelled toxic.
 * Bars take the colour of the zone they fall in, so misrouted comments are easy to spot.
 */
export function RoutingHistogram({ hist, approveBelow, removeAtOrAbove }: Props) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const { tip, show, hide } = useTip()
  const x = scale(0, 1, PAD.left, width - PAD.right)
  const bw = (width - PAD.left - PAD.right) / BINS
  const a = Math.round(approveBelow * BINS)
  const r = Math.round(removeAtOrAbove * BINS)
  const zone = (bin: number): Zone => (bin < a ? 'approve' : bin >= r ? 'remove' : 'human')
  const height = PAD.top + ROW_H * 2 + GAP + PAD.bottom

  const rows = [
    { key: 'clean', name: 'Labelled clean by humans', counts: hist.clean, top: PAD.top },
    { key: 'toxic', name: 'Labelled toxic by humans', counts: hist.toxic, top: PAD.top + ROW_H + GAP },
  ] as const
  const max = Math.max(...hist.clean, ...hist.toxic)
  const h = (n: number) => (n ? (Math.log10(n + 1) / Math.log10(max + 1)) * (ROW_H - 4) : 0)

  return (
    <div ref={ref} data-chart className="relative min-w-0" onMouseLeave={hide}>
      <svg
        className="block"
        width={width}
        height={height}
        role="img"
        aria-label="Histograms of calibrated toxicity scores for clean and toxic comments, coloured by routing zone"
      >
        {rows.map((row) => (
          <g key={row.key}>
            <text x={PAD.left} y={row.top - 8} className="fill-ink-2 text-[11px]">
              {row.name}{' '}
              <tspan className="num fill-ink-3">
                ({row.counts.reduce((s, v) => s + v, 0).toLocaleString('en-US')})
              </tspan>
            </text>
            {COUNT_TICKS.filter((t) => t <= max).map((t) => (
              <g key={t}>
                <line x1={PAD.left} x2={width - PAD.right} y1={row.top + ROW_H - h(t)} y2={row.top + ROW_H - h(t)} stroke="var(--line)" />
                <text x={PAD.left - 6} y={row.top + ROW_H - h(t) + 3.5} textAnchor="end" className="num fill-ink-3 text-[10px]">
                  {t >= 1000 ? `${t / 1000}k` : t}
                </text>
              </g>
            ))}
            <line x1={PAD.left} x2={width - PAD.right} y1={row.top + ROW_H} y2={row.top + ROW_H} stroke="var(--line-strong)" />
            {row.counts.map((n, i) =>
              n ? (
                <rect
                  key={i}
                  x={x(i / BINS) + 0.5}
                  y={row.top + ROW_H - h(n)}
                  width={Math.max(1, bw - 1)}
                  height={h(n)}
                  rx={1}
                  fill={ZONE_COLOR[zone(i)]}
                  opacity={0.85}
                  style={{ transition: 'fill 200ms ease' }}
                />
              ) : null,
            )}
          </g>
        ))}

        {[
          {
            v: approveBelow,
            text: width < 560 ? `< ${approveBelow.toFixed(2)}` : `approve below ${approveBelow.toFixed(2)}`,
            anchor: 'start' as const,
          },
          {
            v: removeAtOrAbove,
            text: width < 560 ? `≥ ${removeAtOrAbove.toFixed(2)}` : `remove at ${removeAtOrAbove.toFixed(2)}+`,
            anchor: 'end' as const,
          },
        ].map((t) => (
          <g key={t.anchor} style={{ transform: `translateX(${x(t.v)}px)`, transition: 'transform 120ms ease-out' }}>
            <line x1={0} x2={0} y1={8} y2={height - PAD.bottom} stroke="var(--ink)" strokeWidth={1.5} strokeDasharray="3 3" />
            <text
              x={t.anchor === 'start' ? 5 : -5}
              y={14}
              textAnchor={t.anchor}
              className="num fill-ink text-[10.5px] font-medium"
            >
              {t.text}
            </text>
          </g>
        ))}

        {TICKS.map((t) => (
          <text key={t} x={x(t)} y={height - 8} textAnchor={t === 0 ? 'start' : t === 1 ? 'end' : 'middle'} className="num fill-ink-3 text-[11px]">
            {t.toFixed(1)}
          </text>
        ))}

        {/* Hover columns */}
        {Array.from({ length: BINS }, (_, i) => (
          <rect
            key={i}
            x={x(i / BINS)}
            y={PAD.top}
            width={bw}
            height={ROW_H * 2 + GAP}
            fill="transparent"
            onMouseMove={(e) =>
              show(
                e,
                <div>
                  <div className="num font-medium">
                    P(toxic) {(i / BINS).toFixed(2)} to {((i + 1) / BINS).toFixed(2)}
                  </div>
                  <div className="num text-ink-2">{hist.clean[i].toLocaleString('en-US')} clean</div>
                  <div className="num text-ink-2">{hist.toxic[i].toLocaleString('en-US')} toxic</div>
                  <div className="mt-1 text-ink-3">
                    {zone(i) === 'approve' ? 'Approved automatically' : zone(i) === 'remove' ? 'Removed automatically' : 'Sent to a person'}
                  </div>
                </div>,
              )
            }
          />
        ))}
      </svg>
      <Tip tip={tip} />
    </div>
  )
}
