import { DrawPath, PopIn, useReveal } from './Marks'
import { scale, useWidth } from './useWidth'

// Validation mean ROC-AUC for each weight mix (published WiSE-FT selection results).
const MIX = [
  { a: 0, auc: 0.9817, label: 'original' },
  { a: 0.3, auc: 0.9891 },
  { a: 0.5, auc: 0.9901, chosen: true, label: 'chosen' },
  { a: 0.7, auc: 0.9899 },
  { a: 1, auc: 0.9839, label: 'fine-tuned' },
]
const BLEND = 0.9894

const H = 210
const PAD = { top: 22, right: 30, bottom: 40, left: 46 }
const Y0 = 0.98
const Y1 = 0.992

/** How the share of fine-tuned weights changed validation ROC-AUC. */
export function MixCurve() {
  const [ref, width] = useWidth<HTMLDivElement>(480)
  const [svgRef, shown] = useReveal<SVGSVGElement>()
  const x = scale(0, 1, PAD.left, width - PAD.right)
  const y = scale(Y0, Y1, H - PAD.bottom, PAD.top)
  const d = MIX.map((p, i) => `${i ? 'L' : 'M'}${x(p.a)},${y(p.auc)}`).join('')

  return (
    <div ref={ref} className="min-w-0">
      <svg
        ref={svgRef}
        className="block"
        width={width}
        height={H}
        role="img"
        aria-label="Validation ROC-AUC by share of fine-tuned weights: 0.9817 at 0, 0.9891 at 0.3, 0.9901 at 0.5, 0.9899 at 0.7 and 0.9839 at 1"
      >
        {[0.98, 0.984, 0.988, 0.992].map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--line)" />
            <text x={PAD.left - 8} y={y(t) + 4} textAnchor="end" className="num fill-ink-3 text-[10.5px]">
              {t.toFixed(3)}
            </text>
          </g>
        ))}
        <line x1={PAD.left} x2={width - PAD.right} y1={y(BLEND)} y2={y(BLEND)} stroke="var(--ink-3)" strokeDasharray="2 3" />
        <text x={PAD.left + 6} y={y(BLEND) - 6} className="fill-ink-3 text-[10.5px]">
          blending the two models&rsquo; outputs <tspan className="num">{BLEND}</tspan>
        </text>
        <DrawPath show={shown} d={d} stroke="var(--m-laya)" strokeWidth={2} />
        {MIX.map((p, i) => (
          <PopIn key={p.a} show={shown} delay={0.2 + i * 0.12}>
            <circle cx={x(p.a)} cy={y(p.auc)} r={p.chosen ? 6 : 4} fill={p.chosen ? 'var(--m-laya)' : 'var(--panel)'} stroke="var(--m-laya)" strokeWidth={2} />
            <text x={x(p.a)} y={y(p.auc) - 11} textAnchor="middle" className={`num text-[10.5px] ${p.chosen ? 'fill-ink font-semibold' : 'fill-ink-2'}`}>
              {p.auc.toFixed(4)}
            </text>
          </PopIn>
        ))}
        {MIX.map((p) => (
          <text key={p.a} x={x(p.a)} y={H - PAD.bottom + 16} textAnchor={p.a === 0 ? 'start' : p.a === 1 ? 'end' : 'middle'} className="num fill-ink-3 text-[10.5px]">
            {p.a}
            {p.label ? ` ${p.label}` : ''}
          </text>
        ))}
        <text x={(PAD.left + width - PAD.right) / 2} y={H - 6} textAnchor="middle" className="fill-ink-2 text-[11px]">
          Share of fine-tuned weights in the mix
        </text>
      </svg>
    </div>
  )
}
