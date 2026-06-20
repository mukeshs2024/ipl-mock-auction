"use client";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Player, RoomState, Team } from "@/types";
import { DEFAULT_BID_SLABS } from "@/types";
import { formatLakhs } from "@/lib/utils";
import { TeamBadgeSVG } from "@/components/TeamBadge";

function getNextBid(currentBid: number, basePrice: number): number {
  if (currentBid === 0) return basePrice;
  const slabs = DEFAULT_BID_SLABS;
  for (const slab of slabs) {
    if (currentBid >= slab.from && currentBid < slab.to) {
      return currentBid + slab.increment;
    }
  }
  return currentBid + 100;
}

interface BidButtonProps {
  myTeamCode: string | null;
  teams: Record<string, Team>;
  currentBid: number;
  currentBidderTeam: string | null;
  currentPlayer: Player | null;
  roomStatus: RoomState["status"];
  onBid: (amount: number) => void;
  lastRejection: string | null;
  onClearRejection: () => void;
  onClaimTeam: (teamCode: string) => void;
}

export default function BidButton({
  myTeamCode,
  teams,
  currentBid,
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
    const nextBid = getNextBid(currentBid, currentPlayer.basePrice);
    setPendingBid(true);
    onClearRejection();
    onBid(nextBid);
  }, [currentPlayer, myTeamCode, pendingBid, currentBid, onBid, onClearRejection]);

  if (!myTeamCode) {
    // Show available teams to claim
    const vacantTeams = Object.values(teams).filter(t => !t.isConnected);
    if (vacantTeams.length === 0) {
      return (
        <div className="w-full mt-4 p-4 rounded-lg bg-[rgba(10,15,25,0.8)] border border-[rgba(30,45,74,0.6)] text-center text-sm text-muted">
          All teams are currently occupied. You are spectating.
        </div>
      );
    }
    return (
      <div className="w-full mt-4 p-4 rounded-xl bg-[rgba(10,15,25,0.8)] border border-[rgba(242,183,5,0.3)] shadow-xl">
        <div className="text-amber-bid font-bold text-sm mb-3 uppercase tracking-widest text-center">
          Pick a Vacant Team to Bid
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto custom-scroll pr-1">
          {vacantTeams.map(t => (
            <button
              key={t.code}
              onClick={() => onClaimTeam(t.code)}
              className="flex items-center gap-2 p-2 rounded bg-[rgba(30,45,74,0.4)] hover:bg-[rgba(242,183,5,0.2)] transition-colors border border-transparent hover:border-[#F2B705]"
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
  const nextBid = currentPlayer ? getNextBid(currentBid, currentPlayer.basePrice) : 0;
  const isLeading = currentBidderTeam === myTeamCode;
  const canAfford = myTeam ? myTeam.purseRemaining >= nextBid : false;
  const isDisabled = pendingBid || roomStatus !== "live" || !currentPlayer || isLeading || !canAfford;

  const disabledReason = !currentPlayer
    ? "No player up for bid"
    : isLeading
    ? "You're the highest bidder"
    : !canAfford
    ? `Insufficient purse`
    : roomStatus !== "live"
    ? roomStatus === "paused" ? "Auction is paused" : "Auction not live"
    : null;

  return (
    <div className="w-full mt-4">
      {/* Bid button matching the compact image */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        {/* Purse display on the left (if screen is large enough, or just stacked) */}
        <div className="shrink-0 flex items-center gap-2 bg-[rgba(10,15,25,0.6)] px-4 py-3 rounded-lg border border-[rgba(30,45,74,0.6)]">
          <span className="text-muted text-xs uppercase tracking-widest">Purse</span>
          <span className="text-amber-bid font-display font-bold text-lg leading-none">{formatLakhs(myTeam?.purseRemaining ?? 0)}</span>
        </div>

        {/* Huge orange Bid Button */}
        <motion.button
          whileTap={!isDisabled ? { scale: 0.98 } : undefined}
          className="flex-1 w-full rounded-lg font-display font-black text-2xl uppercase tracking-wider py-3 px-4 shadow-[0_0_20px_rgba(242,183,5,0.3)] transition-all"
          style={{
            background: isDisabled ? "rgba(30,45,74,0.4)" : "linear-gradient(135deg, #FF9900 0%, #F2B705 100%)",
            color: isDisabled ? "rgba(200,214,240,0.4)" : "#0B0F19",
            border: isDisabled ? "1px solid rgba(30,45,74,0.6)" : "none",
          }}
          onClick={handleBid}
          disabled={isDisabled}
        >
          {pendingBid ? (
            <span className="flex items-center justify-center gap-2 text-xl">
              <span className="w-5 h-5 border-4 border-current border-t-transparent rounded-full animate-spin" />
              Bidding...
            </span>
          ) : isLeading ? (
            <span className="flex items-center justify-center gap-2">
              ✓ LEADING
            </span>
          ) : (
            `BID (+${formatLakhs(nextBid - currentBid)})`
          )}
        </motion.button>
      </div>

      <AnimatePresence>
        {(lastRejection || disabledReason) && !isLeading && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="text-crimson-hot text-xs text-center mt-2"
          >
            {lastRejection || disabledReason}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
