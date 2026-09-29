import { useCallback, useState, type ReactNode } from 'react'

export interface TipState {
  x: number
  y: number
  width: number
  content: ReactNode
}

/** Hover state for a chart. Coordinates are relative to the wrapper marked with data-chart. */
export function useTip() {
  const [tip, setTip] = useState<TipState | null>(null)
  const show = useCallback((e: { clientX: number; clientY: number; currentTarget: Element }, content: ReactNode) => {
    const box = (e.currentTarget.closest('[data-chart]') as HTMLElement).getBoundingClientRect()
    setTip({ x: e.clientX - box.left, y: e.clientY - box.top, width: box.width, content })
  }, [])
  const hide = useCallback(() => setTip(null), [])
  return { tip, show, hide }
}

const HALF = 96

export function Tip({ tip }: { tip: TipState | null }) {
  if (!tip) return null
  // Keep the box inside the chart on narrow screens.
  const left = Math.min(Math.max(tip.x, HALF), Math.max(HALF, tip.width - HALF))
  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute z-10 w-max max-w-[12rem] rounded-md border border-line-strong bg-panel px-3 py-2 text-xs shadow-lg"
      style={{ left, top: tip.y - 12, transform: 'translate(-50%, -100%)' }}
    >
      {tip.content}
    </div>
  )
}
