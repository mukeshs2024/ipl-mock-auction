"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { v4 as uuidv4 } from "uuid";

interface RoomHistoryEntry {
  code: string;
  name: string;
  lastJoinedAt: number;
}

export default function JoinPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<RoomHistoryEntry[]>([]);
  const sessionId = useRef(uuidv4());

  // Load history and URL params on mount
  useEffect(() => {
    const savedName = localStorage.getItem("lastDisplayName");
    if (savedName) setName(savedName);

    const savedHistory = localStorage.getItem("roomHistory");
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch {}
    }
    
    // Read room code from URL if present
    const params = new URLSearchParams(window.location.search);
    const codeParam = params.get("code");
    if (codeParam) {
      setCode(codeParam.toUpperCase());
    }
  }, []);

  const saveToHistory = (roomCode: string, displayName: string) => {
    localStorage.setItem("lastDisplayName", displayName);
    const newEntry: RoomHistoryEntry = {
      code: roomCode,
      name: `Room ${roomCode}`,
      lastJoinedAt: Date.now(),
    };
    const newHistory = [newEntry, ...history.filter(h => h.code !== roomCode)].slice(0, 5);
    localStorage.setItem("roomHistory", JSON.stringify(newHistory));
    setHistory(newHistory);
  };

  const handleJoin = async () => {
    if (!name.trim() || code.length < 4) return;
    setLoading(true);
    setError("");

    const upperCode = code.toUpperCase().trim();

    try {
      const res = await fetch(`${(process.env.NEXT_PUBLIC_API_URL || "https://ipl-mock-auction-3aqu.onrender.com").replace(/\/$/, "")}/api/room/${upperCode}/exists`);
      const { exists } = await res.json();
      if (!exists) {
        setError("Room not found. Check the code and try again.");
        setLoading(false);
        return;
      }

      const sid = sessionId.current;
      document.cookie = `sessionId=${sid}; path=/; max-age=86400`;
      document.cookie = `displayName=${encodeURIComponent(name.trim())}; path=/; max-age=86400`;
      document.cookie = `roomCode=${upperCode}; path=/; max-age=86400`;

      saveToHistory(upperCode, name.trim());

      router.push(`/room/${upperCode}/lobby`);
    } catch {
      setError("Failed to connect. Is the server running?");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <a href="/" className="text-muted text-sm hover:text-white transition-colors flex items-center gap-2 mb-8">
            ← Back
          </a>

          <div className="glass-panel p-8">
            {/* Header */}
            <div className="mb-8">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 text-2xl"
                style={{ background: "rgba(242,183,5,0.1)", border: "1px solid rgba(242,183,5,0.2)" }}>
                🎯
              </div>
              <h1 className="font-display text-4xl font-black">Join Auction</h1>
              <p className="text-subtle mt-1">Enter your name and the room code from your host</p>
            </div>

            {/* Form */}
            <div className="space-y-4">
              <div>
                <label className="block text-subtle text-sm mb-2">Your display name</label>
                <input
                  className="input-field"
                  placeholder="e.g. Ravi Shastri"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-subtle text-sm mb-2">Room code</label>
                <input
                  className="input-field font-display text-2xl font-bold tracking-widest uppercase text-amber-bid"
                  placeholder="XXXXXX"
                  value={code}
                  maxLength={6}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                />
              </div>

              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-crimson-hot text-sm"
                >
                  ⚠ {error}
                </motion.p>
              )}

              <button
                id="join-button"
                className="btn-primary w-full py-4 text-lg mt-2"
                onClick={handleJoin}
                disabled={!name.trim() || code.length < 4 || loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2 justify-center">
                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Joining...
                  </span>
                ) : "Join Auction →"}
              </button>
            </div>

            {/* History */}
            {history.length > 0 && (
              <div className="mt-8 pt-6 border-t border-[rgba(30,45,74,0.6)]">
                <p className="text-xs uppercase tracking-widest text-muted font-bold mb-3">Recent Rooms</p>
                <div className="space-y-2">
                  {history.map(h => (
                    <button
                      key={h.code}
                      onClick={() => {
                        setCode(h.code);
                        if (name.trim()) {
                           // Try joining immediately if name is set
                           setTimeout(() => {
                             document.getElementById("join-button")?.click();
                           }, 50);
                        }
                      }}
                      className="w-full flex items-center justify-between p-3 rounded-lg bg-[rgba(30,45,74,0.3)] hover:bg-[rgba(30,45,74,0.6)] transition-colors border border-[rgba(30,45,74,0.4)]"
                    >
                      <div className="text-left">
                        <div className="font-bold text-white text-sm">{h.name}</div>
                        <div className="text-xs text-muted">
                          {new Date(h.lastJoinedAt).toLocaleDateString()}
                        </div>
                      </div>
                      <span className="font-mono text-amber-bid font-bold text-sm">{h.code}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </main>
  );
}
