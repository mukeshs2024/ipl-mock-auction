"use client";

import { useState, useEffect } from "react";

export interface AuctionHistoryItem {
  roomCode: string;
  teamCode?: string | null;
  status: string;
  lastVisited: number;
}

export function useAuctionHistory() {
  const [history, setHistory] = useState<AuctionHistoryItem[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("auctionHistory");
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch (err) {
      console.error("Failed to load auction history", err);
    }
  }, []);

  const updateHistory = (item: Omit<AuctionHistoryItem, "lastVisited">) => {
    setHistory((prev) => {
      const existing = prev.find((h) => h.roomCode === item.roomCode);
      
      const filtered = prev.filter((h) => h.roomCode !== item.roomCode);
      const updatedItem = { 
        ...item, 
        lastVisited: Date.now(),
        teamCode: item.teamCode ?? existing?.teamCode ?? null
      };
      
      const updated = [updatedItem, ...filtered];
      
      try {
        localStorage.setItem("auctionHistory", JSON.stringify(updated));
      } catch (err) {
        console.error("Failed to save auction history", err);
      }
      return updated;
    });
  };

  const removeHistoryItem = (roomCode: string) => {
    setHistory((prev) => {
      const filtered = prev.filter((h) => h.roomCode !== roomCode);
      try {
        localStorage.setItem("auctionHistory", JSON.stringify(filtered));
      } catch (err) {
        console.error("Failed to save auction history", err);
      }
      return filtered;
    });
  };

  return { history, updateHistory, removeHistoryItem };
}
