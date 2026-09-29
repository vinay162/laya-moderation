import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { RoutingPoints, RoutingRow } from './data'
import { BINS, histogram, route } from './routing'

const read = <T>(name: string): T => JSON.parse(readFileSync(join(__dirname, '../../../data', `${name}.json`), 'utf8'))

describe('route', () => {
  const { p, y } = read<RoutingPoints>('routing_points')
  const table = read<RoutingRow[]>('routing_table')

  it('uses all 63,978 test comments', () => {
    expect(p).toHaveLength(63978)
    expect(y).toHaveLength(63978)
  })

  // routing_points.json stores P(toxic) rounded to 4 decimals, while the notebook built routing_table.json
  // from full precision. Up to 8 comments land exactly on an approve threshold after rounding, so the
  // approve/human shares can differ by at most 0.01 percentage points. Removals match exactly.
  it.each(table.map((row) => [row.approve_below, row.remove_above, row] as const))(
    'reproduces the notebook at approve < %s, remove >= %s',
    (approve, remove, row) => {
      const r = route(p, y, approve, remove)
      expect(Math.abs(r.approvedPct - row['auto_approved_%'])).toBeLessThan(0.01)
      expect(Math.abs(r.humanPct - row['to_human_%'])).toBeLessThan(0.01)
      expect(Math.abs(r.missedInApprovedPct! - row['toxic_missed_in_approved_%'])).toBeLessThan(0.01)
      expect(r.removedPct).toBeCloseTo(row['auto_removed_%'], 6)
      expect(r.removalPrecisionPct!).toBeCloseTo(row['removal_precision_%'], 6)
    },
  )

  it('matches the notebook exactly at the recommended 0.10 / 0.90 policy', () => {
    const row = table.find((t) => t.approve_below === 0.1 && t.remove_above === 0.9)!
    const r = route(p, y, 0.1, 0.9)
    expect(r.approvedPct).toBeCloseTo(row['auto_approved_%'], 6)
    expect(r.humanPct).toBeCloseTo(row['to_human_%'], 6)
    expect(r.missedInApprovedPct!).toBeCloseTo(row['toxic_missed_in_approved_%'], 6)
  })

  it('matches the published default policy', () => {
    const r = route(p, y, 0.1, 0.9)
    expect(r.approvedPct.toFixed(2)).toBe('77.79')
    expect(r.humanPct.toFixed(2)).toBe('18.14')
    expect(r.removedPct.toFixed(2)).toBe('4.07')
    expect(r.removalPrecisionPct!.toFixed(2)).toBe('88.26')
    expect(r.missedInApprovedPct!.toFixed(2)).toBe('0.34')
  })

  it('handles empty buckets', () => {
    const r = route([0.5], [1], 0, 0.99)
    expect(r.removalPrecisionPct).toBeNull()
    expect(r.missedInApprovedPct).toBeNull()
    expect(r.humanPct).toBe(100)
  })
})

describe('histogram', () => {
  it('puts every comment in exactly one bin', () => {
    const { p, y } = read<RoutingPoints>('routing_points')
    const h = histogram(p, y)
    expect(h.clean).toHaveLength(BINS)
    const sum = (a: number[]) => a.reduce((s, v) => s + v, 0)
    expect(sum(h.clean) + sum(h.toxic)).toBe(p.length)
    expect(sum(h.toxic)).toBe(y.reduce((s, v) => s + v, 0))
  })
})
