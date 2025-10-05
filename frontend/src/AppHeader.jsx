import { Link } from 'react-router-dom'

export default function AppHeader({ meetingId }) {
  return (
    <header className="bg-white border-b border-slate-200">
      <div className="container-app py-4 flex items-center justify-between">
        {/* Logo / titolo */}
        <Link to="/" className="flex items-center gap-2">
          <div className="text-sky-600 font-bold text-lg">🎤 Coda Interventi</div>
        </Link>

        {/* Meeting ID visibile se presente */}
        {meetingId && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">Meeting</span>
            <code className="pill">{meetingId}</code>
          </div>
        )}
      </div>
    </header>
  )
}
