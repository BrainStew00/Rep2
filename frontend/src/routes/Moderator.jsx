import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getSocket } from '../lib/socket'
import { useToast } from '../ui/Toast'

export default function Moderator() {
  const { meetingId } = useParams()
  const [pin, setPin] = useState('')
  const [queue, setQueue] = useState([])
  const [speaking, setSpeaking] = useState(null)
  const [durationSec, setDurationSec] = useState(120)
  const [joined, setJoined] = useState(false)
  const socketRef = useRef(null)
  const { show, Toast } = useToast()

  useEffect(() => { const s = createSocket(); socketRef.current = s; s.connect(); return () => s.disconnect() }, [])

  const joinAsMod = () => {
    socketRef.current.emit('join_meeting', { meetingId, name: 'MOD', role: 'moderator', pin }, (ack) => {
      if (!ack?.ok) return alert(ack?.error || 'PIN errato')
      setJoined(true); setQueue(ack.state.queue); setSpeaking(ack.state.speaking)
      socketRef.current.on('queue_updated', setQueue)
      socketRef.current.on('state_updated', (st)=>{ setQueue(st.queue); setSpeaking(st.speaking) })
      show('Sei entrato come moderatore', 'success')
    })
  }
  const start = (id) => socketRef.current.emit('start_speaking', { id, durationSec }, () => show('Intervento avviato', 'success'))
  const stop  = () => socketRef.current.emit('stop_speaking', () => show('Intervento fermato', 'info'))
  const lock  = async (locked) => {
    await fetch(`http://localhost:3000/api/meetings/${meetingId}/lock`, {
      method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ locked })
    })
    show(locked ? 'Coda bloccata' : 'Coda sbloccata', 'info')
  }

  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-slate-200">
        <div className="container-app py-4 flex items-end justify-between">
          <div>
            <div className="text-xs text-slate-500">Moderatore</div>
            <h1 className="h1">Meeting <span className="font-mono">{meetingId}</span></h1>
          </div>
          <a className="btn-neutral" href={`/public/${meetingId}`} target="_blank" rel="noreferrer">Schermo Pubblico</a>
        </div>
      </header>

      <main className="container-app py-8 space-y-6">
        {!joined ? (
          <div className="section flex items-end gap-3">
            <div className="flex-1">
              <div className="label mb-1">PIN moderatore</div>
              <input className="input" value={pin} onChange={e=>setPin(e.target.value)} />
            </div>
            <button className="btn-primary" onClick={joinAsMod}>Entra</button>
          </div>
        ) : (
          <>
            <div className="grid gap-6 md:grid-cols-3">
              <section className="section md:col-span-2">
                <div className="label mb-2">In corso</div>
                {speaking ? (
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium text-lg">{speaking.name}</div>
                      {speaking.topic && <div className="text-slate-600">{speaking.topic}</div>}
                      <div className="text-xs text-slate-500 mt-1">Durata: {speaking.durationSec}s</div>
                    </div>
                    <button className="btn-danger" onClick={stop}>Stop</button>
                  </div>
                ) : <div className="text-sm text-slate-500">Nessuno</div>}
              </section>

              <aside className="section space-y-3">
                <div className="label">Impostazioni</div>
                <label className="space-y-1">
                  <div className="label">Durata max (s)</div>
                  <input type="number" className="input w-32" value={durationSec}
                         onChange={e=>setDurationSec(parseInt(e.target.value||'120',10))}/>
                </label>
                <div className="flex gap-2">
                  <button className="btn-neutral" onClick={()=>lock(true)}>Blocca coda</button>
                  <button className="btn-neutral" onClick={()=>lock(false)}>Sblocca</button>
                </div>
              </aside>
            </div>

            <section className="section">
              <h2 className="h2 mb-3">Coda</h2>
              <ul className="space-y-2">
                {queue.map((it, i) => (
                  <li key={it.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                    <div>
                      <div className="font-medium">{i+1}. {it.name}</div>
                      {it.topic && <div className="text-sm text-slate-600">{it.topic}</div>}
                      {Number.isFinite(it.requestedDurationSec) && it.requestedDurationSec > 0 && (
                        <div className="text-xs text-slate-500 mt-1">Richiesta: {it.requestedDurationSec}s</div>
                      )}
                    </div>
                    <button className="btn-primary" onClick={()=>start(it.id)}>Avvia</button>
                  </li>
                ))}
                {queue.length === 0 && <li className="text-sm text-slate-500">Nessuno in coda</li>}
              </ul>
            </section>
          </>
        )}
      </main>

      <Toast />
    </div>
  )
}
