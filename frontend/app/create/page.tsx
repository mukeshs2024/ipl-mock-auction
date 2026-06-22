"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { v4 as uuidv4 } from "uuid";

type Step = "info" | "settings";

function formatLakhsClient(lakhs: number): string {
  if (lakhs >= 100) {
    const cr = lakhs / 100;
    return `₹${cr % 1 === 0 ? cr : cr.toFixed(2)} Cr`;
  }
  return `₹${lakhs} L`;
}

export default function CreatePage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>("info");
  const [hostName, setHostName] = useState("");
  const [pursePerTeam, setPursePerTeam] = useState(12000); // 120 Cr default
  const [timerSeconds, setTimerSeconds] = useState(10);
  const [reunsoldEnabled, setResunsoldEnabled] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [error, setError] = useState("");

  const sessionId = useRef(uuidv4());

  const handleCreate = async () => {
    setError("");

    const hostToken = uuidv4();
    const sid = sessionId.current;

    // Store session info in cookies
    document.cookie = `sessionId=${sid}; path=/; max-age=86400`;
    document.cookie = `hostToken=${hostToken}; path=/; max-age=86400`;
    document.cookie = `displayName=${encodeURIComponent(hostName)}; path=/; max-age=86400`;

    // Immediately start an exit animation to make it feel faster
    document.body.style.opacity = "0.5";
    document.body.style.transition = "opacity 0.3s";

    try {
      const res = await fetch(`${(process.env.NEXT_PUBLIC_API_URL || "https://ipl-mock-auction-3aqu.onrender.com").replace(/\/$/, "")}/api/create-room`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hostName,
          hostSessionId: sid,
          hostToken,
          pursePerTeam,
          timerDurationSeconds: timerSeconds,
          reunsoldPhaseEnabled: reunsoldEnabled,
          isPublic,
        }),
      });

      if (!res.ok) throw new Error("Failed to create room");

      const { roomCode } = await res.json();
      document.cookie = `roomCode=${roomCode}; path=/; max-age=86400`;
      
      document.body.style.opacity = "1";
      router.push(`/room/${roomCode}/lobby`);
    } catch (err: any) {
      document.body.style.opacity = "1";
      setError(err.message || "Failed to connect to server. Is it running?");
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12 bg-[#000000]">
      <div className="w-full max-w-2xl relative z-10">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <a href="/" className="text-muted text-sm hover:text-white transition-colors flex items-center gap-2 mb-6 w-max border border-[rgba(255,255,255,0.1)] px-4 py-2 rounded-full bg-[#050505]">
            ← Back to Home
          </a>
          <h1 className="font-display text-5xl font-black uppercase tracking-tight">
            <span className="text-[#0066FF]" style={{ textShadow: "0 0 20px rgba(0,102,255,0.4)" }}>Create</span> Auction
          </h1>
          <p className="text-subtle mt-2 font-medium">Configure your premium mock auction room</p>
        </motion.div>

        {/* Step progress */}
        <div className="flex items-center gap-3 mb-10">
          {["info", "settings"].map((s, i) => {
            const isActive = step === s;
            const isPast = ["info", "settings"].indexOf(step) > i;
            return (
              <div key={s} className="flex items-center gap-3 flex-1 last:flex-none">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all shadow-lg ${
                  isActive ? "bg-[#0066FF] text-white shadow-[0_0_15px_rgba(0,102,255,0.5)] border-2 border-[rgba(255,255,255,0.2)]" :
                  isPast ? "bg-[#22C55E] text-white" :
                  "bg-[#050505] text-muted border border-[rgba(255,255,255,0.1)]"
                }`}>
                  {isPast ? "✓" : i + 1}
                </div>
                {i < 1 && (
                  <div className="flex-1 h-1 rounded-full bg-[#050505] overflow-hidden border border-[rgba(255,255,255,0.05)]">
                    <div className="h-full bg-[#0066FF] transition-all duration-500" style={{ width: isPast ? "100%" : "0%" }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          {/* STEP 1: Host info */}
          {step === "info" && (
            <motion.div key="info" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="glass-panel p-8 sm:p-10">
              <h2 className="font-display text-3xl font-bold mb-8 uppercase text-white">Your Identity</h2>
              <div className="mb-8">
                <label className="block text-accent-blue text-xs font-bold uppercase tracking-widest mb-2">Host Display Name</label>
                <input
                  className="w-full bg-[#050505] border border-[rgba(255,255,255,0.1)] focus:border-[#0066FF] text-white px-5 py-4 rounded-xl text-lg outline-none transition-all focus:shadow-[0_0_0_3px_rgba(0,102,255,0.2)]"
                  placeholder="e.g. Commissioner Shah"
                  value={hostName}
                  onChange={(e) => setHostName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && hostName.trim() && setStep("settings")}
                  autoFocus
                />
              </div>
              <button
                className="w-full bg-[#0066FF] text-white font-bold text-lg py-4 rounded-xl shadow-[0_4px_20px_rgba(0,102,255,0.3)] hover:bg-[#3B82F6] hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:shadow-none"
                onClick={() => setStep("settings")}
                disabled={!hostName.trim()}
              >
                Configure Settings →
              </button>
            </motion.div>
          )}

          {/* STEP 2: Settings */}
          {step === "settings" && (
            <motion.div key="settings" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="glass-panel p-8 sm:p-10">
              <h2 className="font-display text-3xl font-bold mb-8 uppercase text-white">Room Settings</h2>

              <div className="space-y-8">
                {/* Purse */}
                <div className="bg-[#050505] p-5 rounded-xl border border-[rgba(255,255,255,0.05)]">
                  <label className="block text-accent-blue text-xs font-bold uppercase tracking-widest mb-4">Purse per team</label>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <input
                      type="number"
                      className="w-full sm:w-1/2 bg-[#000000] border border-[rgba(255,255,255,0.1)] focus:border-[#0066FF] text-white px-4 py-3 rounded-lg text-lg outline-none transition-all focus:shadow-[0_0_0_2px_rgba(0,102,255,0.2)]"
                      value={pursePerTeam}
                      min={100}
                      max={100000}
                      onChange={(e) => setPursePerTeam(Number(e.target.value))}
                    />
                    <div className="flex-1 bg-[rgba(0,102,255,0.1)] border border-[rgba(0,102,255,0.2)] px-4 py-3 rounded-lg text-center">
                      <span className="text-[#0066FF] font-display text-2xl font-bold tabular-nums">
                        {formatLakhsClient(pursePerTeam)}
                      </span>
                    </div>
                  </div>
                  <p className="text-muted text-[10px] uppercase font-bold tracking-wider mt-3">Enter in Lakhs (Default: 12,000 = ₹120 Cr)</p>
                </div>

                {/* Timer */}
                <div className="bg-[#050505] p-5 rounded-xl border border-[rgba(255,255,255,0.05)]">
                  <label className="block text-accent-blue text-xs font-bold uppercase tracking-widest mb-4">Timer per player</label>
                  <div className="flex items-center gap-6">
                    <input
                      type="range"
                      min={5}
                      max={120}
                      value={timerSeconds}
                      onChange={(e) => setTimerSeconds(Number(e.target.value))}
                      className="flex-1 h-2 bg-[#1E2D4A] rounded-lg appearance-none cursor-pointer accent-[#0066FF]"
                    />
                    <div className="bg-[rgba(255,255,255,0.05)] px-4 py-2 rounded-lg min-w-[80px] text-center border border-[rgba(255,255,255,0.1)]">
                      <span className="font-display text-2xl font-bold text-white tabular-nums">{timerSeconds}s</span>
                    </div>
                  </div>
                </div>

                {/* Room Type */}
                <div className="bg-[#050505] p-5 rounded-xl border border-[rgba(255,255,255,0.05)]">
                  <label className="block text-accent-blue text-xs font-bold uppercase tracking-widest mb-4">Room Type</label>
                  <div className="flex gap-4">
                    <button
                      onClick={() => setIsPublic(false)}
                      className={`flex-1 p-4 rounded-xl border-2 transition-all duration-300 flex flex-col items-center justify-center gap-2 ${!isPublic ? "border-[#0066FF] bg-[rgba(0,102,255,0.05)] text-white shadow-[0_0_15px_rgba(0,102,255,0.2)]" : "border-[rgba(255,255,255,0.05)] text-muted hover:border-[rgba(255,255,255,0.1)]"}`}
                    >
                      <div className="text-2xl">🔒</div>
                      <div className="font-bold text-sm uppercase tracking-wide">Private</div>
                      <div className="text-[10px] opacity-70 text-center px-2">Invite link only</div>
                    </button>
                    <button
                      onClick={() => setIsPublic(true)}
                      className={`flex-1 p-4 rounded-xl border-2 transition-all duration-300 flex flex-col items-center justify-center gap-2 ${isPublic ? "border-[#0066FF] bg-[rgba(0,102,255,0.05)] text-white shadow-[0_0_15px_rgba(0,102,255,0.2)]" : "border-[rgba(255,255,255,0.05)] text-muted hover:border-[rgba(255,255,255,0.1)]"}`}
                    >
                      <div className="text-2xl">🌐</div>
                      <div className="font-bold text-sm uppercase tracking-wide">Public</div>
                      <div className="text-[10px] opacity-70 text-center px-2">Listed on homepage</div>
                    </button>
                  </div>
                </div>

                {/* Re-auction toggle */}
                <button
                  onClick={() => setResunsoldEnabled(!reunsoldEnabled)}
                  className="w-full text-left bg-[#050505] hover:bg-[rgba(255,255,255,0.02)] transition-colors p-5 rounded-xl border border-[rgba(255,255,255,0.05)] flex items-center justify-between group"
                >
                  <div>
                    <div className="text-sm font-bold text-white uppercase tracking-wide">Re-auction unsold players</div>
                    <div className="text-xs text-muted mt-1 font-medium">Run a final pass over unsold players after all sets</div>
                  </div>
                  <div className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${reunsoldEnabled ? "bg-[#0066FF]" : "bg-[#1E2D4A]"}`}>
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform duration-300 ${reunsoldEnabled ? "translate-x-7" : "translate-x-1"}`} />
                  </div>
                </button>
              </div>

              <AnimatePresence>
                {error && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] text-[#EF4444] text-sm mt-6 p-3 rounded-lg text-center font-bold">
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex gap-4 mt-8">
                <button className="bg-[#050505] hover:bg-[#080808] border border-[rgba(255,255,255,0.1)] text-white font-bold py-4 px-6 rounded-xl transition-colors" onClick={() => setStep("info")}>
                  ← Back
                </button>
                <button 
                  className="flex-1 bg-[#0066FF] text-white font-bold text-lg py-4 rounded-xl shadow-[0_4px_20px_rgba(0,102,255,0.3)] hover:bg-[#3B82F6] hover:-translate-y-0.5 transition-all" 
                  onClick={handleCreate}
                >
                  CREATE ROOM
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
