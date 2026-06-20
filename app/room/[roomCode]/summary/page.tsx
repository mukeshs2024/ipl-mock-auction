"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuctionSocket } from "@/lib/use-auction-socket";
import { Team, Player, Role } from "@/types";
import { TeamBadgeSVG } from "@/components/TeamBadge";
import { getRoleBadgeClass, getRoleEmoji, formatLakhs } from "@/lib/utils";

const ROLE_ORDER: Role[] = ["Wicketkeeper", "Batter", "All-Rounder", "Bowler"];

function groupByRole(squad: Player[]): Record<Role, Player[]> {
  const groups: Record<Role, Player[]> = {
    Wicketkeeper: [], Batter: [], "All-Rounder": [], Bowler: [],
  };
  for (const p of squad) {
    groups[p.role].push(p);
  }
  return groups;
}

function getMostExpensive(squad: Player[]): Player | null {
  if (!squad.length) return null;
  return squad.reduce((max, p) => (p.soldPrice ?? 0) > (max.soldPrice ?? 0) ? p : max, squad[0]);
}

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

function TeamCard({ team }: { team: Team }) {
  const groups = groupByRole(team.squad);
  const mostExpensive = getMostExpensive(team.squad);
  const totalSpent = team.squad.reduce((sum, p) => sum + (p.soldPrice ?? 0), 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-xl overflow-hidden"
      style={{ background: "rgba(16,23,42,0.8)", border: `1px solid rgba(${hexToRgb(team.colorHex)}, 0.3)` }}
    >
      {/* Team header */}
      <div className="px-5 py-4 flex items-center gap-3"
        style={{ background: `rgba(${hexToRgb(team.colorHex)}, 0.12)`, borderBottom: `1px solid rgba(${hexToRgb(team.colorHex)}, 0.2)` }}>
        <TeamBadgeSVG team={team} size="md" />
        <div className="flex-1 min-w-0">
          <div className="font-display text-xl font-black text-white">{team.name}</div>
          <div className="text-muted text-xs">{team.ownerName || "No owner"}</div>
        </div>
        <div className="text-right">
          <div className="font-display text-lg font-black text-pitch-green">{formatLakhs(totalSpent)}</div>
          <div className="text-muted text-xs">spent</div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 divide-x divide-stadium-border px-0 py-3"
        style={{ borderBottom: "1px solid rgba(30,45,74,0.4)" }}>
        <div className="text-center px-3">
          <div className="font-display text-2xl font-black text-white">{team.squad.length}</div>
          <div className="text-muted text-xs">players</div>
        </div>
        <div className="text-center px-3">
          <div className="font-display text-2xl font-black text-amber-bid">{formatLakhs(team.purseRemaining)}</div>
          <div className="text-muted text-xs">remaining</div>
        </div>
        <div className="text-center px-3">
          <div className="font-display text-lg font-black text-white truncate">
            {mostExpensive ? formatLakhs(mostExpensive.soldPrice ?? 0) : "—"}
          </div>
          <div className="text-muted text-xs">top buy</div>
        </div>
      </div>

      {/* Most expensive highlight */}
      {mostExpensive && (
        <div className="mx-4 mt-3 mb-1 px-3 py-2 rounded-lg flex items-center gap-2"
          style={{ background: `rgba(${hexToRgb(team.colorHex)}, 0.08)`, border: `1px solid rgba(${hexToRgb(team.colorHex)}, 0.2)` }}>
          <span className="text-amber-bid text-xs">⭐ Top Buy:</span>
          <span className="text-white text-xs font-semibold">{mostExpensive.name}</span>
          <span className="text-pitch-green text-xs font-bold ml-auto">{formatLakhs(mostExpensive.soldPrice ?? 0)}</span>
        </div>
      )}

      {/* Squad grouped by role */}
      <div className="p-4 space-y-3">
        {ROLE_ORDER.map((role) => {
          const players = groups[role];
          if (!players.length) return null;
          return (
            <div key={role}>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-lg">{getRoleEmoji(role)}</span>
                <span className="text-muted text-xs uppercase tracking-wide">{role}</span>
                <span className="text-muted text-xs ml-auto">({players.length})</span>
              </div>
              <div className="space-y-1">
                {players.map((p) => (
                  <div key={p.id} className="flex items-center justify-between px-2 py-1.5 rounded"
                    style={{ background: "rgba(30,45,74,0.3)" }}>
                    <div className="flex items-center gap-2">
                      <span className="text-white text-xs font-medium">{p.name}</span>
                      {p.isOverseas && <span className="text-indigo-400 text-[10px]">🌍</span>}
                      {p.isMarquee && <span className="text-amber-bid text-[10px]">★</span>}
                    </div>
                    <span className="text-pitch-green text-xs font-bold">{formatLakhs(p.soldPrice ?? 0)}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        {team.squad.length === 0 && (
          <p className="text-muted text-sm text-center py-4">No players bought</p>
        )}
      </div>
    </motion.div>
  );
}

export default function SummaryPage({ params }: { params: { roomCode: string } }) {
  const { roomCode } = params;
  const { roomState, isConnected } = useAuctionSocket(roomCode);
  const [activeTeam, setActiveTeam] = useState<string | null>(null);

  if (!roomState) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#F2B705] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-subtle">Loading summary...</p>
        </div>
      </main>
    );
  }

  const teams = Object.values(roomState.teams);
  const totalSold = roomState.soldPlayers.length;
  const totalUnsold = roomState.unsoldPlayers.length;
  const totalSpentAll = roomState.soldPlayers.reduce((sum, p) => sum + (p.soldPrice ?? 0), 0);

  // Sort teams by total spent descending
  const sortedTeams = [...teams].sort((a, b) => {
    const spentA = a.squad.reduce((s, p) => s + (p.soldPrice ?? 0), 0);
    const spentB = b.squad.reduce((s, p) => s + (p.soldPrice ?? 0), 0);
    return spentB - spentA;
  });

  return (
    <main className="min-h-screen px-4 py-8">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-[#1FAA59] opacity-5 blur-[100px]" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-4 text-sm font-semibold"
            style={{ background: "rgba(31,170,89,0.1)", border: "1px solid rgba(31,170,89,0.3)", color: "#1FAA59" }}>
            🏆 Auction Complete
          </div>
          <h1 className="font-display text-6xl md:text-7xl font-black mb-2">
            <span className="gradient-text">FINAL</span> RESULTS
          </h1>
          <p className="text-muted">Room {roomCode} · {roomState.sets.length} sets auctioned</p>

          {/* Global stats */}
          <div className="flex flex-wrap justify-center gap-8 mt-8">
            {[
              { label: "Players Sold", value: totalSold, color: "#1FAA59" },
              { label: "Players Unsold", value: totalUnsold, color: "#E2433D" },
              { label: "Total Money Spent", value: formatLakhs(totalSpentAll), color: "#F2B705" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="font-display text-4xl font-black tabular-nums" style={{ color: s.color }}>{s.value}</div>
                <div className="text-muted text-sm uppercase tracking-wide mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Team filter tabs */}
        <div className="flex flex-wrap gap-2 justify-center mb-8">
          <button
            onClick={() => setActiveTeam(null)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${!activeTeam ? "bg-[#F2B705] text-[#0B0F19]" : "btn-secondary"}`}
          >
            All Teams
          </button>
          {teams.map((t) => (
            <button
              key={t.code}
              onClick={() => setActiveTeam(activeTeam === t.code ? null : t.code)}
              className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
              style={{
                background: activeTeam === t.code ? t.colorHex : `rgba(${hexToRgb(t.colorHex)}, 0.1)`,
                color: activeTeam === t.code ? "white" : t.colorHex,
                border: `1px solid rgba(${hexToRgb(t.colorHex)}, 0.4)`,
              }}
            >
              {t.code}
            </button>
          ))}
        </div>

        {/* Team cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {sortedTeams
            .filter((t) => !activeTeam || t.code === activeTeam)
            .map((team) => (
              <TeamCard key={team.code} team={team} />
            ))}
        </div>

        {/* Unsold players section */}
        {roomState.unsoldPlayers.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-10">
            <h2 className="font-display text-3xl font-black mb-4 text-crimson-hot">
              Unsold Players ({roomState.unsoldPlayers.length})
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {roomState.unsoldPlayers.map((p) => (
                <div key={p.id} className="px-3 py-2 rounded-lg"
                  style={{ background: "rgba(226,67,61,0.08)", border: "1px solid rgba(226,67,61,0.15)" }}>
                  <div className="text-white text-xs font-semibold">{p.name}</div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className={`${getRoleBadgeClass(p.role)} text-[9px] px-1`}>
                      {p.role === "Wicketkeeper" ? "WK" : p.role === "All-Rounder" ? "AR" : p.role}
                    </span>
                    <span className="text-muted text-[10px]">{formatLakhs(p.basePrice)}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Back to home */}
        <div className="mt-10 text-center">
          <a href="/" className="btn-secondary inline-flex">← Back to Home</a>
        </div>
      </div>
    </main>
  );
}
