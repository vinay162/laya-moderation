export interface RoutingResult {
  total: number
  approved: number
  human: number
  removed: number
  approvedPct: number
  humanPct: number
  removedPct: number
  /** Of the auto-removed comments, the share that really were toxic. Null when nothing is removed. */
  removalPrecisionPct: number | null
  /** Of the auto-approved comments, the share that were actually toxic. Null when nothing is approved. */
  missedInApprovedPct: number | null
}

/**
 * Routes each comment by its calibrated P(toxic):
 * below `approveBelow` is approved, at or above `removeAtOrAbove` is removed, anything else goes to a person.
 */
export function route(p: ArrayLike<number>, y: ArrayLike<number>, approveBelow: number, removeAtOrAbove: number): RoutingResult {
  let approved = 0
  let approvedToxic = 0
  let removed = 0
  let removedToxic = 0
  const total = p.length
  for (let i = 0; i < total; i++) {
    if (p[i] < approveBelow) {
      approved++
      approvedToxic += y[i]
    } else if (p[i] >= removeAtOrAbove) {
      removed++
      removedToxic += y[i]
    }
  }
  const human = total - approved - removed
  return {
    total,
    approved,
    human,
    removed,
    approvedPct: (100 * approved) / total,
    humanPct: (100 * human) / total,
    removedPct: (100 * removed) / total,
    removalPrecisionPct: removed ? (100 * removedToxic) / removed : null,
    missedInApprovedPct: approved ? (100 * approvedToxic) / approved : null,
  }
}

export interface Histogram {
  /** Counts per 0.01-wide bin of P(toxic), for comments that were clean and toxic by label. */
  clean: number[]
  toxic: number[]
}

export const BINS = 100

export function histogram(p: ArrayLike<number>, y: ArrayLike<number>): Histogram {
  const clean = new Array<number>(BINS).fill(0)
  const toxic = new Array<number>(BINS).fill(0)
  for (let i = 0; i < p.length; i++) {
    const b = Math.min(BINS - 1, Math.floor(p[i] * BINS))
    if (y[i]) toxic[b]++
    else clean[b]++
  }
  return { clean, toxic }
}
