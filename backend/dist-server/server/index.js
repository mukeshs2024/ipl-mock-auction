"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const cors_1 = __importDefault(require("cors"));
const socket_io_1 = require("socket.io");
const uuid_1 = require("uuid");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const room_actor_1 = require("./room-actor");
const db_1 = require("./db");
const csv_parser_1 = require("../lib/csv-parser");
const PORT = parseInt(process.env.SERVER_PORT || "3001", 10);
const UPLOADS_DIR = path_1.default.join(process.cwd(), "data", "uploads");
if (!fs_1.default.existsSync(UPLOADS_DIR)) {
    fs_1.default.mkdirSync(UPLOADS_DIR, { recursive: true });
}
// ============================================================
// Express + Socket.io setup
// ============================================================
const app = (0, express_1.default)();
const httpServer = http_1.default.createServer(app);
app.use((0, cors_1.default)({ origin: "*", credentials: true }));
app.use(express_1.default.json({ limit: "10mb" }));
const io = new socket_io_1.Server(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    pingTimeout: 60000,
    pingInterval: 25000,
});
// ============================================================
// Room registry: roomCode → RoomActor
// ============================================================
const rooms = new Map();
function generateRoomCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
}
// ============================================================
// Restore rooms from DB on startup
// ============================================================
async function restoreRooms() {
    try {
        const snapshots = await (0, db_1.loadAllRoomSnapshots)();
        let restored = 0;
        for (const snap of snapshots) {
            if (!rooms.has(snap.roomCode)) {
                const actor = new room_actor_1.RoomActor(io, snap.state, snap.hostToken);
                // If auction was live when server died, resume with fresh timer
                if (snap.state.status === "live") {
                    actor.state = {
                        ...actor.state,
                        timerEndsAt: Date.now() + snap.state.timerDurationSeconds * 1000,
                    };
                    // Restart the timer loop via a resume action
                    actor.startTimer();
                }
                rooms.set(snap.roomCode, actor);
                restored++;
            }
        }
        if (restored > 0) {
            console.log(`[Server] Restored ${restored} room(s) from DB`);
        }
    }
    catch (err) {
        console.error("[Server] Failed to restore rooms:", err);
    }
}
// ============================================================
// REST: create room
// ============================================================
app.post("/api/create-room", (req, res) => {
    const body = req.body;
    const csvPath = path_1.default.join(process.cwd(), "Data", "IPL_Auction_Player_List_Structured.csv");
    let csvText = "";
    try {
        csvText = fs_1.default.readFileSync(csvPath, "utf-8");
    }
    catch (err) {
        res.status(500).json({ error: "Failed to read default CSV file" });
        return;
    }
    const parseResult = (0, csv_parser_1.parsePlayersCSV)(csvText);
    if (parseResult.players.length === 0) {
        res.status(500).json({ error: "No valid players found in CSV" });
        return;
    }
    let roomCode = generateRoomCode();
    while (rooms.has(roomCode)) {
        roomCode = generateRoomCode();
    }
    const hostToken = body.hostToken || (0, uuid_1.v4)();
    const initialState = (0, room_actor_1.createInitialRoomState)(roomCode, body.hostSessionId, body.hostName, parseResult.players, parseResult.sets, body.pursePerTeam, body.timerDurationSeconds, body.reunsoldPhaseEnabled);
    const actor = new room_actor_1.RoomActor(io, initialState, hostToken);
    rooms.set(roomCode, actor);
    console.log(`[Server] Room created: ${roomCode} (${parseResult.players.length} players, ${parseResult.sets.length} sets)`);
    res.json({ roomCode, hostToken });
});
// REST: get room state
app.get("/api/room/:roomCode", (req, res) => {
    const actor = rooms.get(req.params.roomCode.toUpperCase());
    if (!actor) {
        res.status(404).json({ error: "Room not found" });
        return;
    }
    res.json(actor.state);
});
// REST: check room exists
app.get("/api/room/:roomCode/exists", (req, res) => {
    const exists = rooms.has(req.params.roomCode.toUpperCase());
    res.json({ exists });
});
// ============================================================
// Socket.io connection handler
// ============================================================
io.on("connection", (socket) => {
    console.log(`[Socket] Connected: ${socket.id}`);
    socket.on("join_room", ({ roomCode, displayName, sessionId }) => {
        const upper = roomCode.toUpperCase();
        const actor = rooms.get(upper);
        if (!actor) {
            socket.emit("room_not_found", { roomCode: upper });
            return;
        }
        socket.data.sessionId = sessionId;
        socket.data.roomCode = upper;
        socket.data.displayName = displayName;
        actor.handleConnect(socket, sessionId);
        const ownedTeam = Object.values(actor.state.teams).find((t) => t.ownerSessionId === sessionId);
        if (!ownedTeam) {
            actor.enqueue(async () => {
                actor.log("joined", `${displayName} joined the room`);
                actor.broadcast();
            });
        }
    });
    socket.on("claim_team", ({ roomCode, teamCode, sessionId }) => {
        const actor = rooms.get(roomCode.toUpperCase());
        if (!actor) {
            socket.emit("room_not_found", { roomCode });
            return;
        }
        actor.handleClaimTeam(socket, sessionId, socket.data.displayName || "Unknown", teamCode);
    });
    socket.on("release_team", ({ roomCode, teamCode, sessionId }) => {
        const actor = rooms.get(roomCode.toUpperCase());
        if (!actor)
            return;
        actor.enqueue(async () => {
            const team = actor.state.teams[teamCode];
            if (!team || team.ownerSessionId !== sessionId)
                return;
            actor.state = {
                ...actor.state,
                teams: {
                    ...actor.state.teams,
                    [teamCode]: { ...team, ownerSessionId: null, ownerName: null, isConnected: false },
                },
            };
            actor.log("team_released", `${team.ownerName} released ${team.name}`, teamCode);
            await actor.save();
        });
    });
    socket.on("bid", ({ roomCode, teamCode, sessionId, amount }) => {
        const actor = rooms.get(roomCode.toUpperCase());
        if (!actor) {
            socket.emit("room_not_found", { roomCode });
            return;
        }
        actor.handleBid(socket, sessionId, teamCode, amount);
    });
    socket.on("host_action", ({ roomCode, hostToken, action }) => {
        const actor = rooms.get(roomCode.toUpperCase());
        if (!actor)
            return;
        switch (action) {
            case "start_auction":
                actor.handleStartAuction(socket, hostToken);
                break;
            case "pause_auction":
                actor.handlePauseAuction(socket, hostToken);
                break;
            case "resume_auction":
                actor.handleResumeAuction(socket, hostToken);
                break;
            case "skip_player":
                actor.handleSkipPlayer(socket, hostToken);
                break;
            case "end_auction":
                actor.enqueue(async () => {
                    if (actor.hostToken !== hostToken)
                        return;
                    actor.state = { ...actor.state, status: "ended", timerEndsAt: null };
                    actor.stopTimer();
                    actor.log("host_action", "🏁 Auction ended by host");
                    await actor.save();
                    try {
                        await (0, db_1.saveRoomSummary)(actor.state.roomCode, actor.state);
                    }
                    catch { }
                });
                break;
        }
    });
    socket.on("extend_timer", ({ roomCode, hostToken, extraSeconds }) => {
        const actor = rooms.get(roomCode.toUpperCase());
        if (!actor)
            return;
        actor.handleExtendTimer(socket, hostToken, extraSeconds);
    });
    socket.on("set_timer_duration", ({ roomCode, hostToken, timerDurationSeconds }) => {
        const actor = rooms.get(roomCode.toUpperCase());
        if (!actor)
            return;
        actor.handleSetTimerDuration(socket, hostToken, timerDurationSeconds);
    });
    socket.on("kick_user", ({ roomCode, hostToken, sessionId }) => {
        const actor = rooms.get(roomCode.toUpperCase());
        if (!actor)
            return;
        actor.handleKickUser(socket, hostToken, sessionId);
    });
    socket.on("reassign_team", ({ roomCode, hostToken, teamCode, newSessionId, newOwnerName }) => {
        const actor = rooms.get(roomCode.toUpperCase());
        if (!actor)
            return;
        actor.handleReassignTeam(socket, hostToken, teamCode, newSessionId, newOwnerName);
    });
    socket.on("edit_purse", ({ roomCode, hostToken, teamCode, newPurse }) => {
        const actor = rooms.get(roomCode.toUpperCase());
        if (!actor)
            return;
        actor.handleEditPurse(socket, hostToken, teamCode, newPurse);
    });
    socket.on("chat", ({ roomCode, sessionId, message }) => {
        const actor = rooms.get(roomCode.toUpperCase());
        if (!actor)
            return;
        actor.enqueue(async () => {
            // Find team code to colorize if user owns a team
            const team = Object.values(actor.state.teams).find(t => t.ownerSessionId === sessionId);
            const teamCode = team?.code;
            const displayName = socket.data.displayName || "Unknown";
            // Use actor's private log method
            actor.log("chat", `${displayName}: ${message}`, teamCode);
            await actor.save();
        });
    });
    socket.on("disconnect", () => {
        const { sessionId, roomCode } = socket.data;
        if (roomCode && sessionId) {
            const actor = rooms.get(roomCode);
            if (actor)
                actor.handleDisconnect(sessionId);
        }
    });
});
// ============================================================
// Start server
// ============================================================
restoreRooms().then(() => {
    httpServer.listen(PORT, () => {
        console.log(`[Server] Socket.io server listening on port ${PORT}`);
    });
});
process.on("SIGTERM", () => {
    rooms.forEach((actor) => actor.destroy());
    httpServer.close(() => process.exit(0));
});
