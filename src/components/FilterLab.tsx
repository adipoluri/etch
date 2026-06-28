import { useEffect, useRef, useState } from 'react'
import { FilterRenderer } from '../gl/FilterRenderer.ts'
import type { FilterState, LineArtAlgo } from '../store/useEtchStore.ts'
import { loadImageFromBlob } from '../lib/image.ts'
import './FilterLab.css'

const INITIAL: FilterState = {
  mode: 'lineart',
  lineart: { algo: 'xdog', threshold: 0.5, thickness: 1, invert: false },
  posterize: { levels: 3 },
  threshold: { cutoff: 0.5 },
  adaptive: { blockSize: 15, strength: 0.5 },
  preBlur: 0,
  blend: 1,
}

/** Builds a synthetic "photo" with gradients, shapes, fine detail and text so
 *  every filter has something meaningful to react to. */
function makeTestImage(): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = 800
  c.height = 600
  const x = c.getContext('2d')!
  const sky = x.createLinearGradient(0, 0, 0, 600)
  sky.addColorStop(0, '#bcd4ff')
  sky.addColorStop(1, '#fdfbf6')
  x.fillStyle = sky
  x.fillRect(0, 0, 800, 600)
  // shaded sphere (smooth gradient → good for posterize / value)
  const sphere = x.createRadialGradient(280, 230, 20, 320, 270, 180)
  sphere.addColorStop(0, '#ffe9a8')
  sphere.addColorStop(0.5, '#e8902f')
  sphere.addColorStop(1, '#6b3410')
  x.fillStyle = sphere
  x.beginPath()
  x.arc(320, 270, 150, 0, Math.PI * 2)
  x.fill()
  // hard-edged shapes (edges for sobel/xdog)
  x.fillStyle = '#2e7d32'
  x.fillRect(540, 120, 180, 180)
  x.strokeStyle = '#111'
  x.lineWidth = 6
  x.strokeRect(540, 120, 180, 180)
  // fine line grid (fine detail / denoise test)
  x.strokeStyle = 'rgba(0,0,0,0.55)'
  x.lineWidth = 1
  for (let i = 0; i <= 12; i++) {
    x.beginPath()
    x.moveTo(540 + i * 15, 360)
    x.lineTo(540 + i * 15, 520)
    x.stroke()
    x.beginPath()
    x.moveTo(540, 360 + i * 13)
    x.lineTo(720, 360 + i * 13)
    x.stroke()
  }
  // text (sharp contours)
  x.fillStyle = '#222'
  x.font = 'bold 110px -apple-system, sans-serif'
  x.fillText('Etch', 60, 520)
  return c
}

export default function FilterLab() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rendererRef = useRef<FilterRenderer | null>(null)
  const [filter, setFilter] = useState<FilterState>(INITIAL)
  const [error, setError] = useState<string | null>(null)

  // Init renderer + default test image.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    try {
      const r = new FilterRenderer(canvas)
      rendererRef.current = r
      r.setSource(makeTestImage())
      r.render(INITIAL)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
    return () => {
      rendererRef.current?.dispose()
      rendererRef.current = null
    }
  }, [])

  // Re-render on filter change.
  useEffect(() => {
    rendererRef.current?.render(filter)
  }, [filter])

  // Expose for preview-driven testing.
  useEffect(() => {
    ;(window as unknown as { lab?: unknown }).lab = {
      setFilter,
      get: () => filter,
      reload: () => rendererRef.current?.render(filter),
    }
  }, [filter])

  const patch = (p: Partial<FilterState>) => setFilter((f) => ({ ...f, ...p }))
  const setMode = (mode: FilterState['mode'], algo?: LineArtAlgo) =>
    setFilter((f) => ({
      ...f,
      mode,
      lineart: algo ? { ...f.lineart, algo } : f.lineart,
    }))

  const isLineart = filter.mode === 'lineart'
  const modeKey = isLineart ? `lineart:${filter.lineart.algo}` : filter.mode

  return (
    <div className="lab">
      <canvas ref={canvasRef} className="lab__canvas" />
      {error && <div className="lab__error">WebGL error: {error}</div>}

      <div className="lab__panel">
        <div className="lab__row lab__modes">
          {(
            [
              ['Original', () => setMode('none')],
              ['Sobel', () => setMode('lineart', 'sobel')],
              ['XDoG', () => setMode('lineart', 'xdog')],
              ['Posterize', () => setMode('posterize')],
              ['Threshold', () => setMode('threshold')],
              ['Adaptive', () => setMode('adaptive')],
            ] as const
          ).map(([label, fn]) => {
            const active =
              (label === 'Original' && filter.mode === 'none') ||
              (label === 'Sobel' && modeKey === 'lineart:sobel') ||
              (label === 'XDoG' && modeKey === 'lineart:xdog') ||
              (label === 'Posterize' && filter.mode === 'posterize') ||
              (label === 'Threshold' && filter.mode === 'threshold') ||
              (label === 'Adaptive' && filter.mode === 'adaptive')
            return (
              <button
                key={label}
                className={`lab__btn${active ? ' lab__btn--on' : ''}`}
                onClick={fn}
              >
                {label}
              </button>
            )
          })}
        </div>

        <Slider
          label="Pre-blur"
          min={0}
          max={5}
          step={0.1}
          value={filter.preBlur}
          onChange={(v) => patch({ preBlur: v })}
        />
        <Slider
          label="Blend"
          min={0}
          max={1}
          step={0.01}
          value={filter.blend}
          onChange={(v) => patch({ blend: v })}
        />

        {isLineart && (
          <>
            <Slider
              label="Threshold"
              min={0}
              max={1}
              step={0.01}
              value={filter.lineart.threshold}
              onChange={(v) =>
                patch({ lineart: { ...filter.lineart, threshold: v } })
              }
            />
            <Slider
              label="Thickness"
              min={0.3}
              max={3}
              step={0.1}
              value={filter.lineart.thickness}
              onChange={(v) =>
                patch({ lineart: { ...filter.lineart, thickness: v } })
              }
            />
            <label className="lab__check">
              <input
                type="checkbox"
                checked={filter.lineart.invert}
                onChange={(e) =>
                  patch({ lineart: { ...filter.lineart, invert: e.target.checked } })
                }
              />
              Invert
            </label>
          </>
        )}

        {filter.mode === 'posterize' && (
          <Slider
            label="Levels"
            min={2}
            max={5}
            step={1}
            value={filter.posterize.levels}
            onChange={(v) =>
              patch({ posterize: { levels: v as 2 | 3 | 4 | 5 } })
            }
          />
        )}

        {filter.mode === 'threshold' && (
          <Slider
            label="Cutoff"
            min={0}
            max={1}
            step={0.01}
            value={filter.threshold.cutoff}
            onChange={(v) => patch({ threshold: { cutoff: v } })}
          />
        )}

        {filter.mode === 'adaptive' && (
          <>
            <Slider
              label="Block size"
              min={3}
              max={60}
              step={1}
              value={filter.adaptive.blockSize}
              onChange={(v) =>
                patch({ adaptive: { ...filter.adaptive, blockSize: v } })
              }
            />
            <Slider
              label="Strength"
              min={0}
              max={1}
              step={0.01}
              value={filter.adaptive.strength}
              onChange={(v) =>
                patch({ adaptive: { ...filter.adaptive, strength: v } })
              }
            />
          </>
        )}

        <div className="lab__row">
          <label className="lab__btn">
            Load image
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file) return
                try {
                  const img = await loadImageFromBlob(file)
                  rendererRef.current?.setSource(img.bitmap)
                  rendererRef.current?.render(filter)
                } catch (err) {
                  setError(err instanceof Error ? err.message : String(err))
                }
              }}
            />
          </label>
        </div>
      </div>
    </div>
  )
}

function Slider({
  label,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string
  min: number
  max: number
  step: number
  value: number
  onChange: (v: number) => void
}) {
  return (
    <label className="lab__slider">
      <span>
        {label} <em>{value}</em>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </label>
  )
}
