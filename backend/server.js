const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const { nanoid } = require('nanoid');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: ['http://localhost:5173'], methods: ['GET','POST'] }
});

// Stato in memoria
const meetings = new Map();
function ensureMeeting(id){
  if(!meetings.has(id)){
    meetings.set(id, {
      queue: [],
      speaking: null,
      locked: false,
      settings: { durationSec: 120 }, // durata massima impostata dal moderatore
      pin: String(Math.floor(1000 + Math.random()*9000))
    });
  }
  return meetings.get(id);
}
function stateForClient(m){
  return { queue: m.queue, speaking: m.speaking, locked: m.locked, settings: m.settings };
}

// --- API HTTP ---
app.post('/api/meetings', (req, res) => {
  const id = (req.body && req.body.id) || nanoid(8).toUpperCase();
  const m = ensureMeeting(id);
  const origin = req.headers.origin || 'http://localhost:5173';
  const base = origin.replace(/\/$/, '');
  return res.json({
    id,
    pin: m.pin,
    links: {
      moderator: `${base}/moderator/${id}`,
      participant: `${base}/p/${id}`,
      public: `${base}/public/${id}`
    }
  });
});

app.get('/api/meetings/:id/state', (req, res) => {
  const m = ensureMeeting(req.params.id);
  return res.json(stateForClient(m));
});

app.post('/api/meetings/:id/lock', (req, res) => {
  const m = ensureMeeting(req.params.id);
  m.locked = !!req.body.locked;
  io.to(req.params.id).emit('state_updated', stateForClient(m));
  return res.json({ ok: true, locked: m.locked });
});

// --- Socket.IO ---
io.on('connection', (socket) => {
  socket.data.meetingId = null;
  socket.data.role = 'attendee';
  socket.data.name = '';

  socket.on('join_meeting', ({ meetingId, name, role, pin }, ack) => {
    const m = ensureMeeting(meetingId);
    if (role === 'moderator') {
      if (pin !== m.pin) return ack && ack({ ok: false, error: 'PIN non valido' });
      socket.data.role = 'moderator';
    }
    socket.data.meetingId = meetingId;
    socket.data.name = (name || '').trim();
    socket.join(meetingId);
    return ack && ack({ ok: true, state: stateForClient(m), pin: role === 'moderator' ? m.pin : undefined });
  });

  // enqueue: accetta anche name e requestedDurationSec
  socket.on('enqueue', ({ topic, name, requestedDurationSec }, ack) => {
    const mid = socket.data.meetingId;
    if (!mid) return ack && ack({ ok: false, error: 'Non in meeting' });
    const m = ensureMeeting(mid);
    if (m.locked) return ack && ack({ ok: false, error: 'Coda bloccata' });

    if (typeof name === 'string' && name.trim()) {
      socket.data.name = name.trim();
    }

    const reqDur = Number(requestedDurationSec);
    const safeReqDur = Number.isFinite(reqDur) && reqDur > 0 ? reqDur : null;

    const id = nanoid(10);
    const item = {
      id,
      name: socket.data.name && socket.data.name.trim() ? socket.data.name.trim() : 'Anonimo',
      topic: (topic || '').trim(),
      requestedDurationSec: safeReqDur, // memorizziamo la richiesta
      status: 'waiting',
      priority: 0,
      createdAt: Date.now()
    };
    m.queue.push(item);
    io.to(mid).emit('queue_updated', m.queue);
    return ack && ack({ ok: true, id });
  });

  socket.on('dequeue', ({ id }, ack) => {
    const mid = socket.data.meetingId;
    if (!mid) return ack && ack({ ok: false });
    const m = ensureMeeting(mid);
    const before = m.queue.length;
    m.queue = m.queue.filter(q => q.id !== id);
    if (m.queue.length !== before) io.to(mid).emit('queue_updated', m.queue);
    return ack && ack({ ok: true });
  });

  // start_speaking: applica min(richiesta partecipante, max moderatore, valore passato dal bottone)
  socket.on('start_speaking', ({ id, durationSec }, ack) => {
    const mid = socket.data.meetingId;
    const m = ensureMeeting(mid);
    if (socket.data.role !== 'moderator') return ack && ack({ ok: false, error: 'Solo moderatore' });

    const idx = m.queue.findIndex(q => q.id === id);
    if (idx < 0) return ack && ack({ ok: false, error: 'Elemento non trovato' });

    const item = m.queue[idx];
    m.queue.splice(idx, 1);

    const maxByModerator = Number(m.settings.durationSec) || 120;
    const fromButton = Number(durationSec);
    const desired = Number(item.requestedDurationSec);

    const candidates = [maxByModerator];
    if (Number.isFinite(fromButton) && fromButton > 0) candidates.push(fromButton);
    if (Number.isFinite(desired) && desired > 0) candidates.push(desired);

    const finalDur = Math.min(...candidates);

    m.speaking = { ...item, status: 'speaking', startedAt: Date.now(), durationSec: finalDur };
    io.to(mid).emit('state_updated', stateForClient(m));
    return ack && ack({ ok: true });
  });

  socket.on('stop_speaking', (ack) => {
    const mid = socket.data.meetingId;
    const m = ensureMeeting(mid);
    if (socket.data.role !== 'moderator') return ack && ack({ ok: false, error: 'Solo moderatore' });
    m.speaking = null;
    io.to(mid).emit('state_updated', stateForClient(m));
    return ack && ack({ ok: true });
  });

  socket.on('promote', ({ id }, ack) => {
    const mid = socket.data.meetingId;
    const m = ensureMeeting(mid);
    if (socket.data.role !== 'moderator') return ack && ack({ ok: false });
    const it = m.queue.find(q => q.id === id);
    if (it) {
      it.priority += 1;
      m.queue.sort((a, b) => (b.priority - a.priority) || (a.createdAt - b.createdAt));
      io.to(mid).emit('queue_updated', m.queue);
    }
    return ack && ack({ ok: true });
  });

  socket.on('update_settings', ({ durationSec }, ack) => {
    const mid = socket.data.meetingId;
    const m = ensureMeeting(mid);
    if (socket.data.role !== 'moderator') return ack && ack({ ok: false });
    if (durationSec) m.settings.durationSec = Number(durationSec);
    io.to(mid).emit('state_updated', stateForClient(m));
    return ack && ack({ ok: true });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Backend on http://localhost:${PORT}`));
