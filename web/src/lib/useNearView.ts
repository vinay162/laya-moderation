import { useEffect, useRef, useState } from 'react'

/** True once the element comes within `margin` of the viewport. Used to lazy-load heavy data files. */
export function useNearView<T extends Element>(margin = '600px') {
  const ref = useRef<T>(null)
  const [near, setNear] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || near) return
    const io = new IntersectionObserver(([entry]) => entry.isIntersecting && setNear(true), { rootMargin: margin })
    io.observe(el)
    return () => io.disconnect()
  }, [margin, near])
  return [ref, near] as const
}
