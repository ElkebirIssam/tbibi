import { io } from 'socket.io-client';

let socket = null;

export function connectSocket(token) {
  if (socket?.connected) return socket;
  if (socket) { socket.disconnect(); socket = null; }
  const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  socket = io(API, {
    auth: { token },
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => console.log('Socket connected'));
  socket.on('connect_error', (err) => console.error('Socket error:', err.message));

  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
