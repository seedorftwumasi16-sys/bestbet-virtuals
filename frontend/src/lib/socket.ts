import { io, Socket } from 'socket.io-client';
import { getSocketUrl } from './api';

let socket: Socket | null = null;

/** Single shared Socket.io client for the whole app. */
export function getSharedSocket(): Socket {
  if (!socket) {
    socket = io(getSocketUrl(), {
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
}
