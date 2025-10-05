// src/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider, Link } from 'react-router-dom'
import './index.css'

import Participant from './routes/Participant.jsx'
import Moderator from './routes/Moderator.jsx'
import PublicView from './routes/PublicView.jsx'
import Join from './routes/Join.jsx'

function Home() {
  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-slate-200">
        <div className="container-app py-6">
          <h1 className="h1">Coda Interventi</h1>
          <p className="text-slate-600">Gestisci prenotazioni di parola in conferenza</p>
        </div>
      </header>
      <main className="container-app py-10">
        <div className="section space-y-3">
          <p>Vai alla pagina di creazione o unione a un meeting.</p>
          <Link className="btn-primary inline-block" to="/join">Crea/Unisciti</Link>
        </div>
      </main>
    </div>
  )
}

const router = createBrowserRouter([
  { path: '/', element: <Home/> },
  { path: '/join', element: <Join/> },
  { path: '/p/:meetingId', element: <Participant/> },
  { path: '/moderator/:meetingId', element: <Moderator/> },
  { path: '/public/:meetingId', element: <PublicView/> },
])

ReactDOM.createRoot(document.getElementById('root')).render(<RouterProvider router={router} />)
