"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuctionSocket } from "@/lib/use-auction-socket";
import { Player } from "@/types";
import PlayerSpotlight from "@/components/live/PlayerSpotlight";
import BidButton from "@/components/live/BidButton";
import TeamPurseGrid from "@/components/live/TeamPurseGrid";
import ActivityFeed from "@/components/live/ActivityFeed";
import PlayerRails from "@/components/live/PlayerRails";
import HostPanel from "@/components/live/HostPanel";

export default function LivePage({ params }: { params: { roomCode: string } }) {
  const { roomCode } = params;
  const router = useRouter();

  const {
    roomState,
    isConnected,
    sessionId,
    isHost,
    myTeamCode,
    lastRejection,
    bid,
    claimTeam,
    hostAction,
    extendTimer,
    setTimerDuration,
    kickUser,
    reassignTeam,
    editPurse,
    clearRejection,
    sendChat,
  } = useAuctionSocket(roomCode);

  const [activeTab, setActiveTab] = useState<"activity" | "players" | "teams" | "host">("activity");

  // Track previous player for SOLD animation
  const [soldAnimation, setSoldAnimation] = useState(false);
  const [lastSoldPlayer, setLastSoldPlayer] = useState<Player | null>(null);
  const prevSoldCountRef = useRef(0);

  // Detect when a player gets sold (soldPlayers count increases)
  useEffect(() => {
    if (!roomState) return;
    const newSoldCount = roomState.soldPlayers.length;
    if (newSoldCount > prevSoldCountRef.current) {
      const justSold = roomState.soldPlayers[newSoldCount - 1];
      setLastSoldPlayer(justSold);
      setSoldAnimation(true);
      const t = setTimeout(() => setSoldAnimation(false), 2500);
      prevSoldCountRef.current = newSoldCount;
      return () => clearTimeout(t);
    }
    prevSoldCountRef.current = newSoldCount;
  }, [roomState?.soldPlayers.length]);

  // Redirect to lobby if in lobby state, summary if ended
  useEffect(() => {
    if (roomState?.status === "lobby") {
      router.push(`/room/${roomCode}/lobby`);
    }
    if (roomState?.status === "ended") {
      router.push(`/room/${roomCode}/summary`);
    }
  }, [roomState?.status, roomCode, router]);

  // If host tab is selected but user is no longer host, revert to activity
  useEffect(() => {
    if (activeTab === "host" && !isHost) {
      setActiveTab("activity");
    }
  }, [isHost, activeTab]);

  if (!roomState) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#F2B705] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-subtle">Connecting to live auction...</p>
          {!isConnected && <p className="text-crimson-hot text-sm mt-2">Reconnecting...</p>}
        </div>
      </main>
    );
  }

  const isPaused = roomState.status === "paused";
  const isLive = roomState.status === "live";

  return (
    <main className="min-h-screen flex flex-col" style={{ background: "#0B0F19" }}>
      {/* ── Top status bar ── */}
      <div className="shrink-0 px-4 py-3 flex items-center justify-between"
        style={{ background: "rgba(10,15,25,0.9)", borderBottom: "1px solid rgba(30,45,74,0.6)", backdropFilter: "blur(12px)" }}>
        
        <div className="flex items-center gap-3">
          <div className={`status-dot ${isPaused ? "status-paused" : "status-live"}`} />
          <span className="font-display text-sm font-bold tracking-widest uppercase text-white">
            {isPaused ? "PAUSED" : "LIVE AUCTION"}
          </span>
          <span className="text-muted text-xs hidden sm:block">· Room {roomCode}</span>
          <button 
            onClick={() => {
              navigator.clipboard.writeText(`${window.location.origin}/join`);
              alert(`Share this code to join: ${roomCode}`);
            }}
            className="ml-2 bg-[rgba(242,183,5,0.1)] text-[#F2B705] hover:bg-[rgba(242,183,5,0.2)] px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-colors"
          >
            Copy Invite
          </button>
        </div>

        <div className="flex items-center gap-4">
          {/* Progress */}
          <div className="hidden sm:flex items-center gap-2 text-sm">
            <span className="text-pitch-green font-bold">{roomState.soldPlayersCount}</span>
            <span className="text-muted">/</span>
            <span className="text-white">{roomState.totalPlayersCount}</span>
            <span className="text-muted text-xs">sold</span>
          </div>
          {/* Set indicator */}
          <div className="text-xs text-muted hidden md:block">
            Set {roomState.currentSetIndex + 1}/{roomState.sets.length}:
            <span className="text-white ml-1">{roomState.sets[roomState.currentSetIndex]}</span>
          </div>
          {/* Connection indicator */}
          <div className={`text-xs ${isConnected ? "text-pitch-green" : "text-crimson-hot"}`}>
            {isConnected ? "●" : "◌ Reconnecting"}
          </div>
        </div>
      </div>

      {/* ── Main layout (Single Column Mobile-First) ── */}
      <div className="flex-1 flex flex-col overflow-y-auto custom-scroll w-full max-w-md mx-auto px-4 py-6">
        
        {/* ── HOST AUCTION FLOW CONTROLS (Top of Bid Process) ── */}
        {isHost && (
          <div className="w-full flex gap-2 mb-4 p-2 rounded-lg" style={{ background: "rgba(30,45,74,0.3)", border: "1px solid rgba(242,183,5,0.3)" }}>
            {isLive && (
              <button className="flex-1 btn-secondary text-xs py-2" onClick={() => hostAction("pause_auction")}>
                ⏸ Pause
              </button>
            )}
            {isPaused && (
              <button className="flex-1 btn-primary text-xs py-2" onClick={() => hostAction("resume_auction")}>
                ▶️ Resume
              </button>
            )}
            {(isLive || isPaused) && (
              <button className="flex-1 btn-secondary text-xs py-2" onClick={() => hostAction("skip_player")}>
                ⏭ Skip
              </button>
            )}
            <button className="flex-1 btn-danger text-xs py-2" onClick={() => { if (confirm("End the auction now?")) hostAction("end_auction"); }}>
              🏁 End
            </button>
          </div>
        )}

        {/* ── CENTER STAGE (Bid Process) ── */}
        <div className="w-full flex flex-col items-center justify-start mb-6">
          
          <div className="w-full max-w-md mb-2">
            <PlayerSpotlight
              player={roomState.currentPlayer}
              currentBid={roomState.currentBid}
              currentBidderTeam={roomState.currentBidderTeam}
              teams={roomState.teams}
              soldAnimation={soldAnimation}
              lastSoldPlayer={lastSoldPlayer}
              timerEndsAt={roomState.timerEndsAt}
              timerDurationSeconds={roomState.timerDurationSeconds}
              isPaused={isPaused}
            />
          </div>

          <div className="w-full max-w-md">
            <BidButton
              myTeamCode={myTeamCode}
              teams={roomState.teams}
              currentBid={roomState.currentBid}
              currentBidderTeam={roomState.currentBidderTeam}
              currentPlayer={roomState.currentPlayer}
              roomStatus={roomState.status}
              onBid={bid}
              lastRejection={lastRejection}
              onClearRejection={clearRejection}
              onClaimTeam={claimTeam}
            />
          </div>

          {/* Paused overlay notice */}
          <AnimatePresence>
            {isPaused && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-4 text-center py-3 px-6 rounded-xl w-full max-w-md"
                style={{ background: "rgba(242,183,5,0.08)", border: "1px solid rgba(242,183,5,0.3)" }}
              >
                <span className="text-amber-bid font-semibold text-sm">⏸ Auction is paused by the host</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── TABS NAVIGATION ── */}
        <div className="flex overflow-x-auto custom-scroll mb-4 border-b border-[rgba(30,45,74,0.6)]">
          <button
            onClick={() => setActiveTab("activity")}
            className={`px-4 py-3 text-xs font-bold uppercase tracking-wide whitespace-nowrap transition-colors ${activeTab === "activity" ? "text-amber-bid border-b-2 border-amber-bid" : "text-muted hover:text-white"}`}
          >
            Activity Feed
          </button>
          <button
            onClick={() => setActiveTab("teams")}
            className={`px-4 py-3 text-xs font-bold uppercase tracking-wide whitespace-nowrap transition-colors ${activeTab === "teams" ? "text-amber-bid border-b-2 border-amber-bid" : "text-muted hover:text-white"}`}
          >
            Teams
          </button>
          <button
            onClick={() => setActiveTab("players")}
            className={`px-4 py-3 text-xs font-bold uppercase tracking-wide whitespace-nowrap transition-colors ${activeTab === "players" ? "text-amber-bid border-b-2 border-amber-bid" : "text-muted hover:text-white"}`}
          >
            Players
          </button>
          {isHost && (
            <button
              onClick={() => setActiveTab("host")}
              className={`px-4 py-3 text-xs font-bold uppercase tracking-wide whitespace-nowrap transition-colors ${activeTab === "host" ? "text-amber-bid border-b-2 border-amber-bid" : "text-muted hover:text-white"}`}
            >
              Host Settings
            </button>
          )}
        </div>

        {/* ── TAB CONTENT ── */}
        <div className="flex-1 w-full pb-10">
          {activeTab === "activity" && (
            <div className="p-4 rounded-xl h-[400px] overflow-hidden flex flex-col" style={{ background: "rgba(10,15,25,0.5)", border: "1px solid rgba(30,45,74,0.4)" }}>
              <ActivityFeed entries={roomState.activityLog} onSendChat={sendChat} />
            </div>
          )}
          
          {activeTab === "teams" && (
            <div className="p-4 rounded-xl" style={{ background: "rgba(10,15,25,0.5)", border: "1px solid rgba(30,45,74,0.4)" }}>
              <TeamPurseGrid
                teams={roomState.teams}
                currentBidderTeam={roomState.currentBidderTeam}
                myTeamCode={myTeamCode}
                isHost={isHost}
                onKickUser={kickUser}
              />
            </div>
          )}
          
          {activeTab === "players" && (
            <div className="p-4 rounded-xl" style={{ background: "rgba(10,15,25,0.5)", border: "1px solid rgba(30,45,74,0.4)" }}>
              <PlayerRails state={roomState} />
            </div>
          )}
          
          {activeTab === "host" && isHost && (
            <div className="w-full">
              <HostPanel
                state={roomState}
                onHostAction={hostAction}
                onExtendTimer={extendTimer}
                onSetTimerDuration={setTimerDuration}
                onKickUser={kickUser}
                onReassignTeam={reassignTeam}
                onEditPurse={editPurse}
              />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
