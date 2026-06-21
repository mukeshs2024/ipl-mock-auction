"use client";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ActivityLogEntry } from "@/types";

interface ActivityFeedProps {
  entries: ActivityLogEntry[];
  onSendChat?: (msg: string) => void;
}

const TYPE_COLORS: Record<string, string> = {
  bid: "#F2B705",
  sold: "#1FAA59",
  unsold: "#E2433D",
  team_claimed: "#6366f1",
  team_released: "#6b7280",
  team_reassigned: "#8b5cf6",
  host_action: "#94a3b8",
  joined: "#60a5fa",
  left: "#6b7280",
  kicked: "#E2433D",
  auction_started: "#1FAA59",
  auction_paused: "#F2B705",
  auction_resumed: "#1FAA59",
  set_started: "#a78bfa",
  set_ended: "#6b7280",
  chat: "#0ea5e9", // Light blue for chat
};

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export default function ActivityFeed({ entries, onSendChat }: ActivityFeedProps) {
  const feedContainerRef = useRef<HTMLDivElement>(null);
  const [chatMessage, setChatMessage] = useState("");
  const [isScrolledUp, setIsScrolledUp] = useState(false);
  const [hasNewActivity, setHasNewActivity] = useState(false);
  const lastEntryCount = useRef(entries.length);

  const handleScroll = () => {
    if (!feedContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = feedContainerRef.current;
    // If user is within 20px of the bottom, we consider them "at bottom"
    const atBottom = scrollHeight - scrollTop - clientHeight < 20;
    setIsScrolledUp(!atBottom);
    if (atBottom) {
      setHasNewActivity(false);
    }
  };

  const scrollToBottom = () => {
    if (feedContainerRef.current) {
      feedContainerRef.current.scrollTop = feedContainerRef.current.scrollHeight;
    }
    setIsScrolledUp(false);
    setHasNewActivity(false);
  };

  // Auto-scroll to bottom on new entries, if not scrolled up
  useEffect(() => {
    if (entries.length > lastEntryCount.current) {
      if (!isScrolledUp) {
        if (feedContainerRef.current) {
          feedContainerRef.current.scrollTop = feedContainerRef.current.scrollHeight;
        }
      } else {
        setHasNewActivity(true);
      }
    }
    lastEntryCount.current = entries.length;
  }, [entries, isScrolledUp]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim() || !onSendChat) return;
    onSendChat(chatMessage.trim());
    setChatMessage("");
  };

  return (
    <div className="flex flex-col h-full w-full relative">
      <h3 className="text-xs font-semibold text-muted uppercase tracking-widest mb-3 shrink-0">
        Activity Feed
      </h3>
      <div 
        ref={feedContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto custom-scroll space-y-1.5 pr-1 mb-3 relative"
      >
        {entries.length === 0 && (
          <p className="text-muted text-xs text-center py-8">No activity yet</p>
        )}
        <AnimatePresence initial={false}>
          {entries.map((entry) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25 }}
              className="flex items-start gap-2 px-3 py-2 rounded-lg"
              style={{ background: "rgba(16,23,42,0.6)", borderLeft: `2px solid ${TYPE_COLORS[entry.type] || "#334155"}` }}
            >
              <span className="text-muted text-[10px] tabular-nums shrink-0 mt-0.5 font-mono">
                {formatTime(entry.timestamp)}
              </span>
              <p className="text-white text-xs leading-relaxed">{entry.message}</p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {hasNewActivity && isScrolledUp && (
        <div className="absolute bottom-[60px] left-1/2 -translate-x-1/2 z-10">
          <button 
            onClick={scrollToBottom} 
            className="bg-[#F2B705] text-[#0B0F19] text-xs font-bold px-4 py-2 rounded-full shadow-lg flex items-center gap-2 hover:bg-[#dca604] transition-colors"
          >
            New Activity ↓
          </button>
        </div>
      )}

      {/* Chat Input */}
      {onSendChat && (
        <form onSubmit={handleSend} className="shrink-0 flex gap-2">
          <input
            type="text"
            placeholder="Type a message..."
            value={chatMessage}
            onChange={(e) => setChatMessage(e.target.value)}
            className="flex-1 input-field py-2 px-3 text-sm"
          />
          <button type="submit" className="btn-primary py-2 px-4 text-sm whitespace-nowrap">
            Send
          </button>
        </form>
      )}
    </div>
  );
}
