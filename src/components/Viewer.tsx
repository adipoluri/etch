import { useEffect, useRef } from 'react'
import { useEtchStore } from '../store/useEtchStore.ts'
import { useGestures } from '../hooks/useGestures.ts'
import './Viewer.css'

export default function Viewer() {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // Latest measured container size (accurate, from ResizeObserver).
  const sizeRef = useRef({ w: 0, h: 0 })

  const image = useEtchStore((s) => s.image)
  const transform = useEtchStore((s) => s.transform)
  const locked = useEtchStore((s) => s.locked)
  const fitToScreen = useEtchStore((s) => s.fitToScreen)

  useGestures(containerRef)

  // Draw the source bitmap into the canvas (once per image). M3 swaps this 2D
  // draw for the WebGL filter pipeline; the transform layer stays the same.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !image) return
    canvas.width = image.width
    canvas.height = image.height
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(image.bitmap, 0, 0)
  }, [image])

  // Track the container's real size via ResizeObserver (contentRect is accurate
  // and fires *after* layout, fixing the "fit before measured" race). Re-fit on
  // genuine size changes (e.g. orientation) — but never while locked (tracing).
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const cr = entries[entries.length - 1].contentRect
      const changed = cr.width !== sizeRef.current.w || cr.height !== sizeRef.current.h
      sizeRef.current = { w: cr.width, h: cr.height }
      if (!changed) return
      const st = useEtchStore.getState()
      if (cr.width > 0 && cr.height > 0) st.setContainerSize(cr.width, cr.height)
      if (cr.width > 0 && cr.height > 0 && st.image && !st.locked) {
        st.fitToScreen(cr.width, cr.height)
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Fit each newly loaded image, using the already-measured size.
  useEffect(() => {
    if (!image) return
    const { w, h } = sizeRef.current
    if (w > 0 && h > 0) fitToScreen(w, h)
  }, [image, fitToScreen])

  const { x, y, scale, rotation } = transform

  return (
    <div
      ref={containerRef}
      className={`viewer${locked ? ' viewer--locked' : ''}`}
    >
      {image && (
        <canvas
          ref={canvasRef}
          className="viewer__canvas"
          style={{
            transform: `translate(${x}px, ${y}px) rotate(${rotation}deg) scale(${scale})`,
          }}
        />
      )}
    </div>
  )
}
