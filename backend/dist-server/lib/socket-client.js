"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSocket = getSocket;
exports.connectSocket = connectSocket;
exports.disconnectSocket = disconnectSocket;
const socket_io_client_1 = require("socket.io-client");
// ============================================================
// Singleton Socket.io client for the frontend.
// Uses the Next.js rewrite proxy so no direct port needed.
// ============================================================
let socket = null;
function getSocket() {
    if (!socket) {
        socket = (0, socket_io_client_1.io)("http://localhost:3001", {
            autoConnect: false,
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 10,
        });
    }
    return socket;
}
function connectSocket(sessionId, roomCode, displayName) {
    const s = getSocket();
    if (!s.connected) {
        s.connect();
    }
    s.emit("join_room", { roomCode, sessionId, displayName });
    return s;
}
function disconnectSocket() {
    socket?.disconnect();
}
