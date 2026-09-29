import { animate, useInView } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { usePrefs } from '../lib/prefs'

interface CountUpProps {
  value: number
  format: (v: number) => string
  duration?: number
}

/** Counts up to `value` the first time it scrolls into view. Shows the final value straight away for reduced motion. */
export function CountUp({ value, format, duration = 1.1 }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-10% 0px' })
  const { reducedMotion } = usePrefs()
  const [shown, setShown] = useState(reducedMotion ? value : 0)

  useEffect(() => {
    if (!inView || reducedMotion) {
      if (reducedMotion) setShown(value)
      return
    }
    const controls = animate(0, value, { duration, ease: [0.16, 1, 0.3, 1], onUpdate: setShown })
    return () => controls.stop()
  }, [inView, reducedMotion, value, duration])

  return (
    <span ref={ref}>
      {/* Screen readers get the final value, not every animation frame. */}
      <span aria-hidden="true">{format(shown)}</span>
      <span className="sr-only">{format(value)}</span>
    </span>
  )
}
