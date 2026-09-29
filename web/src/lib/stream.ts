import type { StreamComment } from './data'
import { LABELS, type Label } from './labels'

export const FLAG_AT = 0.5
export const APPROVE_BELOW = 0.1
export const REMOVE_AT = 0.9

/** The label with the highest calibrated probability, or null when every label is below 0.5. */
export function topLabel(p: readonly number[]): Label | null {
  let best = 0
  for (let i = 1; i < p.length; i++) if (p[i] > p[best]) best = i
  return p[best] >= FLAG_AT ? LABELS[best] : null
}

export type Decision = 'approve' | 'human' | 'remove'

export const decide = (pToxic: number): Decision =>
  pToxic < APPROVE_BELOW ? 'approve' : pToxic >= REMOVE_AT ? 'remove' : 'human'

export interface StreamTotals {
  /** flagged[label][n] = comments among the first n with P(label) >= 0.5 */
  flagged: Record<Label, Int32Array>
  /** routed[decision][n] = comments among the first n routed that way on P(toxic) */
  routed: Record<Decision, Int32Array>
}

/** Prefix sums so live counters are O(1) at any point in the replay. */
export function streamTotals(comments: StreamComment[]): StreamTotals {
  const n = comments.length
  const flagged = Object.fromEntries(LABELS.map((l) => [l, new Int32Array(n + 1)])) as Record<Label, Int32Array>
  const routed = {
    approve: new Int32Array(n + 1),
    human: new Int32Array(n + 1),
    remove: new Int32Array(n + 1),
  }
  comments.forEach((c, i) => {
    LABELS.forEach((l, j) => (flagged[l][i + 1] = flagged[l][i] + (c.p[j] >= FLAG_AT ? 1 : 0)))
    const d = decide(c.p[0])
    for (const k of ['approve', 'human', 'remove'] as const) routed[k][i + 1] = routed[k][i] + (k === d ? 1 : 0)
  })
  return { flagged, routed }
}
