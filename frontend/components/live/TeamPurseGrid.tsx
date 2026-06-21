"use client";
import { useState } from "react";
import { Team, Player } from "@/types";
import { TeamBadgeSVG } from "@/components/TeamBadge";
import { formatLakhs } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface TeamPurseGridProps {
  teams: Record<string, Team>;
  currentBidderTeam: string | null;
  myTeamCode: string | null;
  isHost: boolean;
  onKickUser: (sessionId: string) => void;
}

export default function TeamPurseGrid({ teams, currentBidderTeam, myTeamCode, isHost, onKickUser }: TeamPurseGridProps) {
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);

  const sortedTeams = Object.values(teams).sort((a, b) => b.purseRemaining - a.purseRemaining);

  return (
    <div className="space-y-2 w-full">
      <h3 className="text-xs font-semibold text-muted uppercase tracking-widest mb-3">Team Details</h3>
      {sortedTeams.map((team) => {
        const isLeading = team.code === currentBidderTeam;
        const isMe = team.code === myTeamCode;
        const isClaimed = !!team.ownerSessionId;
        const isExpanded = expandedTeam === team.code;

        // Calculate stats dynamically based on squad
        const actualTotalPurse = team.purseRemaining + team.squad.reduce((sum, p) => sum + (p.soldPrice || 0), 0);
        const actualSpent = team.squad.reduce((sum, p) => sum + (p.soldPrice || 0), 0);
        const overseasCount = team.squad.filter((p) => p.isOverseas).length;

        // Group squad by role
        const wk = team.squad.filter(p => p.role === "Wicketkeeper");
        const bat = team.squad.filter(p => p.role === "Batter");
        const all = team.squad.filter(p => p.role === "All-Rounder");
        const bowl = team.squad.filter(p => p.role === "Bowler");

        return (
          <div key={team.code} className="rounded-xl overflow-hidden transition-all" style={{ background: "rgba(16,23,42,0.6)", border: isLeading ? `1px solid rgba(${hexToRgb(team.colorHex)}, 0.4)` : "1px solid rgba(30,45,74,0.4)" }}>
            {/* Header row (always visible) */}
            <div
              className="flex items-center gap-3 p-3 cursor-pointer select-none relative"
              onClick={() => setExpandedTeam(isExpanded ? null : team.code)}
              style={{ background: isLeading ? `rgba(${hexToRgb(team.colorHex)}, 0.15)` : "transparent" }}
            >
              <TeamBadgeSVG team={team} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-white truncate">{team.code}</span>
                  {isLeading && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ background: team.colorHex + "33", color: team.colorHex }}>
                      LEADING
                    </span>
                  )}
                  {isMe && !isLeading && <span className="text-[10px] text-amber-bid">(you)</span>}
                </div>
                {/* Purse bar */}
                <div className="mt-1 h-1.5 rounded-full bg-stadium-border overflow-hidden max-w-[120px]">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(2, (team.purseRemaining / Math.max(12000, actualTotalPurse)) * 100)}%`, backgroundColor: team.colorHex, opacity: 0.8 }}
                  />
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-display font-bold text-sm text-white tabular-nums">
                  {formatLakhs(team.purseRemaining)}
                </div>
                <div className="text-muted text-xs flex items-center justify-end gap-1">
                  <span>{team.squad.length} players</span>
                  <span className="text-lg leading-none opacity-50 ml-1">{isExpanded ? "▾" : "▸"}</span>
                </div>
                {isHost && isClaimed && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Kick the owner of ${team.code}?`)) {
                        onKickUser(team.ownerSessionId!);
                      }
                    }}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors"
                    title="Kick user"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>

            {/* Expanded Details */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-4 pt-0 border-t border-[rgba(30,45,74,0.4)] space-y-4 text-xs mt-2">
                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-4 bg-[rgba(10,15,25,0.4)] p-3 rounded-lg">
                      <div>
                        <div className="text-muted mb-1">Purse Spent</div>
                        <div className="font-bold text-amber-bid">{formatLakhs(actualSpent)}</div>
                      </div>
                      <div>
                        <div className="text-muted mb-1">Players Bought</div>
                        <div className="font-bold text-white">{team.squad.length} <span className="text-muted font-normal text-[10px]">({overseasCount} OS)</span></div>
                      </div>
                    </div>

                    {/* Squad List ordered WK, BAT, ALL, BOWL */}
                    {team.squad.length > 0 ? (
                      <div className="space-y-3">
                        <RoleGroup title="Wicketkeepers" players={wk} color="#f59e0b" />
                        <RoleGroup title="Batters" players={bat} color="#3b82f6" />
                        <RoleGroup title="All-Rounders" players={all} color="#8b5cf6" />
                        <RoleGroup title="Bowlers" players={bowl} color="#10b981" />
                      </div>
                    ) : (
                      <div className="text-center text-muted py-2 italic">No players bought yet.</div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

function RoleGroup({ title, players, color }: { title: string, players: Player[], color: string }) {
  if (players.length === 0) return null;
  return (
    <div>
      <div className="text-[10px] uppercase font-bold tracking-wider mb-1" style={{ color }}>{title} ({players.length})</div>
      <div className="space-y-1">
        {players.map(p => (
          <div key={p.id} className="flex justify-between items-center bg-[rgba(30,45,74,0.2)] px-2 py-1.5 rounded">
            <div className="flex items-center gap-1.5">
              <span className="font-medium text-white text-[11px] truncate">{p.name}</span>
              {p.isOverseas && <span title="Overseas" className="text-[10px]">✈️</span>}
            </div>
            <span className="text-muted text-[10px] font-mono">{formatLakhs(p.soldPrice || 0)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) || 0;
  const g = parseInt(hex.slice(3, 5), 16) || 0;
  const b = parseInt(hex.slice(5, 7), 16) || 0;
  return `${r},${g},${b}`;
}
