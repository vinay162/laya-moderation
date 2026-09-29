import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { Calibration, Scoreboard } from './data'

const read = <T>(name: string): T =>
  JSON.parse(readFileSync(join(__dirname, '../../../data', `${name}.json`), 'utf8').replace(/\bNaN\b/g, 'null'))

// Published results. The site renders the data files, so they must agree with these.
const FULL_TEST = {
  'TF-IDF + LR': [0.9643, 0.9831, 0.977, 0.992, 0.9703, 0.985, 0.9786],
  'Detoxify original': [0.9739, 0.9915, 0.9824, 0.9965, 0.9805, 0.9928, 0.9863],
  'Laya merged (ours)': [0.9726, 0.9887, 0.9828, 0.9962, 0.9813, 0.9902, 0.9853],
} as const
const KEYS = ['toxic', 'severe_toxic', 'obscene', 'threat', 'insult', 'identity_hate', 'mean'] as const

describe('scoreboard.json', () => {
  const data = read<Scoreboard>('scoreboard')

  it('matches the published full test results', () => {
    for (const [model, values] of Object.entries(FULL_TEST)) {
      KEYS.forEach((k, i) => expect(data.full_test[model as keyof typeof FULL_TEST][k]).toBe(values[i]))
    }
  })

  it('matches the 10k sample journey', () => {
    expect(data.sample_10k.zero_shot.mean.toFixed(4)).toBe('0.9718')
    expect(data.sample_10k.fine_tuned.mean.toFixed(4)).toBe('0.9748')
    expect(data.sample_10k.merged.mean.toFixed(4)).toBe('0.9838')
    expect(data.sample_10k.fine_tuned.threat.toFixed(3)).toBe('0.950')
  })
})

describe('calibration.json', () => {
  const data = read<Calibration>('calibration')
  const row = (label: string) => data.table.find((r) => r.label === label)!

  it('matches the published calibration table', () => {
    expect(row('all (pooled)')['ECE before'].toFixed(3)).toBe('0.045')
    expect(row('all (pooled)')['ECE after'].toFixed(3)).toBe('0.013')
    const expected = {
      toxic: ['0.124', '0.053', 56, 88],
      obscene: ['0.056', '0.018', 66, 96],
      insult: ['0.035', '0.007', 79, 95],
    } as const
    for (const [label, [before, after, rightBefore, rightAfter]] of Object.entries(expected)) {
      expect(row(label)['ECE before'].toFixed(3)).toBe(before)
      expect(row(label)['ECE after'].toFixed(3)).toBe(after)
      expect(Math.round(row(label)['right when >=90% (before)']! * 100)).toBe(rightBefore)
      expect(Math.round(row(label)['right when >=90% (after)']! * 100)).toBe(rightAfter)
    }
  })

  it('has no 90% bucket after calibration for the rare labels', () => {
    for (const label of ['severe_toxic', 'threat', 'identity_hate']) {
      expect(row(label)['right when >=90% (after)']).toBeNull()
    }
  })
})
