// src/lib/socket.js
import { io } from 'socket.io-client'

const URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'

export const socket = io(URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 10,
  transports: ['websocket', 'polling'],
  withCredentials: false
})

socket.on('connect', () => console.log('[socket] connected', socket.id))
socket.on('connect_error', (err) => console.warn('[socket] connect_error', err?.message))
socket.on('disconnect', (r) => console.log('[socket] disconnect', r))

export function getSocket(){ return socket }
