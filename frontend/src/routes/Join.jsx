import { useState, useEffect } from 'react'
import QRCode from 'qrcode'
import AppHeader from '../AppHeader' // se non hai AppHeader, togli questa riga e il suo uso

export default function Join() {
  const [creating, setCreating] = useState(false)
  const [result, setResult] = useState(null)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const backend = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'

  async function createMeeting() {
    try {
      setCreating(true)
      const res = await fetch(`${backend}/api/meetings`, { method: 'POST' })
      if (!res.ok) throw new Error('Errore creazione meeting')
      const data = await res.json()
      setResult(data)
    } catch (e) {
      alert(e.message || 'Errore')
    } finally {
      setCreating(false)
    }
  }

  // Genera QR quando abbiamo l'ID
  useEffect(() => {
    if (!result?.id) return
    const participantUrl = `${window.location.origin}/p/${result.id}`
    QRCode.toDataURL(participantUrl, { margin: 1, width: 300 })
      .then(setQrDataUrl)
      .catch(()=>setQrDataUrl(''))
  }, [result?.id])

  const copy = (text) => navigator.clipboard?.writeText(text)

  return (
    <div className="min-h-screen">
      { /* Se non usi AppHeader, rimuovi e metti un header semplice */ }
      <AppHeader meetingId={result?.id} />

      <main className="container-app py-10 space-y-6">
        {!result ? (
          <section className="section space-y-4">
            <h2 className="h2">Crea o unisciti ad un meeting</h2>
            <div className="flex flex-wrap gap-3">
              <button className="btn-primary" onClick={createMeeting} disabled={creating}>
                {creating ? 'Creazione…' : 'Crea nuovo meeting (Moderatore)'}
              </button>
            </div>
            <p className="text-sm text-slate-600">
              Dopo la creazione vedrai <b>ID</b> e <b>PIN</b>, più il QR per invitare i partecipanti.
            </p>
          </section>
        ) : (
          <section className="section space-y-5">
            <h2 className="h2">Meeting creato</h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <div className="label">ID</div>
                <div className="flex items-center gap-2">
                  <code className="pill">{result.id}</code>
                  <button className="btn-neutral" onClick={() => copy(result.id)}>Copia</button>
                </div>
              </div>
              <div className="space-y-1">
                <div className="label">PIN Moderatore</div>
                <div className="flex items-center gap-2">
                  <code className="pill">{result.pin}</code>
                  <button className="btn-neutral" onClick={() => copy(result.pin)}>Copia</button>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <a className="btn-primary text-center" href={`/moderator/${result.id}`} target="_blank" rel="noreferrer">
                Apri Moderatore
              </a>
              <a className="btn-neutral text-center" href={`/p/${result.id}`} target="_blank" rel="noreferrer">
                Apri Partecipante
              </a>
              <a className="btn-neutral text-center" href={`/public/${result.id}`} target="_blank" rel="noreferrer">
                Schermo Pubblico
              </a>
            </div>

            {/* QR per i partecipanti */}
            <div className="grid sm:grid-cols-2 gap-6 items-center">
              <div>
                <div className="label mb-1">QR Partecipanti</div>
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="QR per partecipanti" className="rounded-xl border border-slate-200" />
                ) : (
                  <div className="text-sm text-slate-500">Generazione QR…</div>
                )}
              </div>
              <div className="text-sm text-slate-600">
                I partecipanti possono scansionare il QR per aprire <code className="pill">/p/{result.id}</code>.
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
