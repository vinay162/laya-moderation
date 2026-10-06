import { Eye } from 'lucide-react'
import { useEffect, useState } from 'react'
import { usePrefs } from '../lib/prefs'

interface RedactedProps {
  text: string
  /** Offensive by human label or by model prediction. Only these get blurred. */
  offensive: boolean
  /**
   * "block" (default) blurs inside a box of at least three lines, so the button looks the same whatever the text
   * length. "inline" is for a short quote inside a sentence.
   */
  variant?: 'block' | 'inline'
  className?: string
}

/**
 * Comment text that is blurred by default when it may be offensive.
 * Each item can be revealed on its own; the global "raw text" switch reveals everything.
 */
export function Redacted({ text, offensive, variant = 'block', className = '' }: RedactedProps) {
  const { showRaw } = usePrefs()
  const [revealed, setRevealed] = useState(false)
  useEffect(() => setRevealed(false), [text])

  if (!offensive || showRaw || revealed) {
    return <span className={`wrap-anywhere ${className}`}>{text}</span>
  }
  const box =
    variant === 'block'
      ? 'block min-h-[4.5rem] w-full rounded-md bg-sunken'
      : 'inline-block min-w-[10.5rem] rounded-md bg-sunken px-1 align-middle'
  return (
    <span className={`relative overflow-hidden ${box} ${className}`}>
      <span aria-hidden="true" className="pointer-events-none wrap-anywhere blur-[6px] select-none">
        {text}
      </span>
      <button
        type="button"
        onClick={() => setRevealed(true)}
        className="absolute inset-0 flex items-center justify-center"
      >
        <span className="inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-panel/95 px-2.5 py-1 text-xs font-medium whitespace-nowrap text-ink shadow-sm">
          <Eye aria-hidden="true" className="h-3.5 w-3.5" />
          Show offensive text
        </span>
      </button>
    </span>
  )
}

export const isOffensive = (y: number[], p: number[]) => y.some((v) => v === 1) || p.some((v) => v >= 0.5)
