"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useAuctionSocket } from "@/lib/use-auction-socket";
import { useAuctionHistory } from "@/lib/use-auction-history";
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

  const { updateHistory } = useAuctionHistory();

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
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("ipl_sound_enabled");
    if (saved !== null) setIsSoundEnabled(saved === "true");
  }, []);

  const toggleSound = () => {
    setIsSoundEnabled((prev) => {
      const next = !prev;
      localStorage.setItem("ipl_sound_enabled", String(next));
      return next;
    });
  };

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

  // Update local history
  useEffect(() => {
    if (roomState?.status && roomCode) {
      updateHistory({
        roomCode,
        teamCode: myTeamCode,
        status: roomState.status,
      });
    }
  }, [roomState?.status, roomCode, myTeamCode, updateHistory]);

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
      <main className="min-h-screen flex items-center justify-center bg-[#000000]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#0066FF] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-subtle">Connecting to premium auction engine...</p>
          {!isConnected && <p className="text-[#EF4444] text-sm mt-2 font-bold">Reconnecting...</p>}
        </div>
      </main>
    );
  }

  const isPaused = roomState.status === "paused";
  const isLive = roomState.status === "live";

  return (
    <main className="min-h-screen flex flex-col bg-[#000000] overflow-x-hidden">
      {/* ── Top status bar ── */}
      <div className="shrink-0 px-4 py-3 flex items-center justify-between sticky top-0 z-[100]"
        style={{ background: "rgba(5,5,5,0.85)", borderBottom: "1px solid rgba(255,255,255,0.05)", backdropFilter: "blur(12px)" }}>
        
        <div className="flex items-center gap-3">
          <div className={`status-dot ${isPaused ? "status-paused" : "status-live"}`} />
          <span className="font-display text-sm sm:text-base font-bold tracking-widest uppercase text-white leading-none">
            {isPaused ? "PAUSED" : "LIVE AUCTION"}
          </span>
          <span className="text-muted text-xs hidden sm:block border-l border-[rgba(255,255,255,0.1)] pl-3">Room <span className="font-mono text-accent-blue font-bold">{roomCode}</span></span>
        </div>

        <div className="flex items-center gap-4">
          {/* Progress */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest bg-[#050505] px-3 py-1.5 rounded-md border border-[rgba(255,255,255,0.05)]">
            <span className="text-status-success">{roomState.soldPlayersCount}</span>
            <span className="text-muted">/</span>
            <span className="text-white">{roomState.totalPlayersCount}</span>
            <span className="text-muted ml-1">Sold</span>
          </div>
          {/* Set indicator */}
          <div className="text-[10px] text-muted hidden md:flex items-center gap-2 font-bold uppercase tracking-widest bg-[#050505] px-3 py-1.5 rounded-md border border-[rgba(255,255,255,0.05)]">
            Set {roomState.currentSetIndex + 1}/{roomState.sets.length}:
            <span className="text-accent-blue">{roomState.sets[roomState.currentSetIndex]}</span>
          </div>
          {/* Connection indicator */}
          <div className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 ${isConnected ? "text-status-success" : "text-status-danger"}`}>
            <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-status-success" : "bg-status-danger animate-pulse"}`} />
            {isConnected ? "Live" : "Reconnecting"}
          </div>
          <button onClick={toggleSound} className="text-xl ml-2 hover:scale-110 transition-transform" title={isSoundEnabled ? "Mute Timer" : "Unmute Timer"}>
             {isSoundEnabled ? "🔊" : "🔇"}
          </button>
        </div>
      </div>

      {/* ── Main layout (Single Column Mobile-First) ── */}
      <div className="flex-1 flex flex-col w-full max-w-lg mx-auto pb-4 relative z-10">
        
        {/* ── TOP ACTION BAR (Home, Invite, Host Controls) ── */}
        <div className="w-full flex flex-col md:flex-row gap-3 p-4">
          <div className="flex w-full md:w-auto gap-3">
            <button 
              onClick={() => window.location.href = "/"} 
              className="flex-1 md:flex-none bg-[#050505] border border-[rgba(255,255,255,0.1)] text-white text-xs font-bold uppercase tracking-widest py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 hover:bg-[rgba(255,255,255,0.05)] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Home
            </button>
            <button 
              onClick={() => {
                const inviteUrl = `${window.location.origin}/join?code=${roomCode}`;
                navigator.clipboard.writeText(inviteUrl);
                alert(`Invite link copied to clipboard!\n\n${inviteUrl}`);
              }}
              className="flex-1 md:flex-none bg-[#050505] border border-[rgba(255,255,255,0.1)] text-white text-xs font-bold uppercase tracking-widest py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 hover:bg-[rgba(255,255,255,0.05)] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Invite
            </button>
          </div>

          {isHost && (
            <div className="flex w-full md:flex-1 gap-2 p-1.5 rounded-xl bg-[#0B0B0B] border border-[rgba(0,102,255,0.3)] shadow-[0_0_15px_rgba(0,102,255,0.1)]">
              {isLive && (
                <button className="flex-1 bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] text-white text-[10px] font-bold uppercase tracking-widest py-2 px-2 rounded-lg transition-colors" onClick={() => hostAction("pause_auction")}>
                  ⏸ Pause
                </button>
              )}
              {isPaused && (
                <button className="flex-1 bg-[#0066FF] hover:bg-[#3B82F6] text-white text-[10px] font-bold uppercase tracking-widest py-2 px-2 rounded-lg shadow-[0_0_10px_rgba(0,102,255,0.3)] transition-colors" onClick={() => hostAction("resume_auction")}>
                  ▶️ Resume
                </button>
              )}
              {(isLive || isPaused) && (
                <button className="flex-1 bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] text-white text-[10px] font-bold uppercase tracking-widest py-2 px-2 rounded-lg transition-colors" onClick={() => hostAction("skip_player")}>
                  ⏭ Skip
                </button>
              )}
              <button className="flex-1 bg-[rgba(239,68,68,0.1)] hover:bg-[#EF4444] text-[#EF4444] hover:text-white border border-[rgba(239,68,68,0.2)] text-[10px] font-bold uppercase tracking-widest py-2 px-2 rounded-lg transition-colors" onClick={() => { if (confirm("End the auction now?")) hostAction("end_auction"); }}>
                🏁 End
              </button>
            </div>
          )}
        </div>

        {/* ── CENTER STAGE (Bid Process) ── */}
        <div className="w-full flex flex-col items-center justify-start px-4 mb-2">
          
          <div className="w-full relative">
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
              isSoundEnabled={isSoundEnabled}
            />
          </div>

          <div className="w-full">
            <BidButton
              myTeamCode={myTeamCode}
              teams={roomState.teams}
              currentBid={roomState.currentBid}
              nextBidAmount={roomState.nextBidAmount}
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
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="mt-4 text-center py-3 px-6 rounded-xl w-full"
                style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)" }}
              >
                <span className="text-status-warning font-bold text-sm uppercase tracking-widest">⏸ Auction Paused by Host</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── TABS NAVIGATION ── */}
        <div className="flex overflow-x-auto custom-scroll mx-4 mt-6 mb-4 border-b border-[rgba(255,255,255,0.05)] bg-[#050505] rounded-t-xl sticky top-[53px] z-[90]">
          {[
            { id: "activity", label: "Feed" },
            { id: "teams", label: "Teams" },
            { id: "players", label: "Players" },
            ...(isHost ? [{ id: "host", label: "Host" }] : []),
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 px-4 py-3.5 text-xs font-bold uppercase tracking-widest whitespace-nowrap transition-colors relative ${activeTab === tab.id ? "text-accent-blue" : "text-muted hover:text-white"}`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <motion.div 
                  layoutId="activeTabIndicator" 
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-blue shadow-[0_-2px_10px_rgba(0,102,255,0.5)]" 
                />
              )}
            </button>
          ))}
        </div>

        {/* ── TAB CONTENT ── */}
        <div className="flex-1 w-full px-4 pb-6 relative z-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="w-full"
            >
              {activeTab === "activity" && (
                <div className="rounded-xl overflow-hidden h-[450px] flex flex-col bg-[#050505] border border-[rgba(255,255,255,0.05)] shadow-lg relative">
                   <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#0066FF] to-transparent opacity-20" />
                   <ActivityFeed entries={roomState.activityLog} onSendChat={sendChat} />
                </div>
              )}
              
              {activeTab === "teams" && (
                <div className="rounded-xl overflow-hidden flex flex-col">
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
                <div className="p-4 rounded-xl bg-[#050505] border border-[rgba(255,255,255,0.05)] shadow-lg relative">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#0066FF] to-transparent opacity-20" />
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
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </main>
  );
}
