"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useAuctionSocket = useAuctionSocket;
const react_1 = require("react");
const socket_io_client_1 = require("socket.io-client");
function getCookie(name) {
    if (typeof document === "undefined")
        return "";
    const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
    return match ? decodeURIComponent(match[2]) : "";
}
function useAuctionSocket(roomCode) {
    const [roomState, setRoomState] = (0, react_1.useState)(null);
    const [isConnected, setIsConnected] = (0, react_1.useState)(false);
    const [myTeamCode, setMyTeamCode] = (0, react_1.useState)(null);
    const [lastRejection, setLastRejection] = (0, react_1.useState)(null);
    const socketRef = (0, react_1.useRef)(null);
    const sessionId = getCookie("sessionId");
    const displayName = getCookie("displayName");
    const hostToken = getCookie("hostToken");
    const isHost = !!(hostToken && roomState?.hostSessionId === sessionId);
    (0, react_1.useEffect)(() => {
        if (!roomCode || !sessionId)
            return;
        const socket = (0, socket_io_client_1.io)("http://localhost:3001", {
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
        socket.on("room_state", (state) => {
            setRoomState(state);
            // Update my team code from state
            const myTeam = Object.values(state.teams).find((t) => t.ownerSessionId === sessionId);
            setMyTeamCode(myTeam?.code ?? null);
        });
        socket.on("team_confirmed", ({ teamCode }) => {
            setMyTeamCode(teamCode);
        });
        socket.on("bid_rejected", ({ reason }) => {
            setLastRejection(reason);
        });
        socket.on("claim_rejected", ({ reason }) => {
            setLastRejection(reason);
        });
        socket.on("kicked", ({ reason }) => {
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
    const bid = (0, react_1.useCallback)((amount) => {
        if (!myTeamCode || !socketRef.current)
            return;
        socketRef.current.emit("bid", { roomCode, teamCode: myTeamCode, sessionId, amount });
    }, [roomCode, sessionId, myTeamCode]);
    const claimTeam = (0, react_1.useCallback)((teamCode) => {
        socketRef.current?.emit("claim_team", { roomCode, teamCode, sessionId });
    }, [roomCode, sessionId]);
    const releaseTeam = (0, react_1.useCallback)((teamCode) => {
        socketRef.current?.emit("release_team", { roomCode, teamCode, sessionId });
    }, [roomCode, sessionId]);
    const hostAction = (0, react_1.useCallback)((action) => {
        socketRef.current?.emit("host_action", { roomCode, hostToken, action });
    }, [roomCode, hostToken]);
    const extendTimer = (0, react_1.useCallback)((extraSeconds) => {
        socketRef.current?.emit("extend_timer", { roomCode, hostToken, extraSeconds });
    }, [roomCode, hostToken]);
    const setTimerDuration = (0, react_1.useCallback)((timerDurationSeconds) => {
        socketRef.current?.emit("set_timer_duration", { roomCode, hostToken, timerDurationSeconds });
    }, [roomCode, hostToken]);
    const kickUser = (0, react_1.useCallback)((targetSessionId) => {
        socketRef.current?.emit("kick_user", { roomCode, hostToken, sessionId: targetSessionId });
    }, [roomCode, hostToken]);
    const reassignTeam = (0, react_1.useCallback)((teamCode, newSessionId, newOwnerName) => {
        socketRef.current?.emit("reassign_team", { roomCode, hostToken, teamCode, newSessionId, newOwnerName });
    }, [roomCode, hostToken]);
    const editPurse = (0, react_1.useCallback)((teamCode, newPurse) => {
        socketRef.current?.emit("edit_purse", { roomCode, hostToken, teamCode, newPurse });
    }, [roomCode, hostToken]);
    const clearRejection = (0, react_1.useCallback)(() => setLastRejection(null), []);
    const sendChat = (0, react_1.useCallback)((message) => {
        socketRef.current?.emit("chat", { roomCode, sessionId, message });
    }, [roomCode, sessionId]);
    return {
        roomState, isConnected, sessionId, displayName, hostToken,
        myTeamCode, isHost, lastRejection, socket: socketRef.current,
        bid, claimTeam, releaseTeam, hostAction, extendTimer, setTimerDuration,
        kickUser, reassignTeam, editPurse, clearRejection, sendChat,
    };
}
