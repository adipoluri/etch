import { useState } from 'react'
import { useEtchStore } from '../store/useEtchStore.ts'
import './LockButton.css'

/** Lock: single tap. Unlock: press-and-hold (a single tap must never unlock,
 *  or placement is lost mid-trace). The hold completes when the ring fills. */
export default function LockButton() {
  const locked = useEtchStore((s) => s.locked)
  const toggleLock = useEtchStore((s) => s.toggleLock)
  const setNotice = useEtchStore((s) => s.setNotice)
  const [holding, setHolding] = useState(false)

  if (!locked) {
    return (
      <button
        type="button"
        className="lock-btn"
        aria-label="Lock screen"
        onClick={toggleLock}
      >
        🔓
      </button>
    )
  }

  return (
    <button
      type="button"
      className={`lock-btn lock-btn--locked${holding ? ' lock-btn--holding' : ''}`}
      aria-label="Hold to unlock"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture?.(e.pointerId)
        setHolding(true)
      }}
      onPointerUp={() => {
        if (holding) setNotice('Hold to unlock')
        setHolding(false)
      }}
      onPointerCancel={() => setHolding(false)}
      onPointerLeave={() => setHolding(false)}
    >
      <span
        className="lock-btn__ring"
        onAnimationEnd={() => {
          setHolding(false)
          toggleLock()
        }}
      />
      🔒
    </button>
  )
}
