import { useEtchStore } from '../store/useEtchStore.ts'

/** N×N proportional grid drawn over the image (lives inside the transformed
 *  stage, so it pans/zooms/rotates with the reference). Uses non-scaling
 *  strokes so the lines stay a constant on-screen width at any zoom. */
export default function GridOverlay() {
  const grid = useEtchStore((s) => s.grid)
  if (!grid.on) return null

  const n = grid.divisions
  const lines = []
  for (let i = 1; i < n; i++) {
    lines.push(
      <line key={`v${i}`} x1={i} y1={0} x2={i} y2={n} />,
      <line key={`h${i}`} x1={0} y1={i} x2={n} y2={i} />,
    )
  }

  return (
    <svg
      className="viewer__grid"
      viewBox={`0 0 ${n} ${n}`}
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* border */}
      <rect x={0} y={0} width={n} height={n} className="viewer__grid-border" />
      <g className="viewer__grid-lines">{lines}</g>
    </svg>
  )
}
