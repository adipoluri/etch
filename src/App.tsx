import Viewer from './components/Viewer.tsx'
import ImageInput from './components/ImageInput.tsx'
import { useImageDropPaste } from './hooks/useImageDropPaste.ts'
import { useEtchStore } from './store/useEtchStore.ts'
import './App.css'

export default function App() {
  useImageDropPaste()

  const image = useEtchStore((s) => s.image)
  const locked = useEtchStore((s) => s.locked)
  const toggleLock = useEtchStore((s) => s.toggleLock)
  const fitToScreen = useEtchStore((s) => s.fitToScreen)

  const resetView = () => fitToScreen(window.innerWidth, window.innerHeight)

  return (
    <div className="app">
      <Viewer />

      {!image ? (
        <div className="empty">
          <h1 className="empty__title">Etch</h1>
          <p className="empty__sub">Load a reference image to start tracing.</p>
          <ImageInput className="btn btn--primary">Choose image</ImageInput>
          <p className="empty__hint">…or paste or drag an image in</p>
        </div>
      ) : (
        <div className="controls">
          <ImageInput className="btn">Image</ImageInput>
          <button className="btn" onClick={resetView}>
            Fit
          </button>
          <button className="btn" onClick={toggleLock}>
            {locked ? '🔒 Locked' : '🔓 Lock'}
          </button>
        </div>
      )}
    </div>
  )
}
