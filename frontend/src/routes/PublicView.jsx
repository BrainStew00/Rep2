import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getSocket } from '../lib/socket'

function Countdown({ speaking }){
  const [left, setLeft] = useState(0)
  useEffect(()=>{
    if(!speaking) return setLeft(0)
    const tick = () => {
      const started = speaking.startedAt
      const dur = speaking.durationSec * 1000
      setLeft(Math.max(0, Math.floor((started + dur - Date.now()) / 1000)))
    }
    tick(); const id = setInterval(tick, 250)
    return () => clearInterval(id)
  },[speaking])
  return <div className="text-7xl md:text-8xl font-extrabold tabular-nums">{left}s</div>
}

export default function PublicView(){
  const { meetingId } = useParams()
  const [queue, setQueue] = useState([])
  const [speaking, setSpeaking] = useState(null)
  const socketRef = useRef(null)

  useEffect(()=>{
    const s = getSocket(); socketRef.current = s
    if (!s.connected) s.connect()
    const handleState = (st)=>{ setQueue(st.queue); setSpeaking(st.speaking) }
    s.emit('join_meeting', { meetingId, name: 'DISPLAY' }, () => {})
    s.on('queue_updated', setQueue)
    s.on('state_updated', handleState)
    return () => {
      s.off('queue_updated', setQueue)
      s.off('state_updated', handleState)
    }
  },[meetingId])

  const total = speaking ? speaking.durationSec : 0
  const elapsed = speaking ? Math.max(0, Math.floor((Date.now() - speaking.startedAt)/1000)) : 0
  const pct = total ? Math.min(100, Math.floor((elapsed/total)*100)) : 0

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container-app py-10 space-y-10">
        <header className="flex items-end justify-between">
          <div>
            <div className="uppercase tracking-widest text-sm text-white/70">Parla ora</div>
            <div className="text-5xl md:text-6xl font-extrabold">{speaking ? speaking.name : '—'}</div>
            <div className="text-lg text-white/80">{speaking?.topic || ''}</div>
          </div>
          <Countdown speaking={speaking} />
        </header>

        <div className="w-full h-2 bg-white/15 rounded">
          <div className="h-2 bg-emerald-500 rounded" style={{ width: `${pct}%` }} />
        </div>

        <section>
          <div className="uppercase tracking-widest text-sm text-white/70 mb-3">A seguire</div>
          <ol className="grid md:grid-cols-3 gap-4">
            {queue.slice(0,3).map((it, i) => (
              <li key={it.id} className="rounded-2xl bg-white/10 p-5">
                <div className="text-xl font-semibold">{i+1}. {it.name}</div>
                <div className="opacity-80">{it.topic}</div>
              </li>
            ))}
            {queue.length === 0 && <li className="rounded-2xl bg-white/10 p-5">Nessuno in coda</li>}
          </ol>
        </section>
      </div>
    </div>
  )
}
