import { useEffect, useRef } from 'react'
import { useEtchStore } from '../store/useEtchStore.ts'
import { useGestures } from '../hooks/useGestures.ts'
import './Viewer.css'

export default function Viewer() {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

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

  // Fit to screen whenever a new image loads.
  useEffect(() => {
    const el = containerRef.current
    if (!el || !image) return
    fitToScreen(el.clientWidth, el.clientHeight)
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
