import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { RaceEntry, StreamLog } from './data'
import { decide, streamTotals, topLabel } from './stream'

const read = <T>(name: string): T => JSON.parse(readFileSync(join(__dirname, '../../../data', `${name}.json`), 'utf8'))

describe('stream_log.json', () => {
  const log = read<StreamLog>('stream_log')

  it('has 10,000 comments recorded at 20.0 per second', () => {
    expect(log.comments).toHaveLength(10000)
    expect(log.comments_per_sec.toFixed(1)).toBe('20.0')
    expect(log.questions_per_comment).toBe(6)
  })

  it('contains the golden examples', () => {
    const find = (t: string) => log.comments.find((c) => c.text === t)!.p
    expect(find('Thanks')).toEqual([0.001, 0.0, 0.001, 0.0, 0.002, 0.001])
    expect(find('Asshole')).toEqual([0.891, 0.033, 0.859, 0.001, 0.28, 0.003])
  })

  it('keeps counters consistent', () => {
    const totals = streamTotals(log.comments)
    const n = log.comments.length
    const routed = totals.routed.approve[n] + totals.routed.human[n] + totals.routed.remove[n]
    expect(routed).toBe(n)
    expect(totals.flagged.toxic[n]).toBe(log.comments.filter((c) => c.p[0] >= 0.5).length)
  })
})

describe('helpers', () => {
  it('picks the strongest label only when it reaches 0.5', () => {
    expect(topLabel([0.891, 0.033, 0.859, 0.001, 0.28, 0.003])).toBe('toxic')
    expect(topLabel([0.4, 0, 0, 0, 0.45, 0])).toBeNull()
    expect(topLabel([0.6, 0, 0.7, 0, 0, 0])).toBe('obscene')
  })

  it('routes on the published thresholds', () => {
    expect(decide(0.0999)).toBe('approve')
    expect(decide(0.1)).toBe('human')
    expect(decide(0.9)).toBe('remove')
  })
})

describe('race_log.json', () => {
  const race = read<RaceEntry[]>('race_log')
  const median = (xs: number[]) => {
    const s = [...xs].sort((a, b) => a - b)
    const m = Math.floor(s.length / 2)
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
  }

  it('has 22 requests that Gemini answered', () => {
    expect(race).toHaveLength(100)
    expect(race.filter((r) => r.gemini.ok)).toHaveLength(22)
  })

  it('gives the published medians over the same 22 requests', () => {
    const ok = race.filter((r) => r.gemini.ok)
    expect(Math.round(median(ok.map((r) => r.laya.ms)))).toBe(76)
    expect(median(ok.map((r) => r.gemini.ms!))).toBe(1840)
  })
})
