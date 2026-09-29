import type { AucRow } from '../lib/data'
import { LABEL_NAME, LABELS, labelColor, type Label } from '../lib/labels'
import { LegendItem, Marker, type Shape } from './Marks'
import { Tip, useTip } from './Tooltip'
import { scale, useWidth } from './useWidth'

export interface DotSeries {
  name: string
  shape: Shape
  color: string
  row: AucRow
}

const ROW = 34
const TOP = 8
const AXIS = 28
const X0 = 0.96
const X1 = 1.0
const TICKS = [0.96, 0.97, 0.98, 0.99, 1.0]

export function AucDots({ series }: { series: DotSeries[] }) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const { tip, show, hide } = useTip()
  const rows: (Label | 'mean')[] = [...LABELS, 'mean']
  const left = width < 480 ? 96 : 120
  const right = 18
  const x = scale(X0, X1, left, width - right)
  const height = TOP + rows.length * ROW + AXIS

  return (
    <figure className="m-0 min-w-0">
      <figcaption className="mb-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-2">
        {series.map((s) => (
          <LegendItem key={s.name} shape={s.shape} color={s.color}>
            {s.name}
          </LegendItem>
        ))}
      </figcaption>
      <div ref={ref} data-chart className="relative min-w-0">
        <svg className="block" width={width} height={height} role="img" aria-label="ROC-AUC per label for each model, on a scale from 0.96 to 1.00">
          {TICKS.map((t) => (
            <g key={t}>
              <line x1={x(t)} x2={x(t)} y1={TOP} y2={height - AXIS} stroke="var(--line)" />
              <text x={x(t)} y={height - 8} textAnchor="middle" className="num fill-ink-3 text-[11px]">
                {t.toFixed(2)}
              </text>
            </g>
          ))}
          {rows.map((r, i) => {
            const cy = TOP + i * ROW + ROW / 2
            const values = series.map((s) => s.row[r])
            const isMean = r === 'mean'
            return (
              <g
                key={r}
                onMouseMove={(e) =>
                  show(
                    e,
                    <div>
                      <div className="mb-1 font-medium">{isMean ? 'Mean of 6 labels' : LABEL_NAME[r]}</div>
                      {series.map((s) => (
                        <div key={s.name} className="flex justify-between gap-4">
                          <span className="text-ink-2">{s.name}</span>
                          <span className="num">{s.row[r].toFixed(4)}</span>
                        </div>
                      ))}
                    </div>,
                  )
                }
                onMouseLeave={hide}
              >
                <rect x={0} y={cy - ROW / 2} width={width} height={ROW} fill="transparent" />
                {isMean && <line x1={0} x2={width} y1={cy - ROW / 2} y2={cy - ROW / 2} stroke="var(--line-strong)" />}
                {!isMean && <rect x={0} y={cy - 5} width={4} height={10} rx={2} fill={labelColor(r)} />}
                <text x={isMean ? 0 : 10} y={cy + 4} className={`fill-ink text-[13px] ${isMean ? 'font-semibold' : ''}`}>
                  {isMean ? 'Mean' : LABEL_NAME[r]}
                </text>
                <line
                  x1={x(Math.min(...values))}
                  x2={x(Math.max(...values))}
                  y1={cy}
                  y2={cy}
                  stroke="var(--line-strong)"
                  strokeWidth={2}
                />
                {series.map((s) => (
                  <Marker key={s.name} shape={s.shape} x={x(s.row[r])} y={cy} color={s.color} />
                ))}
              </g>
            )
          })}
        </svg>
        <Tip tip={tip} />
      </div>
    </figure>
  )
}
