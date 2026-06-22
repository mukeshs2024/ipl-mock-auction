"use client";
import { useState, useEffect, useCallback, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Player, RoomState, Team } from "@/types";
import { DEFAULT_BID_SLABS } from "@/types";
import { formatLakhs } from "@/lib/utils";
import { TeamBadgeSVG } from "@/components/TeamBadge";

interface BidButtonProps {
  myTeamCode: string | null;
  teams: Record<string, Team>;
  currentBid: number;
  nextBidAmount: number;
  currentBidderTeam: string | null;
  currentPlayer: Player | null;
  roomStatus: RoomState["status"];
  onBid: (amount: number) => void;
  lastRejection: string | null;
  onClearRejection: () => void;
  onClaimTeam: (teamCode: string) => void;
}

function BidButtonComponent({
  myTeamCode,
  teams,
  currentBid,
  nextBidAmount,
  currentBidderTeam,
  currentPlayer,
  roomStatus,
  onBid,
  lastRejection,
  onClearRejection,
  onClaimTeam,
}: BidButtonProps) {
  const [pendingBid, setPendingBid] = useState(false);

  useEffect(() => {
    setPendingBid(false);
  }, [currentBid, currentBidderTeam, lastRejection]);

  const handleBid = useCallback(() => {
    if (!currentPlayer || !myTeamCode || pendingBid) return;
    setPendingBid(true);
    onClearRejection();
    onBid(nextBidAmount);
  }, [currentPlayer, myTeamCode, pendingBid, nextBidAmount, onBid, onClearRejection]);

  if (!myTeamCode) {
    // Show available teams to claim
    const vacantTeams = Object.values(teams).filter(t => !t.isConnected);
    if (vacantTeams.length === 0) {
      return (
        <div className="w-full mt-4 p-4 rounded-lg bg-[#0B0B0B] border border-[rgba(255,255,255,0.1)] text-center text-sm text-muted">
          All teams are currently occupied. You are spectating.
        </div>
      );
    }
    return (
      <div className="w-full mt-4 p-4 rounded-xl bg-[#0B0B0B] border border-[rgba(0,102,255,0.3)] shadow-xl">
        <div className="text-accent-blue font-bold text-sm mb-3 uppercase tracking-widest text-center">
          Pick a Vacant Team to Bid
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto custom-scroll pr-1">
          {vacantTeams.map(t => (
            <button
              key={t.code}
              onClick={() => onClaimTeam(t.code)}
              className="flex items-center gap-2 p-2 rounded bg-[#050505] hover:bg-[rgba(0,102,255,0.2)] transition-colors border border-transparent hover:border-[#0066FF]"
            >
              <TeamBadgeSVG team={t} size="sm" />
              <span className="text-xs font-bold text-white truncate">{t.code}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const myTeam = teams[myTeamCode];
  const isLeading = currentBidderTeam === myTeamCode;
  const actualNextBid = nextBidAmount || (currentBid === 0 ? currentPlayer?.basePrice ?? 0 : currentBid + 10);
  const canAfford = myTeam ? myTeam.purseRemaining >= actualNextBid : false;
  const isSquadFull = myTeam ? myTeam.squad.length >= 25 : false;
  const overseasCount = myTeam ? myTeam.squad.filter(p => p.isOverseas).length : 0;
  const isOverseasFull = currentPlayer?.isOverseas ? overseasCount >= 8 : false;
  
  const isDisabled = pendingBid || roomStatus !== "live" || !currentPlayer || isLeading || !canAfford || isSquadFull || isOverseasFull;

  const disabledReason = !currentPlayer
    ? "No player up for bid"
    : isLeading
    ? "You're the highest bidder"
    : isSquadFull
    ? "Squad full (Max 25)"
    : isOverseasFull
    ? "Max overseas limit (8)"
    : !canAfford
    ? `Insufficient purse`
    : roomStatus !== "live"
    ? roomStatus === "paused" ? "Auction is paused" : "Auction not live"
    : null;

  return (
    <div className="w-full mt-4 sticky bottom-4 z-50">
      <div className="flex flex-col bg-[rgba(11,11,11,0.85)] backdrop-blur-md p-3 rounded-2xl border border-[rgba(255,255,255,0.1)] shadow-2xl">
        
        {/* Small Purse display on top */}
        <div className="flex justify-between items-center mb-2 px-1">
          <span className="text-muted text-[10px] uppercase font-bold tracking-widest">Your Purse</span>
          <span className="text-accent-blue font-bold text-sm tracking-wider">{formatLakhs(myTeam?.purseRemaining ?? 0)}</span>
        </div>

        {/* Full Width Bid Button (Shorter height) */}
        <motion.button
          whileTap={!isDisabled ? { scale: 0.96 } : undefined}
          className="w-full rounded-lg font-display font-black text-xl md:text-2xl uppercase tracking-wider py-3 transition-all flex items-center justify-center"
          style={{
            background: isDisabled ? "#050505" : "#0066FF",
            color: isDisabled ? "#6B7280" : "#FFFFFF",
            border: isDisabled ? "1px solid rgba(255,255,255,0.1)" : "none",
            boxShadow: isDisabled ? "none" : "0 4px 20px rgba(0, 102, 255, 0.4)",
          }}
          onClick={handleBid}
          disabled={isDisabled}
        >
          {pendingBid ? (
            <span className="flex items-center gap-3">
              <span className="w-5 h-5 border-4 border-current border-t-transparent rounded-full animate-spin" />
              Bidding...
            </span>
          ) : isLeading ? (
            <span className="flex items-center gap-2">
              ✓ LEADING
            </span>
          ) : (
            `BID ₹${formatLakhs(actualNextBid)}`
          )}
        </motion.button>
      </div>

      <AnimatePresence>
        {(lastRejection || disabledReason) && !isLeading && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="text-status-danger text-xs font-bold text-center mt-2 bg-[rgba(239,68,68,0.1)] py-1 px-3 rounded-full mx-auto w-max border border-[rgba(239,68,68,0.2)]"
          >
            {lastRejection || disabledReason}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

export default memo(BidButtonComponent, (prev, next) => {
  return (
    prev.myTeamCode === next.myTeamCode &&
    prev.currentBid === next.currentBid &&
    prev.nextBidAmount === next.nextBidAmount &&
    prev.currentBidderTeam === next.currentBidderTeam &&
    prev.currentPlayer?.id === next.currentPlayer?.id &&
    prev.roomStatus === next.roomStatus &&
    prev.lastRejection === next.lastRejection &&
    // Check purse only since that determines if we can afford the next bid
    (prev.myTeamCode && next.myTeamCode ? prev.teams[prev.myTeamCode]?.purseRemaining === next.teams[next.myTeamCode]?.purseRemaining : true)
  );
});
