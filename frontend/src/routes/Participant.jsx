import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { createSocket } from '../lib/socket'
import { useToast } from '../ui/Toast'

export default function Participant() {
  const { meetingId } = useParams()
  const [name, setName] = useState(localStorage.getItem('qt_name') || '')
  const [topic, setTopic] = useState('')
  const [desiredSec, setDesiredSec] = useState(60)
  const [queue, setQueue] = useState([])
  const [speaking, setSpeaking] = useState(null)
  const [joined, setJoined] = useState(false)
  const [myItemId, setMyItemId] = useState(localStorage.getItem('qt_myItemId') || '')
  const [error, setError] = useState('')
  const { show, Toast } = useToast()

  const socketRef = useRef(null)

  useEffect(() => {
    const s = createSocket(); socketRef.current = s; s.connect()
    s.emit('join_meeting', { meetingId, name, role: 'attendee' }, (ack) => {
      if (!ack?.ok) { setError(ack?.error || 'Errore di join'); return }
      setJoined(true); setQueue(ack.state.queue); setSpeaking(ack.state.speaking)
      if (myItemId && !ack.state.queue.some(q => q.id === myItemId)) {
        setMyItemId(''); localStorage.removeItem('qt_myItemId')
      }
    })
    s.on('queue_updated', setQueue)
    s.on('state_updated', (st) => { setQueue(st.queue); setSpeaking(st.speaking) })
    return () => s.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetingId])

  useEffect(() => { localStorage.setItem('qt_name', name) }, [name])
  useEffect(() => { if (myItemId) localStorage.setItem('qt_myItemId', myItemId) }, [myItemId])

  const position = useMemo(() => {
    const idx = queue.findIndex(q => q.id === myItemId)
    return idx >= 0 ? idx + 1 : null
  }, [queue, myItemId])

  const enqueue = () => {
    setError('')
    socketRef.current.emit('enqueue', { topic, name, requestedDurationSec: desiredSec }, (ack) => {
      if (!ack?.ok) return setError(ack?.error || 'Errore')
      setMyItemId(ack.id); setTopic('')
      show('Prenotazione inviata ✅', 'success')
    })
  }
  const dequeue = () => {
    socketRef.current.emit('dequeue', { id: myItemId }, () => {
      setMyItemId(''); show('Prenotazione ritirata', 'info')
    })
  }

  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-slate-200">
        <div className="container-app py-4 flex items-end justify-between">
          <div>
            <div className="text-xs text-slate-500">Partecipante</div>
            <h1 className="h1">Meeting <span className="font-mono">{meetingId}</span></h1>
          </div>
          {position && <span className="pill">Posizione: {position}</span>}
        </div>
      </header>

      <main className="container-app py-8 grid gap-6 md:grid-cols-3">
        <section className="section md:col-span-2 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1">
              <div className="label">Il tuo nome</div>
              <input className="input" value={name} onChange={e=>setName(e.target.value)} />
            </label>
            <label className="space-y-1">
              <div className="label">Tema (opzionale)</div>
              <input className="input" value={topic} onChange={e=>setTopic(e.target.value)} />
            </label>
            <label className="space-y-1 sm:col-span-2">
              <div className="label">Durata desiderata (secondi)</div>
              <input
                type="number" min={10} max={3600}
                className="input w-44"
                value={desiredSec}
                onChange={e=>setDesiredSec(parseInt(e.target.value || '0',10))}
              />
              <div className="text-xs text-slate-500">La durata effettiva non supererà il limite del moderatore.</div>
            </label>
          </div>

          <div className="flex gap-3">
            {!myItemId ? (
              <button className="btn-primary" onClick={enqueue} disabled={!joined || !name}>
                Prenota intervento
              </button>
            ) : (
              <button className="btn-danger" onClick={dequeue}>
                Ritira prenotazione
              </button>
            )}
          </div>

          {error && <div className="text-rose-600 text-sm">{error}</div>}
        </section>

        <aside className="space-y-4">
          <div className="section">
            <div className="label mb-1">In corso</div>
            {speaking ? (
              <div>
                <div className="font-medium">{speaking.name}</div>
                <div className="text-sm text-slate-600">{speaking.topic}</div>
              </div>
            ) : <div className="text-sm text-slate-500">Nessuno sta parlando</div>}
          </div>

          <div className="section">
            <div className="label mb-1">In coda</div>
            <ol className="space-y-2">
              {queue.map((it, i) => (
                <li
                  key={it.id}
                  className={`p-3 rounded-xl border ${it.id===myItemId ? 'border-sky-400 bg-sky-50' : 'border-slate-200 bg-slate-50'}`}
                >
                  <div className="font-medium">{i+1}. {it.name}</div>
                  {it.topic && <div className="text-sm text-slate-600">{it.topic}</div>}
                </li>
              ))}
              {queue.length === 0 && <li className="text-sm text-slate-500">Nessuno in coda</li>}
            </ol>
          </div>
        </aside>
      </main>

      <Toast />
    </div>
  )
}
