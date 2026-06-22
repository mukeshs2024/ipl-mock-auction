"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
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
  const [activeView, setActiveView] = useState<"actions" | "history" | "public">("actions");
  const { history } = useAuctionHistory();
  const [publicRooms, setPublicRooms] = useState<any[]>([]);
  const [loadingPublic, setLoadingPublic] = useState(false);

  useEffect(() => {
    if (activeView === "public") {
      setLoadingPublic(true);
      const apiUrl = (process.env.NEXT_PUBLIC_API_URL || "https://ipl-mock-auction-3aqu.onrender.com").replace(/\/$/, "");
      fetch(`${apiUrl}/api/public-rooms`)
        .then((res) => res.json())
        .then((data) => {
          setPublicRooms(data.rooms || []);
          setLoadingPublic(false);
        })
        .catch(() => setLoadingPublic(false));
    }
  }, [activeView]);
  return (
    <main className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-[#000000]">
      {/* Premium Sports Tech Background Grid & Glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Subtle grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.03]" 
          style={{ 
            backgroundImage: "linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)", 
            backgroundSize: "40px 40px" 
          }}
        />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-[#0066FF] opacity-[0.03] blur-[150px]" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full bg-[#0066FF] opacity-[0.05] blur-[120px]" />
        
        {/* Minimal diagonal slashes for tech feel */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.02]" xmlns="http://www.w3.org/2000/svg">
           <line x1="10%" y1="-10%" x2="40%" y2="110%" stroke="#0066FF" strokeWidth="2" />
           <line x1="70%" y1="-10%" x2="100%" y2="110%" stroke="#0066FF" strokeWidth="1" />
        </svg>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-5xl mx-auto px-6 flex flex-col items-center"
      >
        {/* Hero Section */}
        <div className="text-center mb-16 w-full max-w-3xl">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="inline-flex items-center gap-2 px-5 py-1.5 rounded-full mb-10 text-xs font-bold tracking-widest uppercase"
            style={{ background: "rgba(0,102,255,0.08)", border: "1px solid rgba(0,102,255,0.2)", color: "#0066FF" }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#0066FF] animate-pulse" />
            Next-Gen Sports Engine
          </motion.div>

          <h1 className="font-display text-6xl md:text-8xl lg:text-[100px] font-black mb-6 leading-[0.9] tracking-tight uppercase">
            <span className="text-[#0066FF] block mb-2" style={{ textShadow: "0 0 40px rgba(0,102,255,0.3)" }}>IPL Mock</span>
            <span className="text-white">Auction</span>
          </h1>

          <p className="text-[#B8C0D4] text-lg md:text-2xl font-medium tracking-wide">
            Build Your Squad. <span className="text-white">Outbid Your Rivals.</span> Dominate The Auction.
          </p>
        </div>

        {/* View Toggles */}
        <div className="flex justify-center gap-3 mb-10 w-full flex-wrap">
          <button 
            onClick={() => setActiveView("actions")}
            className={`px-8 py-3 rounded-full font-bold text-sm transition-all duration-300 ${activeView === "actions" ? "bg-[#0066FF] text-white shadow-[0_0_20px_rgba(0,102,255,0.3)]" : "bg-[#050505] border border-[rgba(255,255,255,0.1)] text-[#6B7280] hover:text-white"}`}
          >
            Enter Arena
          </button>
          <button 
            onClick={() => setActiveView("public")}
            className={`px-8 py-3 rounded-full font-bold text-sm transition-all duration-300 ${activeView === "public" ? "bg-[#0066FF] text-white shadow-[0_0_20px_rgba(0,102,255,0.3)]" : "bg-[#050505] border border-[rgba(255,255,255,0.1)] text-[#6B7280] hover:text-white"}`}
          >
            🌐 Public Rooms
          </button>
          <button 
            onClick={() => setActiveView("history")}
            className={`px-8 py-3 rounded-full font-bold text-sm transition-all duration-300 flex items-center gap-2 ${activeView === "history" ? "bg-[#0066FF] text-white shadow-[0_0_20px_rgba(0,102,255,0.3)]" : "bg-[#050505] border border-[rgba(255,255,255,0.1)] text-[#6B7280] hover:text-white"}`}
          >
            Auction History
            {history.length > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeView === "history" ? "bg-white text-[#0066FF]" : "bg-[rgba(255,255,255,0.1)] text-[#FFFFFF]"}`}>
                {history.length}
              </span>
            )}
          </button>
        </div>

        {/* Actions / History Container */}
        <div className="w-full min-h-[200px] flex items-center justify-center">
          <AnimatePresence mode="wait">
            {activeView === "actions" ? (
              <motion.div
                key="actions"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col items-center w-full"
              >
                <div className="flex flex-col sm:flex-row gap-5 justify-center w-full max-w-2xl mb-8 md:mb-12">
                  <Link href="/create" className="w-full sm:w-1/2 group">
                    <div className="w-full bg-[#0066FF] border border-[#0066FF] hover:bg-[#3B82F6] rounded-2xl p-4 md:p-5 text-center transition-all duration-300 shadow-[0_0_20px_rgba(0,102,255,0.3)] hover:shadow-[0_0_30px_rgba(0,102,255,0.6)] group-hover:-translate-y-1">
                      <div className="text-white font-black text-lg md:text-xl tracking-widest uppercase mb-1">Create Auction</div>
                      <div className="text-blue-100 text-[10px] md:text-xs font-bold uppercase tracking-widest">Host a new room</div>
                    </div>
                  </Link>
                  <Link href="/join" className="w-full sm:w-1/2 group">
                    <div className="w-full bg-[#050505] border border-[rgba(0,102,255,0.5)] hover:border-[#0066FF] rounded-2xl p-4 md:p-5 text-center transition-all duration-300 hover:shadow-[0_0_30px_rgba(0,102,255,0.2)] group-hover:-translate-y-1">
                      <div className="text-white font-black text-lg md:text-xl tracking-widest uppercase mb-1">Join Auction</div>
                      <div className="text-[#6B7280] group-hover:text-white text-[10px] md:text-xs font-bold uppercase tracking-widest transition-colors">Enter invite code</div>
                    </div>
                  </Link>
                </div>

                {/* TROPHY CENTERPIECE */}
                <div className="relative w-full flex justify-center z-10 pointer-events-none mt-4 md:mt-8">
                  {/* Soft Neon Blue Glow & Floor Reflection */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[250px] md:w-[450px] h-[250px] md:h-[450px] bg-[#0066FF] opacity-[0.15] blur-[120px] rounded-full"></div>
                  <div className="absolute bottom-[-20px] left-1/2 -translate-x-1/2 w-[180px] md:w-[350px] h-[20px] md:h-[30px] bg-[#0066FF] opacity-[0.25] blur-[25px] rounded-[100%]"></div>
                  
                  <motion.div
                    animate={{ y: [0, -12, 0], rotate: [-0.5, 0.5, -0.5] }}
                    transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
                    className="relative w-[180px] sm:w-[220px] md:w-[380px] aspect-[3/4]"
                  >
                    <Image 
                      src="/trophy.png" 
                      alt="Championship Trophy" 
                      fill 
                      priority
                      className="object-contain drop-shadow-[0_0_30px_rgba(0,102,255,0.3)]" 
                    />
                  </motion.div>
                </div>
              </motion.div>
            ) : activeView === "public" ? (
              <motion.div 
                key="public"
                initial={{ opacity: 0, scale: 0.95 }} 
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="w-full max-w-2xl text-left bg-[#080808] border border-[rgba(255,255,255,0.08)] p-2 rounded-2xl shadow-2xl"
              >
                {loadingPublic ? (
                  <div className="p-12 text-center">
                    <div className="w-8 h-8 border-4 border-[#0066FF] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <h3 className="text-white font-bold text-xl mb-2">Finding Games...</h3>
                  </div>
                ) : publicRooms.length === 0 ? (
                  <div className="p-12 text-center">
                    <div className="text-4xl mb-4 opacity-50">🌐</div>
                    <h3 className="text-white font-bold text-xl mb-2">No Public Rooms</h3>
                    <p className="text-[#6B7280]">There are no public auctions running right now.</p>
                  </div>
                ) : (
                  <div className="max-h-[350px] overflow-y-auto custom-scroll p-2 space-y-3">
                    {publicRooms.map(room => (
                      <div key={room.roomCode} className="p-4 rounded-xl bg-[#050505] border border-[rgba(255,255,255,0.05)] hover:border-[rgba(0,102,255,0.3)] transition-colors flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="font-mono text-xl font-bold text-white tracking-widest">{room.roomCode}</span>
                            <div className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-sm ${room.status === 'live' ? 'bg-[rgba(239,68,68,0.1)] text-[#EF4444]' : 'bg-[rgba(0,102,255,0.1)] text-[#0066FF]'}`}>
                              {room.status}
                            </div>
                          </div>
                          <div className="text-xs text-[#B8C0D4] flex items-center gap-3 font-medium">
                            <span className="opacity-60">Host: {room.hostName}</span>
                            <span className="opacity-40">•</span>
                            <span className="opacity-60">{room.playersJoined}/10 Teams Joined</span>
                          </div>
                        </div>
                        <Link href={`/join?code=${room.roomCode}`} className="w-full sm:w-auto">
                          <button className="w-full sm:w-auto px-6 py-2.5 rounded-lg text-sm font-bold transition-all bg-[rgba(0,102,255,0.1)] text-[#0066FF] hover:bg-[#0066FF] hover:text-white">
                            Join Game
                          </button>
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div 
                key="history"
                initial={{ opacity: 0, scale: 0.95 }} 
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="w-full max-w-2xl text-left bg-[#080808] border border-[rgba(255,255,255,0.08)] p-2 rounded-2xl shadow-2xl"
              >
                {history.length === 0 ? (
                  <div className="p-12 text-center">
                    <div className="text-4xl mb-4 opacity-50">🏟️</div>
                    <h3 className="text-white font-bold text-xl mb-2">No History</h3>
                    <p className="text-[#6B7280]">You haven't participated in any auctions yet.</p>
                  </div>
                ) : (
                  <div className="max-h-[350px] overflow-y-auto custom-scroll p-2 space-y-3">
                    {history.sort((a, b) => b.lastVisited - a.lastVisited).map(item => {
                      const isCompleted = item.status === "ended" || item.status === "completed";
                      return (
                        <div key={item.roomCode} className="p-4 rounded-xl bg-[#050505] border border-[rgba(255,255,255,0.05)] hover:border-[rgba(0,102,255,0.3)] transition-colors flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="font-mono text-xl font-bold text-white tracking-widest">{item.roomCode}</span>
                              <div className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-sm ${isCompleted ? 'bg-[rgba(34,197,94,0.1)] text-[#22C55E]' : 'bg-[rgba(0,102,255,0.1)] text-[#0066FF]'}`}>
                                {isCompleted ? 'COMPLETED' : item.status}
                              </div>
                            </div>
                            <div className="text-xs text-[#B8C0D4] flex items-center gap-3 font-medium">
                              {item.teamCode ? (
                                <span className="flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#0066FF]"></span>
                                  Team: {item.teamCode}
                                </span>
                              ) : (
                                <span className="opacity-60">Spectator</span>
                              )}
                              <span className="opacity-40">•</span>
                              <span className="opacity-60">{formatTimeAgo(item.lastVisited)}</span>
                            </div>
                          </div>
                          
                          <Link href={isCompleted ? `/room/${item.roomCode}/summary` : `/room/${item.roomCode}/live`} className="w-full sm:w-auto">
                            <button className={`w-full sm:w-auto px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
                              isCompleted 
                                ? "bg-[rgba(34,197,94,0.1)] text-[#22C55E] hover:bg-[#22C55E] hover:text-white" 
                                : "bg-[rgba(0,102,255,0.1)] text-[#0066FF] hover:bg-[#0066FF] hover:text-white"
                            }`}>
                              {isCompleted ? 'Summary' : 'Rejoin'}
                            </button>
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Global Stats Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-20 w-full max-w-4xl grid grid-cols-2 md:grid-cols-4 gap-6 text-center border-t border-[rgba(255,255,255,0.05)] pt-12"
        >
          {[
            { label: "Total Players", value: "524" },
            { label: "Auction Sets", value: "38" },
            { label: "IPL Teams", value: "10" },
            { label: "Real-Time Engine", value: "Active" },
          ].map((stat) => (
            <div key={stat.label} className="flex flex-col items-center">
              <div className="font-display text-3xl md:text-4xl font-black text-[#FFFFFF] mb-1 tracking-tight">{stat.value}</div>
              <div className="text-[#0066FF] text-[10px] md:text-xs font-bold uppercase tracking-widest">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </motion.div>
    </main>
  );
}
