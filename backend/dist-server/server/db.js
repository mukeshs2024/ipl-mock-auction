"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveRoomSnapshot = saveRoomSnapshot;
exports.loadRoomSnapshot = loadRoomSnapshot;
exports.loadAllRoomSnapshots = loadAllRoomSnapshots;
exports.saveRoomSummary = saveRoomSummary;
exports.loadRoomSummary = loadRoomSummary;
exports.getHostToken = getHostToken;
const sql_js_1 = __importDefault(require("sql.js"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const DB_DIR = path_1.default.join(process.cwd(), "data", "db");
const DB_PATH = path_1.default.join(DB_DIR, "auction.db");
// Ensure data/db directory exists
if (!fs_1.default.existsSync(DB_DIR)) {
    fs_1.default.mkdirSync(DB_DIR, { recursive: true });
}
let dbInstance = null;
let sqlJs = null;
async function getDb() {
    if (dbInstance)
        return dbInstance;
    if (!sqlJs) {
        sqlJs = await (0, sql_js_1.default)();
    }
    // Load existing DB file or create new
    if (fs_1.default.existsSync(DB_PATH)) {
        const fileBuffer = fs_1.default.readFileSync(DB_PATH);
        dbInstance = new sqlJs.Database(fileBuffer);
    }
    else {
        dbInstance = new sqlJs.Database();
    }
    initSchema(dbInstance);
    return dbInstance;
}
function persistDb(db) {
    const data = db.export();
    fs_1.default.writeFileSync(DB_PATH, Buffer.from(data));
}
function initSchema(db) {
    db.run(`
    CREATE TABLE IF NOT EXISTS rooms (
      room_code TEXT PRIMARY KEY,
      host_session_id TEXT NOT NULL,
      host_token TEXT NOT NULL,
      state_json TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS room_summaries (
      room_code TEXT PRIMARY KEY,
      summary_json TEXT NOT NULL,
      ended_at INTEGER NOT NULL
    );
  `);
}
// ============================================================
// Upsert full room state snapshot
// ============================================================
async function saveRoomSnapshot(roomCode, hostSessionId, hostToken, state) {
    const db = await getDb();
    const now = Date.now();
    const existing = db.exec(`SELECT room_code FROM rooms WHERE room_code = '${roomCode.replace(/'/g, "''")}'`);
    if (existing.length > 0 && existing[0].values.length > 0) {
        db.run("UPDATE rooms SET state_json = ?, updated_at = ? WHERE room_code = ?", [
            JSON.stringify(state), now, roomCode
        ]);
    }
    else {
        db.run("INSERT INTO rooms (room_code, host_session_id, host_token, state_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)", [roomCode, hostSessionId, hostToken, JSON.stringify(state), now, now]);
    }
    persistDb(db);
}
async function loadRoomSnapshot(roomCode) {
    const db = await getDb();
    const result = db.exec(`SELECT room_code, host_session_id, host_token, state_json FROM rooms WHERE room_code = ?`, [roomCode]);
    if (!result.length || !result[0].values.length)
        return null;
    const [rc, hsi, ht, sj] = result[0].values[0];
    try {
        return {
            roomCode: rc,
            hostSessionId: hsi,
            hostToken: ht,
            state: JSON.parse(sj),
        };
    }
    catch {
        return null;
    }
}
// ============================================================
// Load all non-ended rooms (for restart recovery)
// ============================================================
async function loadAllRoomSnapshots() {
    const db = await getDb();
    const result = db.exec(`SELECT room_code, host_session_id, host_token, state_json FROM rooms`);
    if (!result.length)
        return [];
    return result[0].values
        .map((row) => {
        try {
            const state = JSON.parse(row[3]);
            if (state.status === "ended")
                return null;
            return {
                roomCode: row[0],
                hostSessionId: row[1],
                hostToken: row[2],
                state,
            };
        }
        catch {
            return null;
        }
    })
        .filter((r) => r !== null);
}
// ============================================================
// Save final summary
// ============================================================
async function saveRoomSummary(roomCode, state) {
    const db = await getDb();
    const now = Date.now();
    const summaryJson = JSON.stringify({
        roomCode,
        teams: state.teams,
        soldPlayers: state.soldPlayers,
        unsoldPlayers: state.unsoldPlayers,
        endedAt: now,
    });
    const existing = db.exec(`SELECT room_code FROM room_summaries WHERE room_code = ?`, [roomCode]);
    if (existing.length > 0 && existing[0].values.length > 0) {
        db.run("UPDATE room_summaries SET summary_json = ?, ended_at = ? WHERE room_code = ?", [summaryJson, now, roomCode]);
    }
    else {
        db.run("INSERT INTO room_summaries (room_code, summary_json, ended_at) VALUES (?, ?, ?)", [roomCode, summaryJson, now]);
    }
    persistDb(db);
}
async function loadRoomSummary(roomCode) {
    const db = await getDb();
    const result = db.exec(`SELECT summary_json FROM room_summaries WHERE room_code = ?`, [roomCode]);
    if (!result.length || !result[0].values.length)
        return null;
    try {
        return JSON.parse(result[0].values[0][0]);
    }
    catch {
        return null;
    }
}
async function getHostToken(roomCode) {
    const db = await getDb();
    const result = db.exec(`SELECT host_token FROM rooms WHERE room_code = ?`, [roomCode]);
    if (!result.length || !result[0].values.length)
        return null;
    return result[0].values[0][0];
}
