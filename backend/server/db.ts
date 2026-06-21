import initSqlJs, { Database } from "sql.js";
import path from "path";
import fs from "fs";
import { RoomState } from "../types";

const DB_DIR = path.join(process.cwd(), "data", "db");
const DB_PATH = path.join(DB_DIR, "auction.db");

// Ensure data/db directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

let dbInstance: Database | null = null;
let sqlJs: Awaited<ReturnType<typeof initSqlJs>> | null = null;

async function getDb(): Promise<Database> {
  if (dbInstance) return dbInstance;

  if (!sqlJs) {
    sqlJs = await initSqlJs();
  }

  // Load existing DB file or create new
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    dbInstance = new sqlJs.Database(fileBuffer);
  } else {
    dbInstance = new sqlJs.Database();
  }

  initSchema(dbInstance);
  return dbInstance;
}

function persistDb(db: Database): void {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

function initSchema(db: Database): void {
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
export async function saveRoomSnapshot(
  roomCode: string,
  hostSessionId: string,
  hostToken: string,
  state: RoomState
): Promise<void> {
  const db = await getDb();
  const now = Date.now();

  const existing = db.exec(`SELECT room_code FROM rooms WHERE room_code = '${roomCode.replace(/'/g, "''")}'`);

  if (existing.length > 0 && existing[0].values.length > 0) {
    db.run("UPDATE rooms SET state_json = ?, updated_at = ? WHERE room_code = ?", [
      JSON.stringify(state), now, roomCode
    ]);
  } else {
    db.run(
      "INSERT INTO rooms (room_code, host_session_id, host_token, state_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
      [roomCode, hostSessionId, hostToken, JSON.stringify(state), now, now]
    );
  }
  persistDb(db);
}

// ============================================================
// Load a room snapshot
// ============================================================
export interface RoomSnapshot {
  roomCode: string;
  hostSessionId: string;
  hostToken: string;
  state: RoomState;
}

export async function loadRoomSnapshot(roomCode: string): Promise<RoomSnapshot | null> {
  const db = await getDb();
  const result = db.exec(`SELECT room_code, host_session_id, host_token, state_json FROM rooms WHERE room_code = ?`, [roomCode]);
  if (!result.length || !result[0].values.length) return null;

  const [rc, hsi, ht, sj] = result[0].values[0];
  try {
    return {
      roomCode: rc as string,
      hostSessionId: hsi as string,
      hostToken: ht as string,
      state: JSON.parse(sj as string) as RoomState,
    };
  } catch {
    return null;
  }
}

// ============================================================
// Load all non-ended rooms (for restart recovery)
// ============================================================
export async function loadAllRoomSnapshots(): Promise<RoomSnapshot[]> {
  const db = await getDb();
  const result = db.exec(`SELECT room_code, host_session_id, host_token, state_json FROM rooms`);
  if (!result.length) return [];

  return result[0].values
    .map((row) => {
      try {
        const state = JSON.parse(row[3] as string) as RoomState;
        if (state.status === "ended") return null;
        return {
          roomCode: row[0] as string,
          hostSessionId: row[1] as string,
          hostToken: row[2] as string,
          state,
        };
      } catch {
        return null;
      }
    })
    .filter((r): r is RoomSnapshot => r !== null);
}

// ============================================================
// Save final summary
// ============================================================
export async function saveRoomSummary(roomCode: string, state: RoomState): Promise<void> {
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
  } else {
    db.run("INSERT INTO room_summaries (room_code, summary_json, ended_at) VALUES (?, ?, ?)", [roomCode, summaryJson, now]);
  }
  persistDb(db);
}

export async function loadRoomSummary(roomCode: string): Promise<object | null> {
  const db = await getDb();
  const result = db.exec(`SELECT summary_json FROM room_summaries WHERE room_code = ?`, [roomCode]);
  if (!result.length || !result[0].values.length) return null;
  try {
    return JSON.parse(result[0].values[0][0] as string);
  } catch {
    return null;
  }
}

export async function getHostToken(roomCode: string): Promise<string | null> {
  const db = await getDb();
  const result = db.exec(`SELECT host_token FROM rooms WHERE room_code = ?`, [roomCode]);
  if (!result.length || !result[0].values.length) return null;
  return result[0].values[0][0] as string;
}
