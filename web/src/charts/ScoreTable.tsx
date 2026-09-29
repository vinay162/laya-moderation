import { useState } from 'react'
import type { AucRow } from '../lib/data'
import { LABEL_NAME, LABELS, labelColor, type Label } from '../lib/labels'
import { SlideMarker, useReveal, type Shape } from './Marks'
import { scale, useWidth } from './useWidth'

export interface ModelSeries {
  name: string
  short: string
  shape: Shape
  color: string
  row: AucRow
}

type RowKey = Label | 'mean'
const ROWS: RowKey[] = [...LABELS, 'mean']
const X0 = 0.96
const X1 = 1.0
const TICKS = [0.96, 0.97, 0.98, 0.99, 1.0]
const TIE = 0.001
const STRIP_H = 40
const PAD = 12

export function verdict(diff: number) {
  if (diff > 0) return 'Beats'
  if (Math.abs(diff) < TIE) return 'Ties'
  return 'Behind'
}

/**
 * The results table with a dot strip on each row. All strips share one 0.96 to 1.00 axis,
 * so reading down the last column works like a single chart.
 */
export function ScoreTable({ tfidf, detox, laya }: { tfidf: ModelSeries; detox: ModelSeries; laya: ModelSeries }) {
  const [stripRef, stripW] = useWidth<HTMLTableCellElement>(260)
  const [tableRef, shown] = useReveal<HTMLTableElement>()
  const [hover, setHover] = useState<RowKey | null>(null)
  const x = scale(X0, X1, PAD, Math.max(PAD + 1, stripW - PAD))
  const series = [tfidf, detox, laya]

  return (
    <table ref={tableRef} className="w-full border-collapse text-sm" onMouseLeave={() => setHover(null)}>
      <caption className="sr-only">ROC-AUC per label on the full test set, with the difference from Detoxify</caption>
      <thead>
        <tr className="text-left text-xs text-ink-3">
          <th scope="col" className="py-2 pr-2 pl-4 font-medium sm:pl-5">Label</th>
          <th scope="col" className="hidden px-2 py-2 text-right font-medium sm:table-cell">{tfidf.short}</th>
          <th scope="col" className="px-2 py-2 text-right font-medium">{detox.short}</th>
          <th scope="col" className="px-2 py-2 text-right font-semibold text-ink">{laya.short}</th>
          <th scope="col" className="py-2 pr-4 pl-2 text-right font-medium md:pr-2">vs Detoxify</th>
          <th scope="col" ref={stripRef} className="hidden w-[40%] py-2 pr-5 pl-2 font-medium md:table-cell">
            <span className="sr-only">Chart</span>
            <svg className="block" width={stripW} height={14} aria-hidden="true">
              {TICKS.map((t) => (
                <text key={t} x={x(t)} y={11} textAnchor="middle" className="num fill-ink-3 text-[10px]">
                  {t.toFixed(2)}
                </text>
              ))}
            </svg>
          </th>
        </tr>
      </thead>
      <tbody>
        {ROWS.map((r, i) => {
          const isMean = r === 'mean'
          const diff = laya.row[r] - detox.row[r]
          const v = verdict(diff)
          const good = !isMean && v !== 'Behind'
          const values = series.map((s) => s.row[r])
          const dim = hover !== null && hover !== r
          return (
            <tr
              key={r}
              onMouseEnter={() => setHover(r)}
              className={`border-t transition-opacity duration-200 ${isMean ? 'border-line-strong' : 'border-line'} ${
                dim ? 'opacity-45' : ''
              } ${hover === r ? 'bg-hover' : ''}`}
            >
              <th scope="row" className="py-2 pr-2 pl-4 text-left font-normal whitespace-nowrap sm:pl-5">
                <span className="inline-flex items-center gap-2">
                  {!isMean && <span aria-hidden="true" className="h-3 w-[3px] rounded-full" style={{ background: labelColor(r) }} />}
                  <span className={isMean ? 'font-semibold' : ''}>{isMean ? 'Mean' : LABEL_NAME[r]}</span>
                </span>
              </th>
              <td className="num hidden px-2 py-2 text-right text-ink-3 sm:table-cell">{tfidf.row[r].toFixed(4)}</td>
              <td className="num px-2 py-2 text-right text-ink-2">{detox.row[r].toFixed(4)}</td>
              <td className="num px-2 py-2 text-right font-medium text-ink">{laya.row[r].toFixed(4)}</td>
              <td className="py-2 pr-4 pl-2 text-right whitespace-nowrap md:pr-2">
                <span className={`num text-xs text-ink-2 ${isMean ? '' : 'hidden sm:inline'}`}>
                  {diff >= 0 ? '+' : '−'}
                  {Math.abs(diff).toFixed(4)}
                </span>
                {!isMean && (
                  <span
                    className={`ml-2 inline-block w-12 rounded-full px-1.5 py-px text-center text-[11px] ${
                      good ? 'bg-ink font-semibold text-panel' : 'text-ink-3'
                    }`}
                  >
                    {v}
                  </span>
                )}
              </td>
              <td className="hidden py-0 pr-5 pl-2 md:table-cell" aria-hidden="true">
                <svg className="block" width={stripW} height={STRIP_H}>
                  {TICKS.map((t) => (
                    <line key={t} x1={x(t)} x2={x(t)} y1={0} y2={STRIP_H} stroke="var(--line)" />
                  ))}
                  <line
                    x1={x(Math.min(...values))}
                    x2={x(Math.max(...values))}
                    y1={STRIP_H / 2}
                    y2={STRIP_H / 2}
                    stroke="var(--line-strong)"
                    strokeWidth={2}
                    style={{ opacity: shown ? 1 : 0, transition: 'opacity 400ms ease 700ms' }}
                  />
                  {good && (
                    <circle
                      cx={x(laya.row[r])}
                      cy={STRIP_H / 2}
                      r={11}
                      fill="var(--m-laya)"
                      style={{ opacity: shown ? 0.14 : 0, transition: 'opacity 500ms ease 1100ms' }}
                    />
                  )}
                  {series.map((s, j) => (
                    <SlideMarker
                      key={s.name}
                      show={shown}
                      fromX={x(X0)}
                      delay={0.15 + i * 0.05 + j * 0.08}
                      shape={s.shape}
                      x={x(s.row[r])}
                      y={STRIP_H / 2}
                      color={s.color}
                    />
                  ))}
                </svg>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
