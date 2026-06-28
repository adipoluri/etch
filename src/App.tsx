import Viewer from './components/Viewer.tsx'
import ImageInput from './components/ImageInput.tsx'
import LockButton from './components/LockButton.tsx'
import Toast from './components/Toast.tsx'
import { useImageDropPaste } from './hooks/useImageDropPaste.ts'
import { useIOSGestureGuard } from './hooks/useIOSGestureGuard.ts'
import { useLockFeedback } from './hooks/useLockFeedback.ts'
import { useAutoHideControls } from './hooks/useAutoHideControls.ts'
import { useEtchStore } from './store/useEtchStore.ts'
import './App.css'

export default function App() {
  useIOSGestureGuard()
  useImageDropPaste()
  useLockFeedback()
  useAutoHideControls()

  const image = useEtchStore((s) => s.image)
  const locked = useEtchStore((s) => s.locked)
  const controlsVisible = useEtchStore((s) => s.ui.controlsVisible)
  const resetView = useEtchStore((s) => s.resetView)

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
          <LockButton />
          {!locked && (
            <div className="controls">
              <ImageInput className="btn">Image</ImageInput>
              <button className="btn" onClick={resetView}>
                Fit
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
