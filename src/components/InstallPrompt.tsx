import { useEffect, useState } from 'react'
import { isIOS, isIOSNonSafari, isStandalone } from '../lib/platform.ts'
import './InstallPrompt.css'

const DISMISS_KEY = 'etch:install-dismissed'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
}

/** Onboarding for getting Etch to fullscreen. On iOS only Safari's Add to Home
 *  Screen produces a chrome-free app, so we show manual steps there and steer
 *  non-Safari iOS users to Safari. On Android we use the native install prompt. */
export default function InstallPrompt() {
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(DISMISS_KEY) === '1',
  )
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  if (isStandalone() || dismissed) return null

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1')
    setDismissed(true)
  }

  let body: React.ReactNode = null
  if (isIOSNonSafari) {
    body = (
      <span>
        For fullscreen tracing, open this page in <b>Safari</b>, then <b>Add to
        Home Screen</b>.
      </span>
    )
  } else if (isIOS) {
    body = (
      <span>
        Install Etch — tap <b>Share</b>, then <b>Add to Home Screen</b>, for
        fullscreen tracing.
      </span>
    )
  } else if (deferred) {
    body = (
      <span className="install__android">
        Install Etch as an app.
        <button
          className="install__cta"
          onClick={async () => {
            await deferred.prompt()
            dismiss()
          }}
        >
          Install
        </button>
      </span>
    )
  } else {
    return null
  }

  return (
    <div className="install" role="status">
      {body}
      <button className="install__x" onClick={dismiss} aria-label="Dismiss">
        ✕
      </button>
    </div>
  )
}
