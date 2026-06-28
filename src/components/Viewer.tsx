import { useCallback, useEffect, useRef } from 'react'
import { useEtchStore } from '../store/useEtchStore.ts'
import { useGestures } from '../hooks/useGestures.ts'
import { FilterRenderer } from '../gl/FilterRenderer.ts'
import GridOverlay from './GridOverlay.tsx'
import CropOverlay from './CropOverlay.tsx'
import './Viewer.css'

const QUALITY_HIGH = 2048
const QUALITY_LOW = 1024

export default function Viewer() {
  const containerRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rendererRef = useRef<FilterRenderer | null>(null)
  const rafRef = useRef(0)
  const sizeRef = useRef({ w: 0, h: 0 })

  const image = useEtchStore((s) => s.image)
  const filter = useEtchStore((s) => s.filter)
  const transform = useEtchStore((s) => s.transform)
  const flip = useEtchStore((s) => s.flip)
  const locked = useEtchStore((s) => s.locked)
  const interacting = useEtchStore((s) => s.interacting)
  const fitToScreen = useEtchStore((s) => s.fitToScreen)

  useGestures(containerRef)

  const scheduleRender = useCallback(() => {
    if (rafRef.current) return
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0
      rendererRef.current?.render(useEtchStore.getState().filter)
    })
  }, [])

  // Create the WebGL renderer once.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    try {
      rendererRef.current = new FilterRenderer(canvas, QUALITY_HIGH)
    } catch {
      useEtchStore
        .getState()
        .setNotice(
          'WebGL2 is unavailable on this browser, so trace filters are disabled.',
        )
    }
    return () => {
      cancelAnimationFrame(rafRef.current)
      rendererRef.current?.dispose()
      rendererRef.current = null
    }
  }, [])

  // Upload each new image; size the stage to natural dims so the CSS transform
  // scales from there (the drawing buffer is resolution-capped).
  useEffect(() => {
    const stage = stageRef.current
    const renderer = rendererRef.current
    if (!stage || !renderer || !image) return
    stage.style.width = `${image.width}px`
    stage.style.height = `${image.height}px`
    renderer.setSource(image.bitmap)
    scheduleRender()
  }, [image, scheduleRender])

  // Re-render whenever the filter changes.
  useEffect(() => {
    if (image) scheduleRender()
  }, [filter, image, scheduleRender])

  // Performance guard: cheaper working resolution while dragging.
  useEffect(() => {
    const renderer = rendererRef.current
    if (!renderer || !image) return
    renderer.setMaxSize(interacting ? QUALITY_LOW : QUALITY_HIGH)
    scheduleRender()
  }, [interacting, image, scheduleRender])

  // Track container size; re-fit on genuine size changes (orientation), never
  // while locked (tracing).
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const cr = entries[entries.length - 1].contentRect
      const changed =
        cr.width !== sizeRef.current.w || cr.height !== sizeRef.current.h
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

  // Fit each newly loaded image.
  useEffect(() => {
    if (!image) return
    const { w, h } = sizeRef.current
    if (w > 0 && h > 0) fitToScreen(w, h)
  }, [image, fitToScreen])

  const { x, y, scale, rotation } = transform
  const sx = scale * (flip.h ? -1 : 1)
  const sy = scale * (flip.v ? -1 : 1)

  return (
    <div ref={containerRef} className={`viewer${locked ? ' viewer--locked' : ''}`}>
      <div
        ref={stageRef}
        className="viewer__stage"
        hidden={!image}
        style={{
          transform: `translate(${x}px, ${y}px) rotate(${rotation}deg) scale(${sx}, ${sy})`,
        }}
      >
        <canvas ref={canvasRef} className="viewer__canvas" />
        <GridOverlay />
      </div>
      <CropOverlay />
    </div>
  )
}
