"use client";
import { useState, useMemo } from "react";
import { Player, RoomState } from "@/types";
import { getRoleBadgeClass, formatLakhs } from "@/lib/utils";

interface PlayerRailsProps {
  state: RoomState;
}

function PlayerPill({ player }: { player: Player }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors" style={{ background: "rgba(16,23,42,0.5)", border: "1px solid rgba(30,45,74,0.4)" }}>
      <div className="flex-1 min-w-0">
        <div className="text-white text-xs font-semibold truncate">{player.name}</div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className={`${getRoleBadgeClass(player.role)} text-[10px] px-1 py-0`}>
            {player.role === "Wicketkeeper" ? "WK" : player.role === "All-Rounder" ? "AR" : player.role}
          </span>
          {player.isOverseas && <span className="text-[10px] text-indigo-400" title="Overseas">✈️</span>}
          {player.isMarquee && <span className="text-[10px] text-amber-bid" title="Marquee">★</span>}
        </div>
      </div>
      <span className="text-xs font-mono text-muted shrink-0">{formatLakhs(player.basePrice)}</span>
    </div>
  );
}

function SoldPlayerPill({ player, teamColor, teamCode }: { player: Player; teamColor: string; teamCode: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors" style={{ background: "rgba(16,23,42,0.5)", borderLeft: `3px solid ${teamColor}`, borderTop: "1px solid rgba(30,45,74,0.4)", borderRight: "1px solid rgba(30,45,74,0.4)", borderBottom: "1px solid rgba(30,45,74,0.4)" }}>
      <div className="flex-1 min-w-0">
        <div className="text-white text-xs font-semibold truncate">{player.name}</div>
        <div className="text-[10px] mt-0.5 font-bold" style={{ color: teamColor }}>{teamCode}</div>
      </div>
      <span className="text-pitch-green text-sm font-bold shrink-0 font-mono">{formatLakhs(player.soldPrice!)}</span>
    </div>
  );
}

export default function PlayerRails({ state }: PlayerRailsProps) {
  const [activeSubTab, setActiveSubTab] = useState<"upcoming" | "sold" | "unsold" | "highest">("upcoming");

  const { sets, soldPlayers, unsoldPlayers, allPlayers } = state;

  // Upcoming: grouped by set, ordered by set list, then by CSV order (which allPlayers preserves)
  const upcomingBySet = useMemo(() => {
    const grouped: Record<string, Player[]> = {};
    allPlayers.forEach((p) => {
      if (p.status === "upcoming") {
        if (!grouped[p.set]) grouped[p.set] = [];
        grouped[p.set].push(p);
      }
    });
    return grouped;
  }, [allPlayers]);

  const highestSold = useMemo(() => {
    return [...soldPlayers].sort((a, b) => (b.soldPrice || 0) - (a.soldPrice || 0));
  }, [soldPlayers]);

  const soldWithTeam = (list: Player[]) => list.map((p) => ({
    player: p,
    team: p.soldTo ? state.teams[p.soldTo] : null,
  }));

  return (
    <div className="flex flex-col h-full w-full">
      {/* Sub-tabs */}
      <div className="flex overflow-x-auto custom-scroll gap-2 mb-4 shrink-0 pb-1">
        {(["upcoming", "sold", "unsold", "highest"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveSubTab(tab)}
            className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-full transition-colors whitespace-nowrap"
            style={{
              background: activeSubTab === tab ? "rgba(242,183,5,0.15)" : "rgba(30,45,74,0.3)",
              color: activeSubTab === tab ? "#F2B705" : "rgba(200,214,240,0.6)",
              border: `1px solid ${activeSubTab === tab ? "rgba(242,183,5,0.4)" : "transparent"}`,
            }}
          >
            {tab === "highest" ? "Top Buys" : tab}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto custom-scroll space-y-4 pr-1 min-h-[300px]">
        {/* ── UPCOMING TAB ── */}
        {activeSubTab === "upcoming" && (
          <div className="space-y-4">
            {sets.map((setName) => {
              const players = upcomingBySet[setName];
              if (!players || players.length === 0) return null;
              return (
                <div key={setName}>
                  <div className="text-[10px] font-bold text-muted uppercase tracking-widest mb-2 px-1 sticky top-0 bg-[rgba(10,15,25,0.95)] py-1 z-10 backdrop-blur-sm">
                    {setName} <span className="opacity-50">({players.length})</span>
                  </div>
                  <div className="space-y-1.5">
                    {players.map((p) => (
                      <PlayerPill key={p.id} player={p} />
                    ))}
                  </div>
                </div>
              );
            })}
            {Object.keys(upcomingBySet).length === 0 && (
              <p className="text-muted text-xs text-center py-8">No upcoming players left.</p>
            )}
          </div>
        )}

        {/* ── SOLD TAB ── */}
        {activeSubTab === "sold" && (
          <div className="space-y-1.5">
            {soldWithTeam([...soldPlayers].reverse()).map(({ player, team }) => (
              <SoldPlayerPill
                key={player.id}
                player={player}
                teamColor={team?.colorHex || "#6b7280"}
                teamCode={player.soldTo || "?"}
              />
            ))}
            {soldPlayers.length === 0 && <p className="text-muted text-xs text-center py-8">No players sold yet.</p>}
          </div>
        )}

        {/* ── UNSOLD TAB ── */}
        {activeSubTab === "unsold" && (
          <div className="space-y-1.5">
            {[...unsoldPlayers].reverse().map((p) => (
              <PlayerPill key={p.id} player={p} />
            ))}
            {unsoldPlayers.length === 0 && <p className="text-muted text-xs text-center py-8">No unsold players.</p>}
          </div>
        )}

        {/* ── HIGHEST TO LOWEST (TOP BUYS) ── */}
        {activeSubTab === "highest" && (
          <div className="space-y-1.5">
            {soldWithTeam(highestSold).map(({ player, team }) => (
              <SoldPlayerPill
                key={player.id}
                player={player}
                teamColor={team?.colorHex || "#6b7280"}
                teamCode={player.soldTo || "?"}
              />
            ))}
            {highestSold.length === 0 && <p className="text-muted text-xs text-center py-8">No players sold yet.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
