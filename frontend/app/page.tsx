"use client";
import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAuctionHistory } from "@/lib/use-auction-history";

function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days !== 1 ? 's' : ''} ago`;
}

export default function LandingPage() {
  const [activeView, setActiveView] = useState<"actions" | "history">("actions");
  const { history } = useAuctionHistory();
  return (
    <main className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-[#F2B705] opacity-5 blur-[120px]" />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] rounded-full bg-[#1FAA59] opacity-5 blur-[100px]" />
        <div className="absolute top-0 right-1/4 w-[300px] h-[300px] rounded-full bg-[#EC1C24] opacity-5 blur-[80px]" />
      </div>

      {/* Cricket field lines — decorative */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <ellipse cx="50%" cy="50%" rx="45%" ry="40%" fill="none" stroke="white" strokeWidth="1" />
          <ellipse cx="50%" cy="50%" rx="30%" ry="25%" fill="none" stroke="white" strokeWidth="1" />
          <line x1="50%" y1="0" x2="50%" y2="100%" stroke="white" strokeWidth="0.5" />
        </svg>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 text-center px-6 max-w-2xl"
      >
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-8 text-sm font-semibold"
          style={{ background: "rgba(242,183,5,0.1)", border: "1px solid rgba(242,183,5,0.3)", color: "#F2B705" }}
        >
          <span className="w-2 h-2 rounded-full bg-[#F2B705] animate-pulse" />
          Real-Time Multiplayer Auction
        </motion.div>

        {/* Title */}
        <h1 className="font-display text-6xl md:text-8xl font-black mb-4 leading-none tracking-tight">
          <span className="gradient-text">IPL</span>
          <br />
          <span className="text-white">MOCK AUCTION</span>
        </h1>

        <p className="text-subtle text-lg md:text-xl mb-12 leading-relaxed">
          Host a live, multiplayer auction with your friends.<br />
          Real IPL players. Real-time bidding. No lag. No desync.
        </p>

        {/* Navigation Tabs */}
        <div className="flex justify-center gap-2 mb-8">
          <button 
            onClick={() => setActiveView("actions")}
            className={`px-6 py-2 rounded-full font-bold text-sm transition-colors ${activeView === "actions" ? "bg-[#F2B705] text-[#0B0F19]" : "bg-[rgba(30,45,74,0.5)] text-muted hover:text-white"}`}
          >
            Play
          </button>
          <button 
            onClick={() => setActiveView("history")}
            className={`px-6 py-2 rounded-full font-bold text-sm transition-colors flex items-center gap-2 ${activeView === "history" ? "bg-[#F2B705] text-[#0B0F19]" : "bg-[rgba(30,45,74,0.5)] text-muted hover:text-white"}`}
          >
            History
            {history.length > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeView === "history" ? "bg-[#0B0F19] text-[#F2B705]" : "bg-[#F2B705] text-[#0B0F19]"}`}>
                {history.length}
              </span>
            )}
          </button>
        </div>

        {activeView === "actions" ? (
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/create">
              <motion.button
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.97 }}
                className="btn-primary text-lg px-8 py-4 w-full sm:w-auto"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Auction
              </motion.button>
            </Link>
            <Link href="/join">
              <motion.button
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.97 }}
                className="btn-secondary text-lg px-8 py-4 w-full sm:w-auto"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                Join with Code
              </motion.button>
            </Link>
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-lg mx-auto text-left bg-[rgba(10,15,25,0.7)] border border-[rgba(30,45,74,0.6)] p-6 rounded-2xl backdrop-blur-md"
          >
            <h2 className="font-display text-2xl font-bold mb-4">Auction History</h2>
            {history.length === 0 ? (
              <p className="text-muted text-sm text-center py-8">No previous auctions found.</p>
            ) : (
              <div className="space-y-4">
                {history.sort((a, b) => b.lastVisited - a.lastVisited).map(item => {
                  const isCompleted = item.status === "ended" || item.status === "completed";
                  return (
                    <div key={item.roomCode} className="p-4 rounded-xl bg-[rgba(30,45,74,0.3)] border border-[rgba(30,45,74,0.5)]">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <div className="font-mono text-lg font-bold text-white mb-1">Room {item.roomCode}</div>
                          <div className="text-xs text-muted flex items-center gap-2">
                            {item.teamCode ? (
                              <span className="bg-[rgba(99,102,241,0.2)] text-[#8b5cf6] px-2 py-0.5 rounded font-bold">
                                Team: {item.teamCode}
                              </span>
                            ) : (
                              <span className="bg-[rgba(255,255,255,0.1)] px-2 py-0.5 rounded font-bold">
                                Spectator
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-xs font-bold uppercase tracking-widest ${isCompleted ? 'text-pitch-green' : 'text-amber-bid'}`}>
                            {isCompleted ? 'COMPLETED' : item.status}
                          </div>
                          <div className="text-[10px] text-subtle mt-1">{formatTimeAgo(item.lastVisited)}</div>
                        </div>
                      </div>
                      
                      <Link href={isCompleted ? `/room/${item.roomCode}/summary` : `/room/${item.roomCode}/live`}>
                        <button className={`w-full py-2.5 rounded-lg text-sm font-bold transition-colors ${
                          isCompleted 
                            ? "bg-[rgba(31,170,89,0.1)] text-pitch-green hover:bg-[rgba(31,170,89,0.2)]" 
                            : "bg-[rgba(242,183,5,0.1)] text-amber-bid hover:bg-[rgba(242,183,5,0.2)]"
                        }`}>
                          {isCompleted ? 'View Summary' : 'Rejoin Auction'}
                        </button>
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* Stats bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-16 flex flex-wrap justify-center gap-8 text-center"
        >
          {[
            { label: "Players", value: "524" },
            { label: "Auction Sets", value: "38" },
            { label: "IPL Teams", value: "10" },
            { label: "Real-time", value: "✓" },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="font-display text-3xl font-bold text-amber-bid">{stat.value}</div>
              <div className="text-muted text-sm uppercase tracking-widest mt-1">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </motion.div>
    </main>
  );
}
