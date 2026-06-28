import { useState } from 'react'
import Viewer from './components/Viewer.tsx'
import ImageInput from './components/ImageInput.tsx'
import LockButton from './components/LockButton.tsx'
import Toast from './components/Toast.tsx'
import FilterPanel from './components/FilterPanel.tsx'
import ToolsPanel from './components/ToolsPanel.tsx'
import FilterLab from './components/FilterLab.tsx'
import { useImageDropPaste } from './hooks/useImageDropPaste.ts'
import { useIOSGestureGuard } from './hooks/useIOSGestureGuard.ts'
import { useLockFeedback } from './hooks/useLockFeedback.ts'
import { useFlipTimer } from './hooks/useFlipTimer.ts'
import { useAutoHideControls } from './hooks/useAutoHideControls.ts'
import { useEtchStore } from './store/useEtchStore.ts'
import './App.css'

export default function App() {
  // Dev harness for the filter engine (M3), reachable at #lab.
  if (import.meta.env.DEV && window.location.hash === '#lab') {
    return <FilterLab />
  }
  return <MainApp />
}

function MainApp() {
  useIOSGestureGuard()
  useImageDropPaste()
  useLockFeedback()
  useFlipTimer()
  useAutoHideControls()

  const image = useEtchStore((s) => s.image)
  const locked = useEtchStore((s) => s.locked)
  const cropping = useEtchStore((s) => s.cropping)
  const controlsVisible = useEtchStore((s) => s.ui.controlsVisible)
  const resetView = useEtchStore((s) => s.resetView)
  const [panel, setPanel] = useState<'filter' | 'tools' | null>(null)

  const showControls = !locked && !cropping && !panel

  return (
    <div className={`app${controlsVisible ? '' : ' app--idle'}`}>
      <Viewer />
      <Toast />

      {!image ? (
        <div className="empty">
          <h1 className="empty__title">Etch</h1>
          <p className="empty__sub">Load a reference image to start tracing.</p>
          <ImageInput className="btn btn--primary">Choose image</ImageInput>
          <p className="empty__hint">…or paste or drag an image in</p>
        </div>
      ) : (
        <>
          {!cropping && <LockButton />}
          {showControls && (
            <div className="controls">
              <ImageInput className="btn">Image</ImageInput>
              <button className="btn" onClick={resetView}>
                Fit
              </button>
              <button className="btn" onClick={() => setPanel('filter')}>
                Filter
              </button>
              <button className="btn" onClick={() => setPanel('tools')}>
                Tools
              </button>
            </div>
          )}
          {!locked && panel === 'filter' && (
            <FilterPanel onClose={() => setPanel(null)} />
          )}
          {!locked && panel === 'tools' && (
            <ToolsPanel onClose={() => setPanel(null)} />
          )}
        </>
      )}
    </div>
  )
}
