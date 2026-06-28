import Slider from './Slider.tsx'
import { useEtchStore } from '../store/useEtchStore.ts'
import type { FilterMode, LineArtAlgo } from '../store/useEtchStore.ts'
import './FilterPanel.css'

const MODES: { key: FilterMode; label: string }[] = [
  { key: 'none', label: 'Original' },
  { key: 'lineart', label: 'Line Art' },
  { key: 'posterize', label: 'Posterize' },
  { key: 'threshold', label: 'Threshold' },
  { key: 'adaptive', label: 'Adaptive' },
]

export default function FilterPanel({ onClose }: { onClose: () => void }) {
  const filter = useEtchStore((s) => s.filter)
  const setFilter = useEtchStore((s) => s.setFilter)
  const setInteracting = useEtchStore((s) => s.setInteracting)

  const setMode = (mode: FilterMode) => setFilter({ mode })
  const setAlgo = (algo: LineArtAlgo) =>
    setFilter({ lineart: { ...filter.lineart, algo } })

  return (
    <div className="panel">
      <div className="panel__header">
        <span className="panel__title">Trace filter</span>
        <button className="panel__close" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </div>

      <div className="panel__tabs">
        {MODES.map(({ key, label }) => (
          <button
            key={key}
            className={`panel__tab${filter.mode === key ? ' panel__tab--on' : ''}`}
            onClick={() => setMode(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="panel__body">
        {filter.mode === 'lineart' && (
          <>
            <div className="panel__seg">
              {(['xdog', 'sobel'] as LineArtAlgo[]).map((a) => (
                <button
                  key={a}
                  className={`panel__segbtn${filter.lineart.algo === a ? ' panel__segbtn--on' : ''}`}
                  onClick={() => setAlgo(a)}
                >
                  {a === 'xdog' ? 'XDoG' : 'Sobel'}
                </button>
              ))}
            </div>
            <Slider
              label="Detail"
              min={0}
              max={1}
              step={0.01}
              value={filter.lineart.threshold}
              onInteract={setInteracting}
              onChange={(v) =>
                setFilter({ lineart: { ...filter.lineart, threshold: v } })
              }
            />
            <Slider
              label="Line weight"
              min={0.3}
              max={3}
              step={0.1}
              value={filter.lineart.thickness}
              onInteract={setInteracting}
              onChange={(v) =>
                setFilter({ lineart: { ...filter.lineart, thickness: v } })
              }
            />
            <label className="panel__check">
              <input
                type="checkbox"
                checked={filter.lineart.invert}
                onChange={(e) =>
                  setFilter({
                    lineart: { ...filter.lineart, invert: e.target.checked },
                  })
                }
              />
              Invert (light on dark)
            </label>
          </>
        )}

        {filter.mode === 'posterize' && (
          <Slider
            label="Value levels"
            min={2}
            max={5}
            step={1}
            value={filter.posterize.levels}
            onInteract={setInteracting}
            onChange={(v) =>
              setFilter({ posterize: { levels: v as 2 | 3 | 4 | 5 } })
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
            onInteract={setInteracting}
            onChange={(v) => setFilter({ threshold: { cutoff: v } })}
          />
        )}

        {filter.mode === 'adaptive' && (
          <>
            <Slider
              label="Detail size"
              min={3}
              max={60}
              step={1}
              value={filter.adaptive.blockSize}
              onInteract={setInteracting}
              onChange={(v) =>
                setFilter({ adaptive: { ...filter.adaptive, blockSize: v } })
              }
            />
            <Slider
              label="Strength"
              min={0}
              max={1}
              step={0.01}
              value={filter.adaptive.strength}
              onInteract={setInteracting}
              onChange={(v) =>
                setFilter({ adaptive: { ...filter.adaptive, strength: v } })
              }
            />
          </>
        )}

        {filter.mode !== 'none' && (
          <>
            <Slider
              label="Denoise"
              min={0}
              max={5}
              step={0.1}
              value={filter.preBlur}
              onInteract={setInteracting}
              onChange={(v) => setFilter({ preBlur: v })}
            />
            <Slider
              label="Blend (photo ↔ filter)"
              min={0}
              max={1}
              step={0.01}
              value={filter.blend}
              onInteract={setInteracting}
              onChange={(v) => setFilter({ blend: v })}
            />
          </>
        )}
      </div>
    </div>
  )
}
