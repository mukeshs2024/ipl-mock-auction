// ============================================================
// Shared TypeScript types — single source of truth for both
// the Next.js frontend and the Socket.io server.
// ============================================================

export type Role = "Batter" | "Bowler" | "All-Rounder" | "Wicketkeeper";

export type PlayerStatus = "upcoming" | "in_auction" | "sold" | "unsold";

export interface Player {
  id: string;            // UUID generated at parse time
  name: string;
  role: Role;
  country: string;       // "India" or "International" (inferred from Overseas flag)
  isOverseas: boolean;
  isMarquee: boolean;    // inferred: set name contains "Marquee"
  basePrice: number;     // in Lakhs (normalized: "2.00 Cr" → 200, "75 L" → 75)
  set: string;           // e.g. "Marquee Set 1", "Set 1", "BA1"
  status: PlayerStatus;
  soldTo?: string;       // team code e.g. "MI"
  soldPrice?: number;    // in Lakhs
}

export interface Team {
  code: string;           // e.g. "MI", "CSK"
  name: string;
  colorHex: string;
  ownerSessionId: string | null;
  ownerName: string | null;
  purseRemaining: number; // in Lakhs
  squad: Player[];
  isConnected: boolean;   // whether the owner socket is currently connected
}

export type RoomStatus = "lobby" | "live" | "paused" | "ended";

export interface RoomState {
  roomCode: string;
  hostSessionId: string;
  hostName: string;
  status: RoomStatus;
  teams: Record<string, Team>; // always all 10 keys present
  sets: string[];              // ordered set names from CSV
  currentSetIndex: number;
  currentSetQueue: Player[];   // shuffled players for the active set
  currentPlayer: Player | null;
  currentBid: number;          // Lakhs
  currentBidderTeam: string | null;
  timerEndsAt: number | null;  // epoch ms, server-authoritative
  timerDurationSeconds: number; // configurable, default 10
  minTimerSeconds: number;      // minimum 5
  pursePerTeam: number;         // Lakhs, set at room creation
  soldPlayers: Player[];
  unsoldPlayers: Player[];
  activityLog: ActivityLogEntry[];
  allPlayers: Player[];         // full flat list, all statuses
  reunsoldPhaseEnabled: boolean; // toggle for re-auction of unsold players
  reunsoldPhaseActive: boolean;
  totalPlayersCount: number;
  soldPlayersCount: number;
}

export type ActivityLogType =
  | "bid"
  | "sold"
  | "unsold"
  | "team_claimed"
  | "team_released"
  | "team_reassigned"
  | "host_action"
  | "joined"
  | "left"
  | "kicked"
  | "auction_started"
  | "auction_paused"
  | "auction_resumed"
  | "set_started"
  | "set_ended"
  | "chat";

export interface ActivityLogEntry {
  id: string;
  timestamp: number;
  type: ActivityLogType;
  message: string; // pre-formatted human-readable
  teamCode?: string; // for coloring in the feed
}

// ============================================================
// Bid increment slab config (all in Lakhs)
// ============================================================
export interface BidSlab {
  from: number;   // inclusive lower bound
  to: number;     // exclusive upper bound (Infinity for last slab)
  increment: number;
}

export const DEFAULT_BID_SLABS: BidSlab[] = [
  { from: 0,    to: 200,       increment: 20  },
  { from: 200,  to: 500,       increment: 25  },
  { from: 500,  to: 1000,      increment: 50  },
  { from: 1000, to: Infinity,  increment: 100 },
];

// ============================================================
// Socket.io event payloads
// ============================================================

// Client → Server
export interface CreateRoomPayload {
  hostName: string;
  hostSessionId: string;
  hostToken: string;
  players: Player[];         // parsed from CSV on client
  pursePerTeam: number;      // Lakhs
  timerDurationSeconds: number;
  reunsoldPhaseEnabled: boolean;
}

export interface JoinRoomPayload {
  roomCode: string;
  displayName: string;
  sessionId: string;
}

export interface ClaimTeamPayload {
  roomCode: string;
  teamCode: string;
  sessionId: string;
}

export interface BidPayload {
  roomCode: string;
  teamCode: string;
  sessionId: string;
  amount: number; // in Lakhs — the NEW total bid amount
}

export interface ChatPayload {
  roomCode: string;
  sessionId: string;
  message: string;
}

// Host-only payloads (all require hostToken)
export interface HostActionPayload {
  roomCode: string;
  hostToken: string;
  action:
    | "start_auction"
    | "pause_auction"
    | "resume_auction"
    | "skip_player"
    | "end_auction";
}

export interface HostExtendTimerPayload {
  roomCode: string;
  hostToken: string;
  extraSeconds: number;
}

export interface HostKickPayload {
  roomCode: string;
  hostToken: string;
  sessionId: string; // session to kick
}

export interface HostReassignTeamPayload {
  roomCode: string;
  hostToken: string;
  teamCode: string;
  newSessionId: string;
  newOwnerName: string;
}

export interface HostEditPursePayload {
  roomCode: string;
  hostToken: string;
  teamCode: string;
  newPurse: number; // Lakhs
}

export interface HostSetTimerPayload {
  roomCode: string;
  hostToken: string;
  timerDurationSeconds: number;
}

// Server → Client
export interface BidRejectedPayload {
  reason: string;
}

export interface KickedPayload {
  reason: string;
}

export interface RoomNotFoundPayload {
  roomCode: string;
}

// ============================================================
// IPL Teams — fixed 10 with real colors
// ============================================================
export const IPL_TEAMS: Omit<Team, "ownerSessionId" | "ownerName" | "purseRemaining" | "squad" | "isConnected">[] = [
  { code: "MI",   name: "Mumbai Indians",             colorHex: "#004BA0" },
  { code: "CSK",  name: "Chennai Super Kings",        colorHex: "#F7D02A" },
  { code: "RCB",  name: "Royal Challengers Bengaluru",colorHex: "#EC1C24" },
  { code: "KKR",  name: "Kolkata Knight Riders",      colorHex: "#3A225D" },
  { code: "SRH",  name: "Sunrisers Hyderabad",        colorHex: "#F7501C" },
  { code: "DC",   name: "Delhi Capitals",             colorHex: "#0066FF" },
  { code: "PBKS", name: "Punjab Kings",               colorHex: "#ED1B24" },
  { code: "RR",   name: "Rajasthan Royals",           colorHex: "#2D4FA4" },
  { code: "GT",   name: "Gujarat Titans",             colorHex: "#8B6914" },
  { code: "LSG",  name: "Lucknow Super Giants",       colorHex: "#00A3E0" },
];
