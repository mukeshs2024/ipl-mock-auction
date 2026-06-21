"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { v4 as uuidv4 } from "uuid";

type Step = "info" | "settings" | "creating";

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
  const [error, setError] = useState("");

  const sessionId = useRef(uuidv4());

  const handleCreate = async () => {
    setStep("creating");
    setError("");

    const hostToken = uuidv4();
    const sid = sessionId.current;

    // Store session info in cookies
    document.cookie = `sessionId=${sid}; path=/; max-age=86400`;
    document.cookie = `hostToken=${hostToken}; path=/; max-age=86400`;
    document.cookie = `displayName=${encodeURIComponent(hostName)}; path=/; max-age=86400`;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/create-room`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hostName,
          hostSessionId: sid,
          hostToken,
          pursePerTeam,
          timerDurationSeconds: timerSeconds,
          reunsoldPhaseEnabled: reunsoldEnabled,
        }),
      });

      if (!res.ok) throw new Error("Failed to create room");

      const { roomCode } = await res.json();
      document.cookie = `roomCode=${roomCode}; path=/; max-age=86400`;
      router.push(`/room/${roomCode}/lobby`);
    } catch (err: any) {
      setError(err.message || "Failed to connect to server. Is it running?");
      setStep("settings");
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <a href="/" className="text-muted text-sm hover:text-white transition-colors flex items-center gap-2 mb-6">
            ← Back
          </a>
          <h1 className="font-display text-5xl font-black">
            <span className="gradient-text">Create</span> Auction
          </h1>
          <p className="text-subtle mt-2">Set up your private IPL mock auction room</p>
        </motion.div>

        {/* Step progress */}
        <div className="flex items-center gap-2 mb-8">
          {["info", "settings"].map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                step === s ? "bg-[#F2B705] text-[#0B0F19]" :
                ["info", "settings"].indexOf(step as any) > i ? "bg-pitch-green text-white" :
                "bg-stadium-panel text-muted"
              }`}>
                {["info", "settings"].indexOf(step as any) > i ? "✓" : i + 1}
              </div>
              {i < 1 && <div className="flex-1 h-0.5 bg-stadium-border min-w-[20px]" />}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* STEP 1: Host info */}
          {step === "info" && (
            <motion.div key="info" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="glass-panel p-8">
              <h2 className="font-display text-2xl font-bold mb-6">Your Name</h2>
              <label className="block text-subtle text-sm mb-2">Host display name</label>
              <input
                className="input-field text-lg mb-6"
                placeholder="e.g. Commissioner Shah"
                value={hostName}
                onChange={(e) => setHostName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && hostName.trim() && setStep("settings")}
                autoFocus
              />
              <button
                className="btn-primary w-full py-4 text-lg"
                onClick={() => setStep("settings")}
                disabled={!hostName.trim()}
              >
                Continue →
              </button>
            </motion.div>
          )}

          {/* STEP 2: Settings */}
          {step === "settings" && (
            <motion.div key="settings" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="glass-panel p-8">
              <h2 className="font-display text-2xl font-bold mb-6">Auction Settings</h2>

              <div className="space-y-6">
                {/* Purse */}
                <div>
                  <label className="block text-subtle text-sm mb-1">Purse per team</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      className="input-field w-40"
                      value={pursePerTeam}
                      min={100}
                      max={100000}
                      onChange={(e) => setPursePerTeam(Number(e.target.value))}
                    />
                    <span className="text-amber-bid font-display text-xl font-bold">
                      = {formatLakhsClient(pursePerTeam)}
                    </span>
                  </div>
                  <p className="text-muted text-xs mt-1">Enter in Lakhs. Default: 12,000 L = ₹120 Cr</p>
                </div>

                {/* Timer */}
                <div>
                  <label className="block text-subtle text-sm mb-1">Timer per player (seconds)</label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min={5}
                      max={120}
                      value={timerSeconds}
                      onChange={(e) => setTimerSeconds(Number(e.target.value))}
                      className="flex-1 accent-[#F2B705]"
                    />
                    <span className="font-display text-2xl font-bold text-amber-bid w-16 text-right">{timerSeconds}s</span>
                  </div>
                  <p className="text-muted text-xs mt-1">Minimum 5s · Default 10s</p>
                </div>

                {/* Re-auction toggle */}
                <div className="flex items-center justify-between p-4 rounded-lg" style={{ background: "rgba(30,45,74,0.4)" }}>
                  <div>
                    <div className="text-sm font-semibold text-white">Re-auction unsold players</div>
                    <div className="text-xs text-muted mt-0.5">Run a final pass over unsold players after all sets</div>
                  </div>
                  <button
                    onClick={() => setResunsoldEnabled(!reunsoldEnabled)}
                    className={`relative w-12 h-6 rounded-full transition-colors ${reunsoldEnabled ? "bg-[#F2B705]" : "bg-stadium-border"}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${reunsoldEnabled ? "translate-x-7" : "translate-x-1"}`} />
                  </button>
                </div>
              </div>

              {error && <p className="text-crimson-hot text-sm mt-4">{error}</p>}

              <div className="flex gap-3 mt-6">
                <button className="btn-secondary py-4 px-6" onClick={() => setStep("info")}>
                  ← Back
                </button>
                <button className="btn-primary flex-1 py-4 text-lg" onClick={handleCreate}>
                  🚀 Create Room
                </button>
              </div>
            </motion.div>
          )}

          {/* Creating spinner */}
          {step === "creating" && (
            <motion.div key="creating" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-panel p-12 text-center">
              <div className="w-16 h-16 border-4 border-[#F2B705] border-t-transparent rounded-full animate-spin mx-auto mb-6" />
              <p className="font-display text-2xl font-bold">Creating your room...</p>
              <p className="text-muted text-sm mt-2">Loading default CSV dataset...</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
