import { History } from 'lucide-react'

/** Marks every panel that replays recorded data rather than running live. */
export function ReplayBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-sunken px-2.5 py-1 text-xs font-medium text-ink-2">
      <History aria-hidden="true" className="h-3.5 w-3.5" />
      Replay of a real run on a Kaggle T4 GPU
    </span>
  )
}
