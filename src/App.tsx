import { useEtchStore } from './store/useEtchStore.ts'
import './App.css'

export default function App() {
  const locked = useEtchStore((s) => s.locked)
  const toggleLock = useEtchStore((s) => s.toggleLock)

  return (
    <div className="app">
      <main className="viewer">
        <div className="placeholder">
          <h1>Etch</h1>
          <p>Scaffold is running. Image viewer comes next (M1).</p>
          <button onClick={toggleLock}>
            {locked ? '🔒 Locked' : '🔓 Unlocked'}
          </button>
        </div>
      </main>
    </div>
  )
}
