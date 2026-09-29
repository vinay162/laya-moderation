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

export function LegendItem({ shape, color, children }: { shape: Shape; color: string; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2">
      <svg width="14" height="14" aria-hidden="true">
        <Marker shape={shape} x={7} y={7} color={color} />
      </svg>
      {children}
    </span>
  )
}
