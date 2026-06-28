import { useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { useEtchStore } from '../store/useEtchStore.ts'
import './CropOverlay.css'

interface Rect {
  x0: number
  y0: number
  x1: number
  y1: number
}

const MIN_SIZE = 24

/** Focus mode: drag a rectangle, release to zoom that region to fill the screen.
 *  Math assumes no rotation (flip is handled); works best on an upright image. */
export default function CropOverlay() {
  const cropping = useEtchStore((s) => s.cropping)
  const setCropping = useEtchStore((s) => s.setCropping)
  const startRef = useRef<{ x: number; y: number } | null>(null)
  const [rect, setRect] = useState<Rect | null>(null)

  if (!cropping) return null

  const applyCrop = (r: Rect) => {
    const rw = Math.abs(r.x1 - r.x0)
    const rh = Math.abs(r.y1 - r.y0)
    if (rw < MIN_SIZE || rh < MIN_SIZE) return
    const { containerSize, transform, setTransform } = useEtchStore.getState()
    const { w: cw, h: ch } = containerSize
    const rcx = Math.min(r.x0, r.x1) + rw / 2
    const rcy = Math.min(r.y0, r.y1) + rh / 2
    const f = Math.min(cw / rw, ch / rh)
    setTransform({
      scale: transform.scale * f,
      x: -f * (rcx - cw / 2 - transform.x),
      y: -f * (rcy - ch / 2 - transform.y),
    })
  }

  const left = rect ? Math.min(rect.x0, rect.x1) : 0
  const top = rect ? Math.min(rect.y0, rect.y1) : 0
  const width = rect ? Math.abs(rect.x1 - rect.x0) : 0
  const height = rect ? Math.abs(rect.y1 - rect.y0) : 0

  const finish = (e: ReactPointerEvent) => {
    const start = startRef.current
    startRef.current = null
    if (start) {
      applyCrop({ x0: start.x, y0: start.y, x1: e.clientX, y1: e.clientY })
    }
    setRect(null)
    setCropping(false)
  }

  return (
    <div
      className="crop"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        startRef.current = { x: e.clientX, y: e.clientY }
        setRect({ x0: e.clientX, y0: e.clientY, x1: e.clientX, y1: e.clientY })
      }}
      onPointerMove={(e) => {
        if (startRef.current) setRect((r) => (r ? { ...r, x1: e.clientX, y1: e.clientY } : r))
      }}
      onPointerUp={finish}
      onPointerCancel={finish}
    >
      {rect && (
        <div
          className="crop__box"
          style={{ left, top, width, height }}
        />
      )}
      <div className="crop__hint">Drag a box to zoom in</div>
      <button
        className="crop__cancel"
        onPointerDown={(e) => {
          e.stopPropagation()
          setRect(null)
          setCropping(false)
        }}
      >
        Cancel
      </button>
    </div>
  )
}
