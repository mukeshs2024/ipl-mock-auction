"use client";
import { useState, memo } from "react";
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

function TeamPurseGridComponent({ teams, currentBidderTeam, myTeamCode, isHost, onKickUser }: TeamPurseGridProps) {
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);

  const sortedTeams = Object.values(teams).sort((a, b) => b.purseRemaining - a.purseRemaining);

  return (
    <div className="space-y-3 w-full">
      <h3 className="text-xs font-bold text-accent-blue uppercase tracking-widest mb-4 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-accent-blue shadow-[0_0_8px_rgba(0,102,255,0.8)]"></span>
        Team Standings
      </h3>
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
          <div key={team.code} className="rounded-xl overflow-hidden transition-all duration-300" style={{ background: isLeading ? "rgba(0,102,255,0.05)" : "#0B0B0B", border: isLeading ? "1px solid #0066FF" : "1px solid rgba(255,255,255,0.1)", boxShadow: isLeading ? "0 0 15px rgba(0,102,255,0.2)" : "none" }}>
            {/* Header row (always visible) */}
            <div
              className="flex items-center gap-4 p-3 sm:p-4 cursor-pointer select-none relative hover:bg-[rgba(255,255,255,0.02)] transition-colors"
              onClick={() => setExpandedTeam(isExpanded ? null : team.code)}
            >
              <div className="shrink-0">
                <TeamBadgeSVG team={team} size="sm" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="font-bold text-sm sm:text-base text-white truncate">{team.code}</span>
                  {isLeading && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-[#0066FF] text-white tracking-wider">
                      LEADING
                    </span>
                  )}
                  {isMe && !isLeading && <span className="text-[10px] text-accent-blue">(you)</span>}
                </div>
                {/* Purse bar */}
                <div className="h-1.5 rounded-full bg-[#1E2D4A] overflow-hidden max-w-[140px]">
                  <div
                    className="h-full rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${Math.max(2, (team.purseRemaining / Math.max(12000, actualTotalPurse)) * 100)}%`, backgroundColor: team.colorHex }}
                  />
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-display font-black text-base sm:text-lg text-white tabular-nums leading-none mb-1">
                  {formatLakhs(team.purseRemaining)}
                </div>
                <div className="text-muted text-[10px] sm:text-xs flex items-center justify-end gap-1.5 font-medium">
                  <span>{team.squad.length} players</span>
                  <motion.span 
                    animate={{ rotate: isExpanded ? 180 : 0 }} 
                    className="text-[10px] opacity-70 inline-block ml-1"
                  >
                    ▼
                  </motion.span>
                </div>
                {isHost && isClaimed && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Kick the owner of ${team.code}?`)) {
                        onKickUser(team.ownerSessionId!);
                      }
                    }}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[rgba(239,68,68,0.1)] text-[#EF4444] flex items-center justify-center hover:bg-[#EF4444] hover:text-white transition-colors border border-[rgba(239,68,68,0.2)]"
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
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="p-4 pt-0 border-t border-[rgba(255,255,255,0.05)] space-y-4 mt-2">
                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-3 bg-[#050505] p-3 rounded-xl border border-[rgba(255,255,255,0.05)]">
                      <div>
                        <div className="text-[10px] text-muted uppercase tracking-wider mb-1 font-semibold">Spent</div>
                        <div className="font-bold text-accent-blue text-sm sm:text-base tabular-nums">{formatLakhs(actualSpent)}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-muted uppercase tracking-wider mb-1 font-semibold">Squad</div>
                        <div className="font-bold text-white text-sm sm:text-base tabular-nums">{team.squad.length} <span className="text-muted font-normal text-[10px]">({overseasCount} OS)</span></div>
                      </div>
                    </div>

                    {/* Squad List ordered WK, BAT, ALL, BOWL */}
                    {team.squad.length > 0 ? (
                      <div className="space-y-4 pt-1">
                        <RoleGroup title="Wicketkeepers" players={wk} color="#22C55E" />
                        <RoleGroup title="Batters" players={bat} color="#0066FF" />
                        <RoleGroup title="All-Rounders" players={all} color="#A855F7" />
                        <RoleGroup title="Bowlers" players={bowl} color="#EF4444" />
                      </div>
                    ) : (
                      <div className="text-center text-muted py-3 text-sm">No players bought yet</div>
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
      <div className="text-[10px] uppercase font-bold tracking-widest mb-2 flex items-center gap-2" style={{ color }}>
        {title} <span className="opacity-70">({players.length})</span>
      </div>
      <div className="space-y-1.5">
        {players.map(p => (
          <div key={p.id} className="flex justify-between items-center bg-[#050505] px-2.5 py-2 rounded-lg border border-[rgba(255,255,255,0.03)] hover:border-[rgba(255,255,255,0.1)] transition-colors">
            <div className="flex items-center gap-2">
              <span className="font-medium text-white text-xs sm:text-sm truncate max-w-[140px] sm:max-w-[200px]">{p.name}</span>
              {p.isOverseas && <span title="Overseas" className="text-[10px]">✈️</span>}
            </div>
            <span className="text-muted text-xs font-mono font-medium">{formatLakhs(p.soldPrice || 0)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Deep equality check for memo to prevent re-renders when teams object is recreated on socket broadcast
export default memo(TeamPurseGridComponent, (prev, next) => {
  if (prev.currentBidderTeam !== next.currentBidderTeam) return false;
  if (prev.myTeamCode !== next.myTeamCode) return false;
  
  // Check if any team's purse or squad length changed
  for (const key in prev.teams) {
    const pt = prev.teams[key];
    const nt = next.teams[key];
    if (!nt) return false;
    if (pt.purseRemaining !== nt.purseRemaining) return false;
    if (pt.squad.length !== nt.squad.length) return false;
    if (pt.ownerSessionId !== nt.ownerSessionId) return false;
  }
  return true;
});
