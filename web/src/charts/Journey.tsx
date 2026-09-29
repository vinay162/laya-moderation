import type { Scoreboard } from '../lib/data'
import { labelColor } from '../lib/labels'
import { DrawPath, PopIn, useReveal } from './Marks'
import { Tip, useTip } from './Tooltip'
import { scale, useWidth } from './useWidth'

const STAGES = [
  { key: 'zero_shot', name: 'Zero-shot' },
  { key: 'fine_tuned', name: 'Fine-tuned' },
  { key: 'merged', name: 'Merged' },
] as const

const Y0 = 0.94
const Y1 = 1.0
const H = 260
const PAD = { top: 16, bottom: 30 }

interface JourneyProps {
  sample: Scoreboard['sample_10k']
  detoxify: number
  tfidf: number
}

/** Mean ROC-AUC on the 10k test sample across the three training stages, with threat drawn separately. */
export function Journey({ sample, detoxify, tfidf }: JourneyProps) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const { tip, show, hide } = useTip()
  const [svgRef, shown] = useReveal<SVGSVGElement>()
  const narrow = width < 480
  const left = 44
  const right = narrow ? 64 : 112
  const x = (i: number) => left + 24 + (i * (width - left - right - 48)) / 2
  const y = scale(Y0, Y1, H - PAD.bottom, PAD.top)

  const lines = [
    { name: 'Mean of 6', color: 'var(--m-laya)', dash: undefined, values: STAGES.map((s) => sample[s.key].mean) },
    { name: 'Threat', color: labelColor('threat'), dash: '5 4', values: STAGES.map((s) => sample[s.key].threat) },
  ]
  const refs = [
    { name: 'Detoxify', value: detoxify },
    { name: 'TF-IDF', value: tfidf },
  ]
  const path = (vals: number[]) => vals.map((v, i) => `${i ? 'L' : 'M'}${x(i)},${y(v)}`).join('')
  const dip = sample.fine_tuned.threat

  return (
    <div ref={ref} data-chart className="relative min-w-0">
      <svg ref={svgRef} className="block" width={width} height={H} role="img" aria-label="Mean ROC-AUC rises from zero-shot to fine-tuned to merged, while threat drops at the fine-tuned stage and recovers after merging">
        {[0.94, 0.96, 0.98, 1.0].map((t) => (
          <g key={t}>
            <line x1={left} x2={width - right} y1={y(t)} y2={y(t)} stroke="var(--line)" />
            <text x={left - 8} y={y(t) + 4} textAnchor="end" className="num fill-ink-3 text-[11px]">
              {t.toFixed(2)}
            </text>
          </g>
        ))}
        {refs.map((r) => (
          <g key={r.name}>
            <line x1={left} x2={width - right} y1={y(r.value)} y2={y(r.value)} stroke="var(--ink-3)" strokeDasharray="2 3" />
            <text x={width - right + 6} y={y(r.value) + 4} className="fill-ink-3 text-[11px]">
              {r.name}
              {!narrow && <tspan className="num"> {r.value.toFixed(4)}</tspan>}
            </text>
          </g>
        ))}
        {STAGES.map((s, i) => (
          <text key={s.key} x={x(i)} y={H - 8} textAnchor="middle" className="fill-ink-2 text-[12px]">
            {s.name}
          </text>
        ))}
        {lines.map((l, li) => (
          <g key={l.name}>
            <DrawPath show={shown} delay={li * 0.3} d={path(l.values)} stroke={l.color} strokeWidth={2} strokeDasharray={l.dash} />
            {l.values.map((v, i) => (
              <g key={i} onMouseMove={(e) => show(e, <TipBody stage={STAGES[i].name} name={l.name} value={v} />)} onMouseLeave={hide}>
                <circle cx={x(i)} cy={y(v)} r={14} fill="transparent" />
                <PopIn show={shown} delay={li * 0.3 + i * 0.35}>
                  <circle cx={x(i)} cy={y(v)} r={4.5} fill={l.color} stroke="var(--panel)" strokeWidth={2} />
                </PopIn>
              </g>
            ))}
          </g>
        ))}
        <PopIn show={shown} delay={0.9}>
          {lines[0].values.map((v, i) => (
            <text key={i} x={x(i)} y={y(v) - 10} textAnchor="middle" className="num fill-ink text-[11px]">
              {v.toFixed(4)}
            </text>
          ))}
        </PopIn>
        <PopIn show={shown} delay={1.2}>
          <text x={x(1) + 10} y={y(dip) + 4} className="fill-ink-2 text-[11px]">
            threat fell to <tspan className="num">{dip.toFixed(3)}</tspan>
          </text>
        </PopIn>
      </svg>
      <Tip tip={tip} />
    </div>
  )
}

function TipBody({ stage, name, value }: { stage: string; name: string; value: number }) {
  return (
    <div>
      <div className="font-medium">{stage}</div>
      <div className="flex justify-between gap-4">
        <span className="text-ink-2">{name}</span>
        <span className="num">{value.toFixed(4)}</span>
      </div>
    </div>
  )
}
