import type { CSSProperties } from 'react'
import './Slider.css'

interface Props {
  label: string
  min: number
  max: number
  step: number
  value: number
  onChange: (v: number) => void
  /** Called true on drag start, false on release — drives the perf guard. */
  onInteract?: (active: boolean) => void
  format?: (v: number) => string
}

export default function Slider({
  label,
  min,
  max,
  step,
  value,
  onChange,
  onInteract,
  format,
}: Props) {
  const pct = ((value - min) / (max - min)) * 100
  const display = format
    ? format(value)
    : Number.isInteger(value)
      ? String(value)
      : value.toFixed(2)

  return (
    <label className="slider">
      <span className="slider__label">
        <span>{label}</span>
        <span className="slider__value">{display}</span>
      </span>
      <input
        className="slider__input"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        style={{ '--pct': `${pct}%` } as CSSProperties}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        onPointerDown={() => onInteract?.(true)}
        onPointerUp={() => onInteract?.(false)}
        onPointerCancel={() => onInteract?.(false)}
        onLostPointerCapture={() => onInteract?.(false)}
      />
    </label>
  )
}
