import Slider from './Slider.tsx'
import { useEtchStore } from '../store/useEtchStore.ts'
import './FilterPanel.css'
import './ToolsPanel.css'

export default function ToolsPanel({ onClose }: { onClose: () => void }) {
  const grid = useEtchStore((s) => s.grid)
  const flip = useEtchStore((s) => s.flip)
  const flipTimer = useEtchStore((s) => s.flipTimer)
  const setGrid = useEtchStore((s) => s.setGrid)
  const setFlip = useEtchStore((s) => s.setFlip)
  const setFlipTimer = useEtchStore((s) => s.setFlipTimer)
  const setCropping = useEtchStore((s) => s.setCropping)

  const startCrop = () => {
    setCropping(true)
    onClose()
  }

  return (
    <div className="panel">
      <div className="panel__header">
        <span className="panel__title">Tracing aids</span>
        <button className="panel__close" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </div>

      <div className="panel__body">
        {/* Grid */}
        <div className="tools__row">
          <span className="tools__name">Grid</span>
          <Toggle on={grid.on} onClick={() => setGrid({ on: !grid.on })} />
        </div>
        {grid.on && (
          <Slider
            label="Cells"
            min={2}
            max={8}
            step={1}
            value={grid.divisions}
            onChange={(v) => setGrid({ divisions: v })}
            format={(v) => `${v}×${v}`}
          />
        )}

        {/* Flip */}
        <div className="tools__row">
          <span className="tools__name">Flip</span>
          <div className="panel__seg tools__seg">
            <button
              className={`panel__segbtn${flip.h ? ' panel__segbtn--on' : ''}`}
              onClick={() => setFlip({ h: !flip.h })}
            >
              Horizontal
            </button>
            <button
              className={`panel__segbtn${flip.v ? ' panel__segbtn--on' : ''}`}
              onClick={() => setFlip({ v: !flip.v })}
            >
              Vertical
            </button>
          </div>
        </div>

        {/* Auto-flip */}
        <div className="tools__row">
          <span className="tools__name">Auto-flip</span>
          <Toggle
            on={flipTimer.on}
            onClick={() => setFlipTimer({ on: !flipTimer.on })}
          />
        </div>
        {flipTimer.on && (
          <Slider
            label="Every"
            min={5}
            max={60}
            step={5}
            value={flipTimer.intervalSec}
            onChange={(v) => setFlipTimer({ intervalSec: v })}
            format={(v) => `${v}s`}
          />
        )}

        {/* Focus */}
        <button className="tools__focus" onClick={startCrop}>
          Focus on a region…
        </button>
      </div>
    </div>
  )
}

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      className={`toggle${on ? ' toggle--on' : ''}`}
      onClick={onClick}
    >
      <span className="toggle__knob" />
    </button>
  )
}
