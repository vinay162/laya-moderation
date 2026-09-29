import { useId, type CSSProperties } from 'react'

interface SliderProps {
  label: string
  hint: string
  value: number
  min: number
  max: number
  step?: number
  color: string
  onChange: (v: number) => void
}

/** A range input with its value in a mono readout. The filled track uses the zone colour. */
export function Slider({ label, hint, value, min, max, step = 0.01, color, onChange }: SliderProps) {
  const id = useId()
  const fill = ((value - min) / (max - min)) * 100
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        <output htmlFor={id} className="num rounded-md bg-sunken px-2 py-0.5 text-sm font-medium">
          {value.toFixed(2)}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-describedby={`${id}-hint`}
        onChange={(e) => onChange(Math.round(Number(e.target.value) * 100) / 100)}
        className="range mt-3 w-full"
        style={{ '--fill': `${fill}%`, '--thumb': color } as CSSProperties}
      />
      <div className="num mt-1 flex justify-between text-[11px] text-ink-3" aria-hidden="true">
        <span>{min.toFixed(2)}</span>
        <span>{max.toFixed(2)}</span>
      </div>
      <p id={`${id}-hint`} className="mt-1 text-xs text-ink-3">
        {hint}
      </p>
    </div>
  )
}
