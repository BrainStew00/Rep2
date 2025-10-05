import { io } from 'socket.io-client'
export function createSocket(){
  const url = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'
  return io(url, { autoConnect:false })
}