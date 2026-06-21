import { Player, Role } from "@/types";
import { v4 as uuidv4 } from "uuid";

// ============================================================
// Price parsing: handles "2.00 Cr", "1.50 Cr", "75 L", "30 L"
// Always returns a value in Lakhs (1 Cr = 100 L)
// ============================================================
export function parseBasePrice(raw: string): number | null {
  if (!raw) return null;
  const s = raw.trim().toLowerCase();

  // Crores: "2.00 cr", "1.50 cr"
  const crMatch = s.match(/^([\d.]+)\s*cr$/i);
  if (crMatch) {
    return Math.round(parseFloat(crMatch[1]) * 100);
  }

  // Lakhs: "75 l", "30 l", "50 l"
  const lMatch = s.match(/^([\d.]+)\s*l$/i);
  if (lMatch) {
    return Math.round(parseFloat(lMatch[1]));
  }

  // Plain number (assume Lakhs)
  const num = parseFloat(s);
  if (!isNaN(num)) return Math.round(num);

  return null;
}

// ============================================================
// Role normalization
// ============================================================
export function normalizeRole(raw: string): Role | null {
  if (!raw) return null;
  const s = raw.trim().toLowerCase().replace(/[-\s]+/g, "");
  if (s === "batsman" || s === "batter" || s === "bat") return "Batter";
  if (s === "bowler" || s === "bowl") return "Bowler";
  if (s === "allrounder" || s === "ar" || s === "all-rounder") return "All-Rounder";
  if (s === "wicketkeeper" || s === "wk" || s === "wicket-keeper" || s === "wicketkeeperbatter") return "Wicketkeeper";
  return null;
}

// ============================================================
// Boolean normalization (Overseas)
// ============================================================
export function parseBoolean(raw: string): boolean {
  if (!raw) return false;
  const s = raw.trim().toLowerCase();
  return s === "yes" || s === "true" || s === "1";
}

// ============================================================
// CSV column header alias mapping
// ============================================================
const COLUMN_ALIASES: Record<string, string> = {
  // Set
  set: "set",
  setname: "set",
  category: "set",
  auction_set: "set",
  auctionset: "set",
  // Player name
  playername: "playerName",
  name: "playerName",
  player: "playerName",
  player_name: "playerName",
  // Role
  role: "role",
  position: "role",
  // Overseas
  isoverseas: "isOverseas",
  overseas: "isOverseas",
  // Base price
  baseprice: "basePrice",
  base_price: "basePrice",
  reserveprice: "basePrice",
  "base price": "basePrice",
};

function normalizeHeader(h: string): string {
  return (COLUMN_ALIASES[h.trim().toLowerCase().replace(/\s+/g, "")] || h.trim());
}

// ============================================================
// Parse result types
// ============================================================
export interface ParsedRow {
  player: Player;
}
export interface RejectedRow {
  rowIndex: number;
  rawData: Record<string, string>;
  reason: string;
}
export interface ParseResult {
  players: Player[];
  rejectedRows: RejectedRow[];
  sets: string[];       // ordered set names (first-seen order)
  setCountMap: Record<string, number>;
}

// ============================================================
// Main parser — called on the server with raw CSV text
// Also exported for client-side preview usage
// ============================================================
export function parsePlayersCSV(csvText: string): ParseResult {
  const lines = csvText.split("\n").filter((l) => l.trim());
  if (lines.length < 2) {
    return { players: [], rejectedRows: [], sets: [], setCountMap: {} };
  }

  // Parse header
  const rawHeaders = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  const headers = rawHeaders.map(normalizeHeader);

  const players: Player[] = [];
  const rejectedRows: RejectedRow[] = [];
  const seenSets: string[] = [];
  const setCountMap: Record<string, number> = {};

  for (let i = 1; i < lines.length; i++) {
    const raw = lines[i];
    if (!raw.trim()) continue;

    // Handle quoted fields
    const cols = parseCSVLine(raw);
    const rowData: Record<string, string> = {};
    headers.forEach((h, idx) => {
      rowData[h] = (cols[idx] || "").trim();
    });

    const rowIndex = i;

    // --- Validate required fields ---
    const setVal = rowData["set"] || "";
    const nameVal = rowData["playerName"] || "";
    const basePriceRaw = rowData["basePrice"] || "";

    if (!nameVal) {
      rejectedRows.push({ rowIndex, rawData: rowData, reason: "Missing PlayerName" });
      continue;
    }
    if (!setVal) {
      rejectedRows.push({ rowIndex, rawData: rowData, reason: "Missing Set" });
      continue;
    }
    if (!basePriceRaw) {
      rejectedRows.push({ rowIndex, rawData: rowData, reason: "Missing BasePrice" });
      continue;
    }

    const basePrice = parseBasePrice(basePriceRaw);
    if (basePrice === null || basePrice <= 0) {
      rejectedRows.push({ rowIndex, rawData: rowData, reason: `Invalid BasePrice: "${basePriceRaw}"` });
      continue;
    }

    const roleRaw = rowData["role"] || "";
    const role = normalizeRole(roleRaw);
    if (!role) {
      rejectedRows.push({ rowIndex, rawData: rowData, reason: `Unknown Role: "${roleRaw}"` });
      continue;
    }

    const isOverseas = parseBoolean(rowData["isOverseas"] || "No");
    const isMarquee = setVal.toLowerCase().includes("marquee");
    const country = isOverseas ? "International" : "India";

    // Track set order (first-seen)
    if (!seenSets.includes(setVal)) seenSets.push(setVal);
    setCountMap[setVal] = (setCountMap[setVal] || 0) + 1;

    players.push({
      id: uuidv4(),
      name: nameVal,
      role,
      country,
      isOverseas,
      isMarquee,
      basePrice,
      set: setVal,
      status: "upcoming",
    });
  }

  return { players, rejectedRows, sets: seenSets, setCountMap };
}

// ============================================================
// Minimal CSV line parser (handles quoted commas)
// ============================================================
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}
