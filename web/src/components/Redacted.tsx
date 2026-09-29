import { Eye } from 'lucide-react'
import { useEffect, useState } from 'react'
import { usePrefs } from '../lib/prefs'

interface RedactedProps {
  text: string
  /** Offensive by human label or by model prediction. Only these get blurred. */
  offensive: boolean
  className?: string
}

/**
 * Comment text that is blurred by default when it may be offensive.
 * Each item can be revealed on its own; the global "raw text" switch reveals everything.
 */
export function Redacted({ text, offensive, className = '' }: RedactedProps) {
  const { showRaw } = usePrefs()
  const [revealed, setRevealed] = useState(false)
  useEffect(() => setRevealed(false), [text])

  if (!offensive || showRaw || revealed) {
    return <span className={`break-words ${className}`}>{text}</span>
  }
  return (
    <span className={`relative inline-block max-w-full ${className}`}>
      <span aria-hidden="true" className="pointer-events-none break-words blur-[6px] select-none">
        {text}
      </span>
      <button
        type="button"
        onClick={() => setRevealed(true)}
        className="absolute inset-0 flex items-center justify-center"
      >
        <span className="inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-panel/95 px-2.5 py-1 text-xs font-medium text-ink shadow-sm">
          <Eye aria-hidden="true" className="h-3.5 w-3.5" />
          Show offensive text
        </span>
      </button>
    </span>
  )
}

export const isOffensive = (y: number[], p: number[]) => y.some((v) => v === 1) || p.some((v) => v >= 0.5)
