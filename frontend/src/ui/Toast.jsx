import { useEffect, useState } from 'react'

export function useToast() {
  const [msg, setMsg] = useState(null)
  const [type, setType] = useState('info') // info | success | error

  const show = (text, t = 'info', ms = 1500) => {
    setMsg(text); setType(t)
    if (ms > 0) setTimeout(() => setMsg(null), ms)
  }
  const clear = () => setMsg(null)

  const Toast = () => !msg ? null : (
    <div
      aria-live="polite"
      className={`fixed bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl text-white shadow ${
        type === 'success' ? 'bg-emerald-600' :
        type === 'error'   ? 'bg-rose-600' : 'bg-slate-900'
      }`}
    >
      {msg}
    </div>
  )

  return { show, clear, Toast }
}
