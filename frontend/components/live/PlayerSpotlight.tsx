"use client";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Player, Team } from "@/types";
import { TeamBadgeSVG } from "@/components/TeamBadge";
import { getRoleBadgeClass, formatLakhs } from "@/lib/utils";

interface PlayerSpotlightProps {
  player: Player | null;
  currentBid: number;
  currentBidderTeam: string | null;
  teams: Record<string, Team>;
  soldAnimation: boolean;
  lastSoldPlayer: Player | null;
  timerEndsAt: number | null;
  timerDurationSeconds: number;
  isPaused: boolean;
}

export default function PlayerSpotlight({
  player,
  currentBid,
  currentBidderTeam,
  teams,
  soldAnimation,
  lastSoldPlayer,
  timerEndsAt,
  timerDurationSeconds,
  isPaused,
}: PlayerSpotlightProps) {
  const bidderTeam = currentBidderTeam ? teams[currentBidderTeam] : null;

  // Timer logic embedded directly here
  const [remaining, setRemaining] = useState(timerDurationSeconds * 1000);
  const animRef = useRef<number>(0);

  useEffect(() => {
    if (!timerEndsAt || isPaused) return;
    const tick = () => {
      const r = timerEndsAt - Date.now();
      setRemaining(Math.max(0, r));
      if (r > 0) {
        animRef.current = requestAnimationFrame(tick);
      }
    };
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [timerEndsAt, isPaused]);

  const seconds = Math.max(0, Math.ceil(remaining / 1000));
  const isCritical = seconds <= 5 && seconds > 0;
  const isEmpty = seconds === 0;

  // When timer ends, or auction paused, we might want to still show a square.
  const getTimerBoxStyle = () => {
    if (isPaused) return { background: "rgba(242,183,5,0.1)", border: "1px solid #F2B705", color: "#F2B705" };
    if (isEmpty) return { background: "rgba(226,67,61,0.2)", border: "1px solid #E2433D", color: "#E2433D" };
    if (isCritical) return { background: "rgba(226,67,61,0.2)", border: "1px solid #E2433D", color: "#E2433D" };
    return { background: "rgba(31,170,89,0.1)", border: "1px solid #1FAA59", color: "#1FAA59" };
  };

  const getProgressWidth = () => {
    const totalMs = timerDurationSeconds * 1000;
    const fraction = timerEndsAt ? Math.max(0, Math.min(1, remaining / totalMs)) : 1;
    return `${fraction * 100}%`;
  };

  return (
    <div className="w-full relative">
      <AnimatePresence mode="wait">
        {soldAnimation && lastSoldPlayer ? (
          <motion.div
            key="sold"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.4 }}
            className="w-full rounded-xl p-4 flex items-center justify-between shadow-xl"
            style={{ background: "rgba(31,170,89,0.15)", border: "1px solid rgba(31,170,89,0.5)" }}
          >
            <div>
              <div className="text-white font-bold text-lg mb-1">{lastSoldPlayer.name}</div>
              <div className="flex items-center gap-2">
                <span className="font-bold px-2 py-0.5 rounded text-[10px] bg-[#1FAA59] text-white">SOLD</span>
                {lastSoldPlayer.soldTo && (
                  <span className="text-xs text-pitch-green">to {teams[lastSoldPlayer.soldTo]?.name}</span>
                )}
              </div>
            </div>
            {lastSoldPlayer.soldTo && (
              <div className="flex items-center gap-3 text-right">
                <div className="font-display text-3xl font-black text-pitch-green tabular-nums">
                  {formatLakhs(lastSoldPlayer.soldPrice!)}
                </div>
                <TeamBadgeSVG team={teams[lastSoldPlayer.soldTo]} size="md" />
              </div>
            )}
          </motion.div>
        ) : player ? (
          <motion.div
            key={player.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="w-full rounded-xl overflow-hidden shadow-xl"
            style={{ background: "rgba(16,23,42,0.8)", border: "1px solid rgba(30,45,74,0.8)" }}
          >
            {/* Top progress bar representing timer fraction */}
            {!isPaused && timerEndsAt && (
               <div className="h-1 w-full bg-stadium-border overflow-hidden">
                 <div
                   className="h-full bg-[#E2433D] transition-all duration-100 ease-linear"
                   style={{ width: getProgressWidth() }}
                 />
               </div>
            )}

            <div className="p-3 flex items-center justify-between">
              
              {/* LEFT: Player Info */}
              <div className="flex-1 min-w-0 pr-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`${getRoleBadgeClass(player.role)} text-[10px] px-1.5 py-0`}>
                    {player.role}
                  </span>
                  <span className="text-muted text-[10px] font-semibold">{player.country}</span>
                  {player.isOverseas && <span className="text-[10px]" title="Overseas">✈️</span>}
                  {player.isMarquee && <span className="text-amber-bid text-[10px]" title="Marquee">★</span>}
                </div>
                <div className="text-white font-bold text-xl md:text-2xl truncate leading-none">
                  {player.name}
                </div>
              </div>

              {/* RIGHT: Bid Info & Timer */}
              <div className="flex items-center gap-4 shrink-0">
                {/* Current Bid Area */}
                <div className="flex items-center gap-2 text-right">
                  <div className="flex flex-col">
                    <span className="text-muted text-[10px] uppercase font-bold tracking-widest leading-none mb-1">
                      {currentBid > 0 ? "BID" : "BASE"}
                    </span>
                    <span
                      className="font-display font-black text-2xl md:text-3xl leading-none tabular-nums"
                      style={{ color: currentBid > 0 ? "#1FAA59" : "#F2B705" }}
                    >
                      {currentBid > 0 ? formatLakhs(currentBid) : formatLakhs(player.basePrice)}
                    </span>
                  </div>
                  {/* Badge of highest bidder, if any */}
                  {bidderTeam && (
                    <div className="w-8 h-8 rounded ml-1 bg-[rgba(30,45,74,0.5)] flex items-center justify-center p-1">
                      <TeamBadgeSVG team={bidderTeam} size="sm" />
                    </div>
                  )}
                </div>

                {/* Compact Square Timer Box */}
                <div
                  className="w-12 h-12 rounded flex flex-col items-center justify-center transition-colors"
                  style={getTimerBoxStyle()}
                >
                  {isPaused ? (
                    <span className="text-lg font-black leading-none">⏸</span>
                  ) : (
                    <>
                      <span className="text-xl md:text-2xl font-black tabular-nums leading-none">
                        {seconds}
                      </span>
                      <span className="text-[8px] uppercase font-bold mt-0.5">sec</span>
                    </>
                  )}
                </div>
              </div>

            </div>
          </motion.div>
        ) : (
          <div className="w-full rounded-xl p-6 text-center text-subtle border border-[rgba(30,45,74,0.4)]">
            Waiting for next player...
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
