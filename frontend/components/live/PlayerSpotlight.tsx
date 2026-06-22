"use client";
import { useEffect, useRef, memo } from "react";
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
  isSoundEnabled: boolean;
}

function PlayerSpotlightComponent({
  player,
  currentBid,
  currentBidderTeam,
  teams,
  soldAnimation,
  lastSoldPlayer,
  timerEndsAt,
  timerDurationSeconds,
  isPaused,
  isSoundEnabled,
}: PlayerSpotlightProps) {
  const bidderTeam = currentBidderTeam ? teams[currentBidderTeam] : null;

  // Refs for direct DOM manipulation to bypass React state updates for 60fps timer
  const animRef = useRef<number>(0);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const timerBoxRef = useRef<HTMLDivElement>(null);
  const timerTextRef = useRef<HTMLSpanElement>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const prevSecondsRef = useRef<number | null>(null);

  useEffect(() => {
    const initAudio = () => {
      if (!audioCtxRef.current) {
        try {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContextClass) audioCtxRef.current = new AudioContextClass();
        } catch (e) {}
      }
    };
    window.addEventListener('click', initAudio, { once: true });
    window.addEventListener('keydown', initAudio, { once: true });
    return () => {
      window.removeEventListener('click', initAudio);
      window.removeEventListener('keydown', initAudio);
    };
  }, []);

  const playBeep = () => {
    if (!audioCtxRef.current || !isSoundEnabled) return;
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();
    
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
    
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
    gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  };

  useEffect(() => {
    if (!timerEndsAt || isPaused) return;
    
    const totalMs = timerDurationSeconds * 1000;
    
    const tick = () => {
      const remaining = Math.max(0, timerEndsAt - Date.now());
      const fraction = timerEndsAt ? Math.max(0, Math.min(1, remaining / totalMs)) : 1;
      const seconds = Math.max(0, Math.ceil(remaining / 1000));
      const isEmpty = seconds === 0;
      const isCritical = seconds <= 5 && seconds > 0;
      
      if (progressBarRef.current) {
        progressBarRef.current.style.width = `${fraction * 100}%`;
      }
      
      if (timerBoxRef.current) {
        if (isEmpty || isCritical) {
          timerBoxRef.current.style.background = "rgba(239, 68, 68, 0.1)";
          timerBoxRef.current.style.border = "1px solid #EF4444";
          timerBoxRef.current.style.color = "#EF4444";
        } else {
          timerBoxRef.current.style.background = "rgba(34, 197, 94, 0.1)";
          timerBoxRef.current.style.border = "1px solid #22C55E";
          timerBoxRef.current.style.color = "#22C55E";
        }
      }
      
      if (timerTextRef.current) {
        timerTextRef.current.textContent = seconds.toString();
      }

      if (seconds !== prevSecondsRef.current) {
        if (prevSecondsRef.current !== null && isCritical) {
          playBeep();
        }
        prevSecondsRef.current = seconds;
      }

      if (remaining > 0) {
        animRef.current = requestAnimationFrame(tick);
      }
    };
    
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [timerEndsAt, timerDurationSeconds, isPaused]);

  // Initial calculations for first render
  const initRemaining = timerEndsAt ? Math.max(0, timerEndsAt - Date.now()) : timerDurationSeconds * 1000;
  const initSeconds = Math.max(0, Math.ceil(initRemaining / 1000));
  const initFraction = timerEndsAt ? Math.max(0, Math.min(1, initRemaining / (timerDurationSeconds * 1000))) : 1;
  const initIsCritical = initSeconds <= 5 && initSeconds > 0;
  const initIsEmpty = initSeconds === 0;

  const getTimerBoxStyle = () => {
    if (isPaused) return { background: "rgba(245, 158, 11, 0.1)", border: "1px solid #F59E0B", color: "#F59E0B" };
    if (initIsEmpty || initIsCritical) return { background: "rgba(239, 68, 68, 0.1)", border: "1px solid #EF4444", color: "#EF4444" };
    return { background: "rgba(34, 197, 94, 0.1)", border: "1px solid #22C55E", color: "#22C55E" };
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
            transition={{ duration: 0.25 }}
            className="w-full rounded-xl p-4 flex items-center justify-between shadow-xl"
            style={{ background: "rgba(34, 197, 94, 0.15)", border: "1px solid rgba(34, 197, 94, 0.5)" }}
          >
            <div>
              <div className="text-white font-bold text-lg mb-1">{lastSoldPlayer.name}</div>
              <div className="flex items-center gap-2">
                <span className="font-bold px-2 py-0.5 rounded text-[10px] bg-[#22C55E] text-white">SOLD</span>
                {lastSoldPlayer.soldTo && (
                  <span className="text-xs text-status-success">to {teams[lastSoldPlayer.soldTo]?.name}</span>
                )}
              </div>
            </div>
            {lastSoldPlayer.soldTo && (
              <div className="flex items-center gap-3 text-right">
                <div className="font-display text-3xl font-black text-status-success tabular-nums">
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
            style={{ background: "#0B0B0B", border: "1px solid rgba(255, 255, 255, 0.1)" }}
          >
            {/* Top progress bar representing timer fraction */}
            {!isPaused && timerEndsAt && (
               <div className="h-1 w-full bg-[#1E2D4A] overflow-hidden">
                 <div
                   ref={progressBarRef}
                   className="h-full bg-[#0066FF] transition-all duration-100 ease-linear"
                   style={{ width: `${initFraction * 100}%` }}
                 />
               </div>
            )}

            <div className="p-4 flex items-center justify-between">
              
              {/* LEFT: Player Info */}
              <div className="flex-1 min-w-0 pr-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`${getRoleBadgeClass(player.role)} text-[10px] px-1.5 py-0`}>
                     {player.role}
                  </span>
                  <span className="text-muted text-[10px] font-semibold">{player.country}</span>
                  {player.isOverseas && <span className="text-[10px]" title="Overseas">✈️</span>}
                  {player.isMarquee && <span className="text-accent-blue text-[10px]" title="Marquee">★</span>}
                </div>
                <div className="text-white font-bold text-xl md:text-2xl truncate leading-tight">
                  {player.name}
                </div>
              </div>

              {/* RIGHT: Bid Info & Timer */}
              <div className="flex items-center gap-4 shrink-0">
                {/* Current Bid Area */}
                <div className="flex flex-col items-end text-right mr-2">
                  <span className="text-muted text-[10px] uppercase font-bold tracking-widest leading-none mb-1">
                    {currentBid > 0 ? "CURRENT BID" : "BASE PRICE"}
                  </span>
                  <span
                    className="font-display font-black text-2xl md:text-3xl leading-none tabular-nums"
                    style={{ color: currentBid > 0 ? "#22C55E" : "#0066FF" }}
                  >
                    {currentBid > 0 ? formatLakhs(currentBid) : formatLakhs(player.basePrice)}
                  </span>
                  {/* Separate Prominent Highest Bidder Box */}
                  {bidderTeam && (
                     <div className="flex items-center gap-1.5 mt-1.5 bg-[#050505] border border-[#22C55E] rounded px-2 py-1 shadow-[0_0_10px_rgba(34,197,94,0.2)] max-w-[120px] md:max-w-[160px]">
                       <div className="shrink-0"><TeamBadgeSVG team={bidderTeam} size="sm" /></div>
                       <span className="text-[10px] md:text-xs font-bold text-white uppercase tracking-wider truncate">{bidderTeam.code}</span>
                     </div>
                  )}
                </div>

                {/* Compact Square Timer Box */}
                <div
                  ref={timerBoxRef}
                  className="w-12 h-12 rounded flex flex-col items-center justify-center transition-colors"
                  style={getTimerBoxStyle()}
                >
                  {isPaused ? (
                    <span className="text-lg font-black leading-none text-status-warning">⏸</span>
                  ) : (
                    <>
                      <span ref={timerTextRef} className="text-xl md:text-2xl font-black tabular-nums leading-none">
                        {initSeconds}
                      </span>
                      <span className="text-[8px] uppercase font-bold mt-0.5">sec</span>
                    </>
                  )}
                </div>
              </div>

            </div>
          </motion.div>
        ) : (
          <div className="w-full rounded-xl p-6 text-center text-subtle border border-[rgba(255,255,255,0.1)] bg-[#0B0B0B]">
            Waiting for next player...
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default memo(PlayerSpotlightComponent, (prev, next) => {
  return (
    prev.player?.id === next.player?.id &&
    prev.currentBid === next.currentBid &&
    prev.currentBidderTeam === next.currentBidderTeam &&
    prev.soldAnimation === next.soldAnimation &&
    prev.lastSoldPlayer?.id === next.lastSoldPlayer?.id &&
    prev.timerEndsAt === next.timerEndsAt &&
    prev.timerDurationSeconds === next.timerDurationSeconds &&
    prev.isPaused === next.isPaused &&
    prev.isSoundEnabled === next.isSoundEnabled
  );
});
