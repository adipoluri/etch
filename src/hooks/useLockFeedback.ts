import { useEffect, useRef } from 'react'
import { useEtchStore } from '../store/useEtchStore.ts'

let audioCtx: AudioContext | null = null

/** A short, soft click. iOS allows this because lock toggles are user gestures. */
function playTick(high: boolean) {
  try {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext
    audioCtx ??= new Ctor()
    if (audioCtx.state === 'suspended') void audioCtx.resume()
    const t = audioCtx.currentTime
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    osc.type = 'sine'
    osc.frequency.value = high ? 660 : 440
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(0.12, t + 0.005)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.08)
    osc.connect(gain).connect(audioCtx.destination)
    osc.start(t)
    osc.stop(t + 0.09)
  } catch {
    /* audio unavailable — visual cue still applies */
  }
}

/** Fire feedback whenever the lock state changes: audio tick + vibrate (Android
 *  only; iOS Safari has no Vibration API). Visual cue is handled in CSS. */
export function useLockFeedback() {
  const locked = useEtchStore((s) => s.locked)
  const first = useRef(true)

  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    playTick(locked)
    navigator.vibrate?.(locked ? 18 : [8, 40, 8])
  }, [locked])
}
