"use strict";
// ============================================================
// Shared TypeScript types — single source of truth for both
// the Next.js frontend and the Socket.io server.
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.IPL_TEAMS = exports.DEFAULT_BID_SLABS = void 0;
exports.DEFAULT_BID_SLABS = [
    { from: 0, to: 200, increment: 20 },
    { from: 200, to: 500, increment: 25 },
    { from: 500, to: 1000, increment: 50 },
    { from: 1000, to: Infinity, increment: 100 },
];
// ============================================================
// IPL Teams — fixed 10 with real colors
// ============================================================
exports.IPL_TEAMS = [
    { code: "MI", name: "Mumbai Indians", colorHex: "#004BA0" },
    { code: "CSK", name: "Chennai Super Kings", colorHex: "#F7D02A" },
    { code: "RCB", name: "Royal Challengers Bengaluru", colorHex: "#EC1C24" },
    { code: "KKR", name: "Kolkata Knight Riders", colorHex: "#3A225D" },
    { code: "SRH", name: "Sunrisers Hyderabad", colorHex: "#F7501C" },
    { code: "DC", name: "Delhi Capitals", colorHex: "#0066FF" },
    { code: "PBKS", name: "Punjab Kings", colorHex: "#ED1B24" },
    { code: "RR", name: "Rajasthan Royals", colorHex: "#2D4FA4" },
    { code: "GT", name: "Gujarat Titans", colorHex: "#8B6914" },
    { code: "LSG", name: "Lucknow Super Giants", colorHex: "#00A3E0" },
];
