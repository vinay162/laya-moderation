import type { ReliabilityBin } from '../lib/data'
import { LegendItem, Marker, type Shape } from './Marks'
import { Tip, useTip } from './Tooltip'
import { scale, useWidth } from './useWidth'

export interface ReliabilitySeries {
  name: string
  shape: Shape
  color: string
  dash?: string
  bins: ReliabilityBin[]
}

const PAD = { top: 12, right: 16, bottom: 44, left: 48 }
const TICKS = [0, 0.2, 0.4, 0.6, 0.8, 1]

/** Predicted probability (x) against how often the prediction was actually right (y). */
export function Reliability({ series }: { series: ReliabilitySeries[] }) {
  const [ref, width] = useWidth<HTMLDivElement>(420)
  const { tip, show, hide } = useTip()
  const size = Math.min(width, 460)
  const height = size - PAD.left + PAD.top + PAD.bottom - PAD.right
  const x = scale(0, 1, PAD.left, size - PAD.right)
  const y = scale(0, 1, height - PAD.bottom, PAD.top)

  return (
    <figure className="m-0 min-w-0">
      <figcaption className="mb-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-2">
        {series.map((s) => (
          <LegendItem key={s.name} shape={s.shape} color={s.color}>
            {s.name}
          </LegendItem>
        ))}
        <span className="inline-flex items-center gap-2">
          <svg className="block" width="18" height="10" aria-hidden="true">
            <line x1="1" y1="9" x2="17" y2="1" stroke="var(--line-strong)" strokeWidth="1.5" />
          </svg>
          Perfect calibration
        </span>
      </figcaption>
      <div ref={ref} data-chart className="relative min-w-0">
        <svg className="block"
          width={size}
          height={height}
          role="img"
          aria-label="Reliability chart: before the fix, high-confidence predictions sit far below the diagonal; after the fix they sit close to it"
        >
          {TICKS.map((t) => (
            <g key={t}>
              <line x1={x(t)} x2={x(t)} y1={PAD.top} y2={height - PAD.bottom} stroke="var(--line)" />
              <line x1={PAD.left} x2={size - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--line)" />
              <text x={x(t)} y={height - PAD.bottom + 16} textAnchor="middle" className="num fill-ink-3 text-[11px]">
                {Math.round(t * 100)}%
              </text>
              <text x={PAD.left - 8} y={y(t) + 4} textAnchor="end" className="num fill-ink-3 text-[11px]">
                {Math.round(t * 100)}%
              </text>
            </g>
          ))}
          <text x={(PAD.left + size - PAD.right) / 2} y={height - 6} textAnchor="middle" className="fill-ink-2 text-[12px]">
            How sure the model said it was
          </text>
          <text
            transform={`translate(12 ${(PAD.top + height - PAD.bottom) / 2}) rotate(-90)`}
            textAnchor="middle"
            className="fill-ink-2 text-[12px]"
          >
            How often it was right
          </text>
          <line x1={x(0)} y1={y(0)} x2={x(1)} y2={y(1)} stroke="var(--line-strong)" strokeWidth={1.5} />

          {series.map((s) => (
            <g key={s.name}>
              <path
                d={s.bins.map((b, i) => `${i ? 'L' : 'M'}${x(b.mean_pred)},${y(b.observed)}`).join('')}
                fill="none"
                stroke={s.color}
                strokeWidth={2}
                strokeDasharray={s.dash}
              />
              {s.bins.map((b) => (
                <g
                  key={b.bin}
                  onMouseMove={(e) =>
                    show(
                      e,
                      <div>
                        <div className="font-medium">{s.name}</div>
                        <div className="text-ink-2">Predictions in {b.bin.replace('-', ' to ')}</div>
                        <div className="num mt-1">
                          said {(b.mean_pred * 100).toFixed(1)}%, right {(b.observed * 100).toFixed(1)}%
                        </div>
                        <div className="num text-ink-3">{b.n.toLocaleString('en-US')} predictions</div>
                      </div>,
                    )
                  }
                  onMouseLeave={hide}
                >
                  <circle cx={x(b.mean_pred)} cy={y(b.observed)} r={12} fill="transparent" />
                  <Marker shape={s.shape} x={x(b.mean_pred)} y={y(b.observed)} r={4.5} color={s.color} />
                </g>
              ))}
            </g>
          ))}
        </svg>
        <Tip tip={tip} />
      </div>
    </figure>
  )
}
