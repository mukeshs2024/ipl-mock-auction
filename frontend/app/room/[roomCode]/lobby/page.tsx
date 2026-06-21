"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuctionSocket } from "@/lib/use-auction-socket";
import { Team } from "@/types";
import { TeamBadgeSVG } from "@/components/TeamBadge";
import { formatLakhs } from "@/lib/utils";

export default function LobbyPage({ params }: { params: { roomCode: string } }) {
  const { roomCode } = params;
  const {
    roomState, isConnected, sessionId, displayName, isHost,
    myTeamCode, lastRejection, claimTeam, releaseTeam, hostAction, clearRejection,
  } = useAuctionSocket(roomCode);
  const router = useRouter();
  const [claimingTeam, setClaimingTeam] = useState<string | null>(null);

  // Redirect to live when auction starts
  useEffect(() => {
    if (roomState?.status === "live" || roomState?.status === "paused") {
      router.push(`/room/${roomCode}/live`);
    }
    if (roomState?.status === "ended") {
      router.push(`/room/${roomCode}/summary`);
    }
  }, [roomState?.status, roomCode, router]);

  useEffect(() => {
    if (lastRejection) {
      setClaimingTeam(null);
      const t = setTimeout(clearRejection, 3000);
      return () => clearTimeout(t);
    }
  }, [lastRejection, clearRejection]);

  const handleClaim = (teamCode: string) => {
    if (claimingTeam) return;
    setClaimingTeam(teamCode);
    claimTeam(teamCode);
    // Reset claiming state after response (room_state will arrive)
    setTimeout(() => setClaimingTeam(null), 3000);
  };

  const handleRelease = () => {
    if (myTeamCode) releaseTeam(myTeamCode);
  };

  if (!roomState) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#F2B705] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-subtle">Connecting to auction room...</p>
        </div>
      </main>
    );
  }

  const teams = Object.values(roomState.teams);
  const claimedCount = teams.filter((t) => t.ownerSessionId !== null).length;
  const myTeam = myTeamCode ? roomState.teams[myTeamCode] : null;

  return (
    <main className="min-h-screen px-4 py-8">
      {/* Header */}
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="status-dot status-lobby" />
              <span className="text-muted text-sm uppercase tracking-widest">Lobby</span>
            </div>
            <h1 className="font-display text-4xl font-black">
              Room <span className="text-amber-bid tracking-widest">{roomCode}</span>
            </h1>
            <p className="text-subtle text-sm mt-1">
              {isConnected ? "🟢 Connected" : "🔴 Reconnecting..."} ·{" "}
              {claimedCount}/10 teams claimed · Waiting for host to start
            </p>
          </div>

          {/* Share link */}
          <div className="glass-panel-light px-4 py-3 flex items-center gap-3">
            <div>
              <div className="text-muted text-xs mb-1">Share this code</div>
              <div className="font-display text-2xl font-black text-amber-bid tracking-widest">{roomCode}</div>
            </div>
            <button
              onClick={() => navigator.clipboard.writeText(`${window.location.origin}/join`)}
              className="btn-secondary text-xs py-2 px-3"
            >
              Copy link
            </button>
          </div>
        </div>

        {/* My team strip */}
        {myTeam && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-xl flex items-center gap-4"
            style={{ background: `rgba(${hexToRgb(myTeam.colorHex)}, 0.1)`, border: `1px solid rgba(${hexToRgb(myTeam.colorHex)}, 0.3)` }}
          >
            <TeamBadgeSVG team={myTeam} size="md" />
            <div className="flex-1">
              <div className="font-display text-xl font-black text-white">You claimed {myTeam.name}</div>
              <div className="text-subtle text-sm">Purse: {formatLakhs(myTeam.purseRemaining)}</div>
            </div>
            <button onClick={handleRelease} className="btn-secondary text-sm py-2">Release</button>
          </motion.div>
        )}

        {/* Rejection error */}
        <AnimatePresence>
          {lastRejection && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-4 px-4 py-3 rounded-lg text-sm"
              style={{ background: "rgba(226,67,61,0.1)", border: "1px solid rgba(226,67,61,0.3)", color: "#E2433D" }}
            >
              ⚠ {lastRejection}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Team grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          {teams.map((team) => {
            const isClaimed = !!team.ownerSessionId;
            const isMyTeam = team.code === myTeamCode;
            const isClaiming = claimingTeam === team.code;
            const canClaim = !myTeamCode && !isClaimed;

            return (
              <motion.div
                key={team.code}
                whileHover={canClaim ? { scale: 1.03 } : undefined}
                whileTap={canClaim ? { scale: 0.97 } : undefined}
                onClick={() => canClaim && handleClaim(team.code)}
                className={`relative rounded-xl p-5 text-center transition-all ${canClaim ? "cursor-pointer" : "cursor-default"}`}
                style={{
                  background: isMyTeam
                    ? `rgba(${hexToRgb(team.colorHex)}, 0.15)`
                    : isClaimed
                    ? "rgba(16,23,42,0.8)"
                    : "rgba(20,29,51,0.6)",
                  border: isMyTeam
                    ? `2px solid ${team.colorHex}`
                    : isClaimed
                    ? "1px solid rgba(30,45,74,0.5)"
                    : "1px solid rgba(30,45,74,0.3)",
                }}
              >
                {/* Team badge */}
                <div className="flex justify-center mb-3">
                  <TeamBadgeSVG team={team} size="lg" />
                </div>

                <div className="font-display text-xl font-black text-white">{team.code}</div>
                <div className="text-muted text-[11px] mt-0.5 leading-tight">{team.name}</div>

                {/* Status */}
                <div className="mt-3">
                  {isClaiming ? (
                    <div className="flex items-center justify-center gap-1.5 text-xs text-amber-bid">
                      <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Claiming...
                    </div>
                  ) : isMyTeam ? (
                    <div className="text-xs font-bold" style={{ color: team.colorHex }}>YOU</div>
                  ) : isClaimed ? (
                    <div className="text-xs text-subtle truncate">{team.ownerName}</div>
                  ) : (
                    <div className="text-xs text-pitch-green">Available</div>
                  )}
                </div>

                {/* Connectivity indicator */}
                {isClaimed && (
                  <div className={`absolute top-2 right-2 w-2 h-2 rounded-full ${team.isConnected ? "bg-pitch-green" : "bg-amber-bid"}`}
                    title={team.isConnected ? "Connected" : "Disconnected"} />
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Host start button */}
        {isHost && (
          <div className="flex justify-center">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => hostAction("start_auction")}
              className="btn-primary text-xl px-12 py-5"
              style={{ fontSize: "1.25rem" }}
            >
              🚀 Start Auction
            </motion.button>
          </div>
        )}

        {!isHost && (
          <p className="text-center text-muted text-sm">Waiting for the host to start the auction...</p>
        )}

        {/* Player list preview */}
        <div className="mt-8 glass-panel p-6">
          <h3 className="font-display text-lg font-bold mb-4">
            Auction Info · {roomState.totalPlayersCount} Players · {roomState.sets.length} Sets
          </h3>
          <div className="flex flex-wrap gap-2">
            {roomState.sets.map((set, i) => {
              const count = roomState.allPlayers.filter((p) => p.set === set).length;
              return (
                <div key={set} className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
                  style={{ background: "rgba(30,45,74,0.4)", border: "1px solid rgba(30,45,74,0.6)" }}>
                  <span className="text-muted text-xs">{i + 1}.</span>
                  <span className="text-white text-sm font-semibold">{set}</span>
                  <span className="text-amber-bid text-xs">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}
