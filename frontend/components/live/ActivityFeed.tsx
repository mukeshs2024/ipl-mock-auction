"use client";
import { useEffect, useRef, useState, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ActivityLogEntry } from "@/types";

interface ActivityFeedProps {
  entries: ActivityLogEntry[];
  onSendChat?: (msg: string) => void;
}

const TYPE_COLORS: Record<string, string> = {
  bid: "#0066FF",
  sold: "#22C55E",
  unsold: "#EF4444",
  team_claimed: "#0066FF",
  team_released: "#6B7280",
  team_reassigned: "#3B82F6",
  host_action: "#B8C0D4",
  joined: "#0066FF",
  left: "#6B7280",
  kicked: "#EF4444",
  auction_started: "#22C55E",
  auction_paused: "#F59E0B",
  auction_resumed: "#22C55E",
  set_started: "#3B82F6",
  set_ended: "#6B7280",
  chat: "#0066FF",
};

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function ActivityFeedComponent({ entries, onSendChat }: ActivityFeedProps) {
  const feedContainerRef = useRef<HTMLDivElement>(null);
  const [chatMessage, setChatMessage] = useState("");
  const [isScrolledUp, setIsScrolledUp] = useState(false);
  const [hasNewActivity, setHasNewActivity] = useState(false);
  const lastEntryId = useRef<string | null>(null);

  // The backend prepends new items (newest at index 0).
  // We want old at TOP, new at BOTTOM, so we reverse the array.
  const displayEntries = [...entries].reverse();

  const handleScroll = () => {
    if (!feedContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = feedContainerRef.current;
    
    // Consider it "at bottom" if within 40px
    const atBottom = scrollHeight - scrollTop - clientHeight < 40;
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

  useEffect(() => {
    if (displayEntries.length === 0) return;
    const newestEntry = displayEntries[displayEntries.length - 1];
    
    if (newestEntry.id !== lastEntryId.current) {
      lastEntryId.current = newestEntry.id;
      
      // Auto-scroll logic: only if user is already at the bottom
      if (!isScrolledUp) {
        // Use a small timeout to allow DOM to render the new item before scrolling
        setTimeout(() => {
          if (feedContainerRef.current) {
            feedContainerRef.current.scrollTop = feedContainerRef.current.scrollHeight;
          }
        }, 10);
      } else {
        setHasNewActivity(true);
      }
    }
  }, [displayEntries, isScrolledUp]);

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
        className="flex-1 overflow-y-auto custom-scroll space-y-2 pr-1 mb-3 relative"
      >
        {displayEntries.length === 0 && (
          <p className="text-muted text-xs text-center py-8">No activity yet</p>
        )}
        <AnimatePresence initial={false}>
          {displayEntries.map((entry) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-start gap-2 px-3 py-2 rounded-lg"
              style={{ background: "rgba(11, 11, 11, 0.8)", borderLeft: `2px solid ${TYPE_COLORS[entry.type] || "#3B82F6"}` }}
            >
              <span className="text-muted text-[10px] tabular-nums shrink-0 mt-0.5 font-mono">
                {formatTime(entry.timestamp)}
              </span>
              <p className="text-white text-sm leading-relaxed font-medium">{entry.message}</p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {hasNewActivity && isScrolledUp && (
        <div className="absolute bottom-[60px] left-1/2 -translate-x-1/2 z-10">
          <button 
            onClick={scrollToBottom} 
            className="bg-[#0066FF] text-[#FFFFFF] text-xs font-bold px-4 py-2 rounded-full shadow-[0_4px_14px_rgba(0,102,255,0.4)] flex items-center gap-2 hover:bg-[#3B82F6] transition-colors"
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

export default memo(ActivityFeedComponent);
