"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { RoomState } from "@/types";

function getCookie(name: string): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : "";
}

export interface UseAuctionSocketReturn {
  roomState: RoomState | null;
  isConnected: boolean;
  sessionId: string;
  displayName: string;
  hostToken: string;
  myTeamCode: string | null;
  isHost: boolean;
  lastRejection: string | null;
  socket: Socket | null;
  bid: (amount: number) => void;
  claimTeam: (teamCode: string) => void;
  releaseTeam: (teamCode: string) => void;
  hostAction: (action: string) => void;
  extendTimer: (extra: number) => void;
  setTimerDuration: (secs: number) => void;
  kickUser: (targetSessionId: string) => void;
  reassignTeam: (teamCode: string, newSessionId: string, newOwnerName: string) => void;
  editPurse: (teamCode: string, newPurse: number) => void;
  clearRejection: () => void;
  sendChat: (message: string) => void;
}

export function useAuctionSocket(roomCode: string): UseAuctionSocketReturn {
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [myTeamCode, setMyTeamCode] = useState<string | null>(null);
  const [lastRejection, setLastRejection] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const sessionId = getCookie("sessionId");
  const displayName = getCookie("displayName");
  const hostToken = getCookie("hostToken");
  const isHost = !!(hostToken && roomState?.hostSessionId === sessionId);

  useEffect(() => {
    if (!roomCode || !sessionId) return;

    const socket = io(process.env.NEXT_PUBLIC_API_URL || "https://ipl-mock-auction-3aqu.onrender.com", {
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 500,
      reconnectionAttempts: Infinity,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
      socket.emit("join_room", { roomCode, sessionId, displayName });
    });

    socket.on("disconnect", () => setIsConnected(false));

    socket.on("room_state", (state: RoomState) => {
      setRoomState(state);
      // Update my team code from state
      const myTeam = Object.values(state.teams).find(
        (t) => t.ownerSessionId === sessionId
      );
      setMyTeamCode(myTeam?.code ?? null);
    });

    socket.on("team_confirmed", ({ teamCode }: { teamCode: string }) => {
      setMyTeamCode(teamCode);
    });

    socket.on("bid_rejected", ({ reason }: { reason: string }) => {
      setLastRejection(reason);
    });

    socket.on("claim_rejected", ({ reason }: { reason: string }) => {
      setLastRejection(reason);
    });

    socket.on("kicked", ({ reason }: { reason: string }) => {
      alert(`You have been kicked: ${reason}`);
      window.location.href = "/";
    });

    socket.on("room_not_found", () => {
      window.location.href = "/join";
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [roomCode, sessionId, displayName]);

  const bid = useCallback((amount: number) => {
    if (!myTeamCode || !socketRef.current) return;
    socketRef.current.emit("bid", { roomCode, teamCode: myTeamCode, sessionId, amount });
  }, [roomCode, sessionId, myTeamCode]);

  const claimTeam = useCallback((teamCode: string) => {
    socketRef.current?.emit("claim_team", { roomCode, teamCode, sessionId });
  }, [roomCode, sessionId]);

  const releaseTeam = useCallback((teamCode: string) => {
    socketRef.current?.emit("release_team", { roomCode, teamCode, sessionId });
  }, [roomCode, sessionId]);

  const hostAction = useCallback((action: string) => {
    socketRef.current?.emit("host_action", { roomCode, hostToken, action });
  }, [roomCode, hostToken]);

  const extendTimer = useCallback((extraSeconds: number) => {
    socketRef.current?.emit("extend_timer", { roomCode, hostToken, extraSeconds });
  }, [roomCode, hostToken]);

  const setTimerDuration = useCallback((timerDurationSeconds: number) => {
    socketRef.current?.emit("set_timer_duration", { roomCode, hostToken, timerDurationSeconds });
  }, [roomCode, hostToken]);

  const kickUser = useCallback((targetSessionId: string) => {
    socketRef.current?.emit("kick_user", { roomCode, hostToken, sessionId: targetSessionId });
  }, [roomCode, hostToken]);

  const reassignTeam = useCallback((teamCode: string, newSessionId: string, newOwnerName: string) => {
    socketRef.current?.emit("reassign_team", { roomCode, hostToken, teamCode, newSessionId, newOwnerName });
  }, [roomCode, hostToken]);

  const editPurse = useCallback((teamCode: string, newPurse: number) => {
    socketRef.current?.emit("edit_purse", { roomCode, hostToken, teamCode, newPurse });
  }, [roomCode, hostToken]);

  const clearRejection = useCallback(() => setLastRejection(null), []);

  const sendChat = useCallback((message: string) => {
    socketRef.current?.emit("chat", { roomCode, sessionId, message });
  }, [roomCode, sessionId]);

  return {
    roomState, isConnected, sessionId, displayName, hostToken,
    myTeamCode, isHost, lastRejection, socket: socketRef.current,
    bid, claimTeam, releaseTeam, hostAction, extendTimer, setTimerDuration,
    kickUser, reassignTeam, editPurse, clearRejection, sendChat,
  };
}
