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
    myTeamCode, lastRejection, claimTeam, releaseTeam, hostAction, clearRejection, setTimerDuration,
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
      <main className="min-h-screen flex items-center justify-center bg-[#000000]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#0066FF] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-subtle">Connecting to premium auction lobby...</p>
        </div>
      </main>
    );
  }

  const teams = Object.values(roomState.teams);
  const claimedCount = teams.filter((t) => t.ownerSessionId !== null).length;
  const myTeam = myTeamCode ? roomState.teams[myTeamCode] : null;

  return (
    <main className="min-h-screen bg-[#000000] flex flex-col relative pb-32">
      {/* Top Navigation */}
      <div className="shrink-0 px-4 py-3 flex items-center justify-between sticky top-0 z-50"
        style={{ background: "rgba(5,5,5,0.85)", borderBottom: "1px solid rgba(255,255,255,0.05)", backdropFilter: "blur(12px)" }}>
        
        <div className="flex items-center gap-4">
          <button onClick={() => router.push("/")} className="text-muted hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <div className="status-dot status-lobby" />
            <span className="font-display text-sm font-bold tracking-widest uppercase text-white">Lobby</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.05)]">
            {roomState.isPublic ? "🌐 Public Room" : "🔒 Private Room"}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="font-mono font-bold text-lg tracking-widest text-accent-blue">{roomCode}</span>
          <button
            onClick={() => {
              navigator.clipboard.writeText(`${window.location.origin}/join`);
              alert(`Share this code to join: ${roomCode}`);
            }}
            className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1 bg-[#0B0B0B]"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span className="hidden sm:inline">Copy Invite</span>
          </button>
        </div>
      </div>

      <div className="flex-1 w-full max-w-6xl mx-auto px-4 py-8">
        
        {/* Room Status Card */}
        <div className="mb-8 p-6 sm:p-8 rounded-2xl bg-[#0B0B0B] border border-[rgba(255,255,255,0.05)] relative overflow-hidden">
           <div className="absolute top-0 right-0 w-64 h-64 bg-[#0066FF] opacity-[0.05] blur-[80px] rounded-full translate-x-1/3 -translate-y-1/3" />
           <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div>
                 <h1 className="font-display text-4xl sm:text-5xl font-black mb-2 tracking-tight">
                    Arena <span className="text-[#0066FF] uppercase">{roomCode}</span>
                 </h1>
                 <p className="text-subtle text-sm flex items-center gap-3">
                    <span className="flex items-center gap-1.5 font-medium">
                       <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-status-success shadow-[0_0_8px_rgba(34,197,94,0.5)]" : "bg-status-danger animate-pulse"}`} />
                       {isConnected ? "Connected" : "Reconnecting..."}
                    </span>
                    <span className="opacity-50">•</span>
                    <span>{claimedCount}/10 Teams Claimed</span>
                    <span className="opacity-50">•</span>
                    <span>Waiting for Host</span>
                 </p>
              </div>
           </div>
        </div>

        {/* My team strip */}
        {myTeam && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-5 rounded-2xl flex flex-col sm:flex-row items-center gap-5 backdrop-blur-md"
            style={{ background: `rgba(${hexToRgb(myTeam.colorHex)}, 0.08)`, border: `1px solid rgba(${hexToRgb(myTeam.colorHex)}, 0.2)` }}
          >
            <TeamBadgeSVG team={myTeam} size="lg" />
            <div className="flex-1 text-center sm:text-left">
              <div className="font-display text-2xl font-black text-white">You claimed <span style={{ color: myTeam.colorHex }}>{myTeam.code}</span></div>
              <div className="text-subtle text-sm mt-1">Purse: {formatLakhs(myTeam.purseRemaining)}</div>
            </div>
            <button onClick={handleRelease} className="w-full sm:w-auto bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.1)] text-white font-bold py-3 px-6 rounded-xl transition-all text-sm">
              Release Team
            </button>
          </motion.div>
        )}

        {/* Rejection error */}
        <AnimatePresence>
          {lastRejection && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 px-5 py-4 rounded-xl text-sm font-bold text-center"
              style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#EF4444" }}
            >
              ⚠ {lastRejection}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Team Selection Grid */}
        <div className="mb-4 flex items-center justify-between">
           <h2 className="font-display text-2xl font-bold uppercase tracking-widest text-white">Select Your Franchise</h2>
           <div className="text-xs font-bold text-accent-blue bg-[rgba(0,102,255,0.1)] px-3 py-1 rounded-full">{10 - claimedCount} Available</div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-12">
          {teams.map((team) => {
            const isClaimed = !!team.ownerSessionId;
            const isMyTeam = team.code === myTeamCode;
            const isClaiming = claimingTeam === team.code;
            const canClaim = !myTeamCode && !isClaimed;

            return (
              <motion.div
                key={team.code}
                whileHover={canClaim ? { scale: 1.03, y: -2 } : undefined}
                whileTap={canClaim ? { scale: 0.98 } : undefined}
                onClick={() => canClaim && handleClaim(team.code)}
                className={`relative rounded-2xl p-5 text-center transition-all duration-300 ${canClaim ? "cursor-pointer hover:shadow-[0_8px_30px_rgba(0,0,0,0.5)] hover:border-[rgba(255,255,255,0.2)]" : "cursor-default"}`}
                style={{
                  background: isMyTeam
                    ? `rgba(${hexToRgb(team.colorHex)}, 0.15)`
                    : isClaimed
                    ? "#050505"
                    : "#0B0B0B",
                  border: isMyTeam
                    ? `2px solid ${team.colorHex}`
                    : isClaimed
                    ? "1px solid rgba(255,255,255,0.05)"
                    : "1px solid rgba(255,255,255,0.1)",
                }}
              >
                {/* Team badge */}
                <div className="flex justify-center mb-4 relative">
                  <TeamBadgeSVG team={team} size="lg" />
                  {isMyTeam && (
                    <div className="absolute inset-0 bg-white opacity-20 blur-xl rounded-full" style={{ background: team.colorHex }} />
                  )}
                </div>

                <div className="font-display text-2xl font-black text-white leading-none">{team.code}</div>
                <div className="text-muted text-[10px] mt-1 uppercase tracking-wider font-bold h-3">{team.name}</div>

                {/* Status */}
                <div className="mt-4 pt-4 border-t border-[rgba(255,255,255,0.05)]">
                  {isClaiming ? (
                    <div className="flex items-center justify-center gap-1.5 text-xs text-accent-blue font-bold uppercase tracking-wider">
                      <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Claiming
                    </div>
                  ) : isMyTeam ? (
                    <div className="text-xs font-bold uppercase tracking-widest" style={{ color: team.colorHex }}>Your Team</div>
                  ) : isClaimed ? (
                    <div className="text-xs text-subtle truncate font-medium">{team.ownerName}</div>
                  ) : (
                    <div className="text-xs text-status-success font-bold uppercase tracking-widest">Available</div>
                  )}
                </div>

                {/* Connectivity indicator */}
                {isClaimed && (
                  <div className={`absolute top-3 right-3 w-2.5 h-2.5 rounded-full border border-black ${team.isConnected ? "bg-status-success" : "bg-status-warning"}`}
                    title={team.isConnected ? "Connected" : "Disconnected"} />
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Auction Settings Preview */}
        <div className="glass-panel p-6 sm:p-8 rounded-2xl relative overflow-hidden border border-[rgba(255,255,255,0.05)]">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#0066FF] to-transparent opacity-20" />
          <h3 className="font-display text-2xl font-bold mb-6 uppercase tracking-widest">
            Configuration Details
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
             <div>
                <div className="text-[10px] text-muted uppercase tracking-widest font-bold mb-1">Total Players</div>
                <div className="text-2xl font-bold font-display text-white">{roomState.totalPlayersCount}</div>
             </div>
             <div>
                <div className="text-[10px] text-muted uppercase tracking-widest font-bold mb-1">Total Sets</div>
                <div className="text-2xl font-bold font-display text-white">{roomState.sets.length}</div>
             </div>
             <div>
                <div className="text-[10px] text-muted uppercase tracking-widest font-bold mb-1">Purse Per Team</div>
                <div className="text-2xl font-bold font-display text-accent-blue tabular-nums">{formatLakhs(roomState.timerDurationSeconds === 10 ? 12000 : 12000)}</div> {/* Assuming 120Cr default if not in state, ideally use state */}
             </div>
             <div>
                <div className="text-[10px] text-muted uppercase tracking-widest font-bold mb-1">Timer Duration</div>
                {isHost ? (
                  <div className="flex flex-wrap gap-2">
                    {[5, 10, 15, 20, 25, 30].map(s => (
                      <button 
                        key={s} 
                        onClick={() => setTimerDuration(s)}
                        className={`px-3 py-1 text-xs font-bold rounded-full transition-colors ${roomState.timerDurationSeconds === s ? "bg-[#0066FF] text-white" : "bg-[rgba(255,255,255,0.05)] text-muted hover:bg-[rgba(255,255,255,0.1)]"}`}
                      >
                        {s}s
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-2xl font-bold font-display text-white tabular-nums">{roomState.timerDurationSeconds}s</div>
                )}
             </div>
          </div>
        </div>
      </div>
      
      {/* Sticky Start Auction Footer */}
      {isHost && (
        <div className="fixed bottom-0 left-0 w-full p-4 sm:p-6 bg-[rgba(5,5,5,0.9)] backdrop-blur-xl border-t border-[rgba(255,255,255,0.1)] z-50 flex justify-center shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => hostAction("start_auction")}
            className="w-full max-w-lg rounded-xl font-display font-black text-2xl uppercase tracking-wider py-4 px-8 transition-all bg-[#0066FF] text-white shadow-[0_0_20px_rgba(0,102,255,0.4)] hover:bg-[#3B82F6]"
          >
            Start Auction Phase
          </motion.button>
        </div>
      )}
    </main>
  );
}

function hexToRgb(hex: string): string {
  if (!hex || hex.length < 7) return "255,255,255";
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}
