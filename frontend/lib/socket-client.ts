import { io, Socket } from "socket.io-client";

// ============================================================
// Singleton Socket.io client for the frontend.
// Uses the Next.js rewrite proxy so no direct port needed.
// ============================================================

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001", {
      autoConnect: false,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });
  }
  return socket;
}

export function connectSocket(sessionId: string, roomCode: string, displayName: string): Socket {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
  }
  s.emit("join_room", { roomCode, sessionId, displayName });
  return s;
}

export function disconnectSocket(): void {
  socket?.disconnect();
}
