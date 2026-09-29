import { m, useInView } from 'motion/react'
import { useRef, type ReactNode } from 'react'

/** Shape markers, so models are told apart by shape as well as colour. */
export type Shape = 'ring' | 'square' | 'dot'

export function Marker({ shape, x, y, r = 5, color }: { shape: Shape; x: number; y: number; r?: number; color: string }) {
  if (shape === 'square') {
    return <rect x={x - r} y={y - r} width={r * 2} height={r * 2} rx={1.5} fill={color} stroke="var(--panel)" strokeWidth={2} />
  }
  if (shape === 'ring') {
    return <circle cx={x} cy={y} r={r - 0.5} fill="var(--panel)" stroke={color} strokeWidth={2} />
  }
  return <circle cx={x} cy={y} r={r + 0.5} fill={color} stroke="var(--panel)" strokeWidth={2} />
}

/** A marker that slides in horizontally from `fromX` once `show` is true. */
export function SlideMarker({
  show,
  fromX,
  delay = 0,
  ...props
}: { show: boolean; fromX: number; delay?: number } & Parameters<typeof Marker>[0]) {
  return (
    <m.g
      initial={{ x: fromX - props.x, opacity: 0 }}
      animate={show ? { x: 0, opacity: 1 } : undefined}
      transition={{ type: 'spring', stiffness: 120, damping: 18, delay }}
    >
      <Marker {...props} />
    </m.g>
  )
}

/** A line or curve that draws itself once `show` is true. */
export function DrawPath({ show, delay = 0, duration = 1.1, ...props }: { show: boolean; delay?: number; duration?: number } & React.SVGProps<SVGPathElement>) {
  const { d, stroke, strokeWidth, strokeDasharray } = props
  return (
    <m.path
      d={d}
      fill="none"
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeDasharray={strokeDasharray}
      strokeLinecap="round"
      // pathLength drives the dash pattern, so dashed lines fade in instead of drawing.
      initial={strokeDasharray ? { opacity: 0 } : { pathLength: 0, opacity: 0 }}
      animate={show ? (strokeDasharray ? { opacity: 1 } : { pathLength: 1, opacity: 1 }) : undefined}
      transition={{ duration, ease: [0.65, 0, 0.35, 1], delay }}
    />
  )
}

/** Fades and scales a group in once `show` is true. */
export function PopIn({ show, delay = 0, children }: { show: boolean; delay?: number; children: ReactNode }) {
  return (
    <m.g
      initial={{ opacity: 0, scale: 0.4 }}
      animate={show ? { opacity: 1, scale: 1 } : undefined}
      transition={{ type: 'spring', stiffness: 260, damping: 20, delay }}
      style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
    >
      {children}
    </m.g>
  )
}

/** True once the element has been scrolled into view (never flips back). */
export function useReveal<T extends Element>() {
  const ref = useRef<T>(null)
  const inView = useInView(ref, { once: true, margin: '0px 0px -15% 0px' })
  return [ref, inView] as const
}

export function LegendItem({ shape, color, children }: { shape: Shape; color: string; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2">
      <svg width="14" height="14" aria-hidden="true">
        <Marker shape={shape} x={7} y={7} color={color} />
      </svg>
      {children}
    </span>
  )
}

export function LegendLine({ color, dash, children }: { color: string; dash?: string; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2">
      <svg width="20" height="10" aria-hidden="true">
        <line x1="1" y1="5" x2="19" y2="5" stroke={color} strokeWidth="2" strokeDasharray={dash} strokeLinecap="round" />
      </svg>
      {children}
    </span>
  )
}
