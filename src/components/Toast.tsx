import { useEffect } from 'react'
import { useEtchStore } from '../store/useEtchStore.ts'
import './Toast.css'

const DISMISS_MS = 6000

/** Transient message banner for errors/hints, auto-dismissing. */
export default function Toast() {
  const notice = useEtchStore((s) => s.notice)
  const setNotice = useEtchStore((s) => s.setNotice)

  useEffect(() => {
    if (!notice) return
    const id = setTimeout(() => setNotice(null), DISMISS_MS)
    return () => clearTimeout(id)
  }, [notice, setNotice])

  if (!notice) return null

  return (
    <div className="toast" role="alert" onClick={() => setNotice(null)}>
      {notice}
    </div>
  )
}
