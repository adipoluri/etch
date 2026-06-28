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
  return (
    <label className="slider">
      <span className="slider__label">
        {label}
        <em>{format ? format(value) : value}</em>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        onPointerDown={() => onInteract?.(true)}
        onPointerUp={() => onInteract?.(false)}
        onPointerCancel={() => onInteract?.(false)}
        onLostPointerCapture={() => onInteract?.(false)}
      />
    </label>
  )
}
