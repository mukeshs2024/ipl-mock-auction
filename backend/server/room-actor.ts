import { Server as SocketServer, Socket } from "socket.io";
import { v4 as uuidv4 } from "uuid";
import {
  RoomState,
  Team,
  Player,
  ActivityLogEntry,
  IPL_TEAMS,
  DEFAULT_BID_SLABS,
} from "../types";
import {
  validateBid,
  advanceToNextPlayer,
  finalizePlayer,
  getNextBidAmount,
  formatLakhs,
} from "./auction-engine";
import { fisherYatesShuffle } from "../lib/shuffle";
import { saveRoomSnapshot, saveRoomSummary } from "./db";

// ============================================================
// RoomActor — owns all mutable state for one auction room.
//
// CONCURRENCY GUARANTEE: every incoming action is pushed onto
// a FIFO async queue. The drain loop processes exactly one
// action at a time, fully awaiting it (including any DB write)
// before starting the next. Two simultaneous bid calls will
// always resolve to exactly one winner and one rejection.
// ============================================================
export class RoomActor {
  private queue: Array<() => Promise<void>> = [];
  private processing = false;
  private timerInterval: ReturnType<typeof setInterval> | null = null;

  public state: RoomState;
  public hostToken: string;
  private io: SocketServer;

  constructor(
    io: SocketServer,
    initialState: RoomState,
    hostToken: string
  ) {
    this.io = io;
    this.state = initialState;
    this.hostToken = hostToken;
  }

  // ============================================================
  // Enqueue an action — this is the ONLY way to modify state.
  // All socket event handlers call this and return immediately.
  // ============================================================
  enqueue(action: () => Promise<void>): void {
    this.queue.push(action);
    this.drain();
  }

  private async drain(): Promise<void> {
    if (this.processing) return;
    this.processing = true;
    while (this.queue.length > 0) {
      const action = this.queue.shift()!;
      try {
        await action();
      } catch (err) {
        console.error("[RoomActor] Action error:", err);
      }
    }
    this.processing = false;
  }

  // ============================================================
  // Broadcast full state to everyone in the room
  // ============================================================
  private broadcast(): void {
    this.io.to(this.state.roomCode).emit("room_state", this.state);
  }

  // ============================================================
  // Persist snapshot + broadcast
  // ============================================================
  private async save(): Promise<void> {
    try {
      await saveRoomSnapshot(
        this.state.roomCode,
        this.state.hostSessionId,
        this.hostToken,
        this.state
      );
    } catch (err) {
      console.error("[RoomActor] DB save error:", err);
    }
    this.broadcast();
  }

  // ============================================================
  // Activity log helper
  // ============================================================
  private log(
    type: ActivityLogEntry["type"],
    message: string,
    teamCode?: string
  ): void {
    const entry: ActivityLogEntry = {
      id: uuidv4(),
      timestamp: Date.now(),
      type,
      message,
      teamCode,
    };
    // Keep last 200 entries
    this.state = {
      ...this.state,
      activityLog: [entry, ...this.state.activityLog].slice(0, 200),
    };
  }

  // ============================================================
  // Timer management
  // ============================================================
  // Public so server/index.ts can restart the timer after DB restore
  public startTimer(): void {
    this.stopTimer();
    this.timerInterval = setInterval(() => {
      this.enqueue(async () => {
        const { state } = this;
        if (
          state.status !== "live" ||
          !state.timerEndsAt ||
          !state.currentPlayer
        ) return;

        if (Date.now() < state.timerEndsAt) return; // not expired yet

        // Timer expired — finalize the current player
        const player = state.currentPlayer;
        const soldTo = state.currentBidderTeam;
        const soldPrice = state.currentBid > 0 ? state.currentBid : null;

        const finalizeUpdates = finalizePlayer(this.state, player, soldTo, soldPrice);

        const logMsg =
          soldTo
            ? `🔨 SOLD! ${player.name} → ${soldTo} for ${formatLakhs(soldPrice!)}`
            : `❌ UNSOLD — ${player.name} goes unsold`;

        this.state = { ...this.state, ...finalizeUpdates };
        this.log(soldTo ? "sold" : "unsold", logMsg, soldTo ?? undefined);

        // Advance to next player
        const advance = advanceToNextPlayer(this.state, this.state.allPlayers);
        this.state = { ...this.state, ...advance };

        if (advance.status === "ended") {
          this.log("host_action", "🏆 Auction has ended! All sets complete.");
          this.stopTimer();
          try { await saveRoomSummary(this.state.roomCode, this.state); } catch {}
        } else {
          // Reset timer for the next player
          this.state.timerEndsAt = Date.now() + this.state.timerDurationSeconds * 1000;
          
          const nextSet = this.state.sets[this.state.currentSetIndex] || "";
          if (advance.currentSetIndex !== undefined && advance.currentSetIndex !== state.currentSetIndex) {
            this.log("set_started", `📦 Set started: ${nextSet}`);
          }
        }

        await this.save();
      });
    }, 500);
  }

  public stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  // ============================================================
  // Socket connection / reconnect
  // ============================================================
  handleConnect(socket: Socket, sessionId: string): void {
    socket.join(this.state.roomCode);

    // Check if this is the host reconnecting
    const isHost = sessionId === this.state.hostSessionId;

    // Check if this sessionId owns a team
    const ownedTeamCode = Object.values(this.state.teams).find(
      (t) => t.ownerSessionId === sessionId
    )?.code;

    if (ownedTeamCode) {
      // Mark team as connected
      this.enqueue(async () => {
        this.state = {
          ...this.state,
          teams: {
            ...this.state.teams,
            [ownedTeamCode]: {
              ...this.state.teams[ownedTeamCode],
              isConnected: true,
            },
          },
        };
        await this.save();
      });
    }

    // Send immediate full state snapshot to the reconnecting client
    socket.emit("room_state", this.state);

    if (isHost) {
      socket.emit("host_confirmed", { hostToken: this.hostToken });
    }
    if (ownedTeamCode) {
      socket.emit("team_confirmed", { teamCode: ownedTeamCode });
    }
  }

  handleDisconnect(sessionId: string): void {
    this.enqueue(async () => {
      const team = Object.values(this.state.teams).find(
        (t) => t.ownerSessionId === sessionId
      );
      if (team) {
        this.state = {
          ...this.state,
          teams: {
            ...this.state.teams,
            [team.code]: { ...team, isConnected: false },
          },
        };
        this.log("left", `${team.ownerName} (${team.code}) disconnected`, team.code);
        await this.save();
      }
    });
  }

  // ============================================================
  // Claim team
  // ============================================================
  handleClaimTeam(
    socket: Socket,
    sessionId: string,
    displayName: string,
    teamCode: string
  ): void {
    this.enqueue(async () => {
      const team = this.state.teams[teamCode];
      if (!team) {
        socket.emit("claim_rejected", { reason: "Unknown team" });
        return;
      }
      if (team.ownerSessionId !== null) {
        socket.emit("claim_rejected", {
          reason: `Already claimed by ${team.ownerName}`,
        });
        return;
      }
      this.state = {
        ...this.state,
        teams: {
          ...this.state.teams,
          [teamCode]: {
            ...team,
            ownerSessionId: sessionId,
            ownerName: displayName,
            isConnected: true,
          },
        },
      };
      this.log("team_claimed", `${displayName} claimed ${team.name}`, teamCode);
      socket.emit("team_confirmed", { teamCode });
      await this.save();
    });
  }

  // ============================================================
  // Bid
  // ============================================================
  handleBid(
    socket: Socket,
    sessionId: string,
    teamCode: string,
    bidAmount: number
  ): void {
    this.enqueue(async () => {
      // Verify the socket owns this team
      const team = this.state.teams[teamCode];
      if (!team || team.ownerSessionId !== sessionId) {
        socket.emit("bid_rejected", { reason: "You do not own this team" });
        return;
      }

      const error = validateBid(this.state, teamCode, bidAmount, DEFAULT_BID_SLABS);
      if (error) {
        socket.emit("bid_rejected", { reason: error });
        return;
      }

      this.state = {
        ...this.state,
        currentBid: bidAmount,
        currentBidderTeam: teamCode,
        timerEndsAt: Date.now() + this.state.timerDurationSeconds * 1000,
      };

      this.log(
        "bid",
        `${team.name} bid ${formatLakhs(bidAmount)}`,
        teamCode
      );

      await this.save();
    });
  }

  // ============================================================
  // Host actions
  // ============================================================
  private verifyHost(socket: Socket, hostToken: string): boolean {
    if (hostToken !== this.hostToken) {
      socket.emit("host_rejected", { reason: "Invalid host token" });
      return false;
    }
    return true;
  }

  handleStartAuction(socket: Socket, hostToken: string): void {
    if (!this.verifyHost(socket, hostToken)) return;
    this.enqueue(async () => {
      if (this.state.status !== "lobby") {
        socket.emit("host_rejected", { reason: "Auction already started" });
        return;
      }
      // Start the first set
      const firstSet = this.state.sets[0];
      const setPlayers = this.state.allPlayers.filter(
        (p) => p.set === firstSet && p.status === "upcoming"
      );
      const shuffled = fisherYatesShuffle(setPlayers);
      const firstPlayer = shuffled.shift()!;

      this.state = {
        ...this.state,
        status: "live",
        currentSetIndex: 0,
        currentSetQueue: shuffled,
        currentPlayer: { ...firstPlayer, status: "in_auction" },
        currentBid: 0,
        currentBidderTeam: null,
        timerEndsAt: Date.now() + this.state.timerDurationSeconds * 1000,
      };

      this.log("auction_started", `🎉 Auction started! Set: ${firstSet}`);
      this.log("set_started", `📦 Set started: ${firstSet}`);
      this.startTimer();
      await this.save();
    });
  }

  handlePauseAuction(socket: Socket, hostToken: string): void {
    if (!this.verifyHost(socket, hostToken)) return;
    this.enqueue(async () => {
      if (this.state.status !== "live") return;
      this.state = {
        ...this.state,
        status: "paused",
        timerEndsAt: null,
      };
      this.stopTimer();
      this.log("auction_paused", "⏸️ Auction paused by host");
      await this.save();
    });
  }

  handleResumeAuction(socket: Socket, hostToken: string): void {
    if (!this.verifyHost(socket, hostToken)) return;
    this.enqueue(async () => {
      if (this.state.status !== "paused") return;
      this.state = {
        ...this.state,
        status: "live",
        timerEndsAt: Date.now() + this.state.timerDurationSeconds * 1000,
      };
      this.startTimer();
      this.log("auction_resumed", "▶️ Auction resumed by host");
      await this.save();
    });
  }

  handleSkipPlayer(socket: Socket, hostToken: string): void {
    if (!this.verifyHost(socket, hostToken)) return;
    this.enqueue(async () => {
      if (!this.state.currentPlayer) return;
      const player = this.state.currentPlayer;
      const finalizeUpdates = finalizePlayer(this.state, player, null, null);
      this.state = { ...this.state, ...finalizeUpdates };
      this.log("unsold", `⏭️ ${player.name} skipped by host → UNSOLD`);
      const advance = advanceToNextPlayer(this.state, this.state.allPlayers);
      this.state = { ...this.state, ...advance };
      if (advance.status === "ended") {
        this.log("host_action", "🏆 Auction has ended!");
        this.stopTimer();
        try { await saveRoomSummary(this.state.roomCode, this.state); } catch {}
      }
      await this.save();
    });
  }

  handleExtendTimer(socket: Socket, hostToken: string, extraSeconds: number): void {
    if (!this.verifyHost(socket, hostToken)) return;
    this.enqueue(async () => {
      if (this.state.status !== "live" || !this.state.timerEndsAt) return;
      this.state = {
        ...this.state,
        timerEndsAt: this.state.timerEndsAt + extraSeconds * 1000,
      };
      this.log("host_action", `⏱️ Timer extended by ${extraSeconds}s`);
      await this.save();
    });
  }

  handleSetTimerDuration(socket: Socket, hostToken: string, seconds: number): void {
    if (!this.verifyHost(socket, hostToken)) return;
    this.enqueue(async () => {
      const clamped = Math.max(5, seconds); // minimum 5 seconds
      this.state = { ...this.state, timerDurationSeconds: clamped };
      this.log("host_action", `⚙️ Timer set to ${clamped}s for next player`);
      await this.save();
    });
  }

  handleKickUser(socket: Socket, hostToken: string, targetSessionId: string): void {
    if (!this.verifyHost(socket, hostToken)) return;
    this.enqueue(async () => {
      // Find team owned by this session
      const team = Object.values(this.state.teams).find(
        (t) => t.ownerSessionId === targetSessionId
      );

      if (team) {
        this.state = {
          ...this.state,
          teams: {
            ...this.state.teams,
            [team.code]: {
              ...team,
              ownerSessionId: null,
              ownerName: null,
              isConnected: false,
            },
          },
        };
        this.log(
          "kicked",
          `🚫 ${team.ownerName} kicked — ${team.name} now unclaimed`,
          team.code
        );
      }

      // Disconnect the socket
      this.io.to(targetSessionId).emit("kicked", { reason: "You have been kicked by the host" });
      this.io.in(this.state.roomCode).fetchSockets().then((sockets) => {
        sockets
          .filter((s) => s.data.sessionId === targetSessionId)
          .forEach((s) => s.disconnect(true));
      });

      await this.save();
    });
  }

  handleReassignTeam(
    socket: Socket,
    hostToken: string,
    teamCode: string,
    newSessionId: string,
    newOwnerName: string
  ): void {
    if (!this.verifyHost(socket, hostToken)) return;
    this.enqueue(async () => {
      const team = this.state.teams[teamCode];
      if (!team) return;
      // Only purseRemaining and squad are preserved — per spec
      this.state = {
        ...this.state,
        teams: {
          ...this.state.teams,
          [teamCode]: {
            ...team,
            ownerSessionId: newSessionId,
            ownerName: newOwnerName,
            isConnected: false, // will be set true on reconnect
          },
        },
      };
      this.log(
        "team_reassigned",
        `🔄 ${team.name} reassigned to ${newOwnerName}`,
        teamCode
      );
      await this.save();
    });
  }

  handleEditPurse(
    socket: Socket,
    hostToken: string,
    teamCode: string,
    newPurse: number
  ): void {
    if (!this.verifyHost(socket, hostToken)) return;
    this.enqueue(async () => {
      const team = this.state.teams[teamCode];
      if (!team) return;
      this.state = {
        ...this.state,
        teams: {
          ...this.state.teams,
          [teamCode]: { ...team, purseRemaining: newPurse },
        },
      };
      this.log(
        "host_action",
        `💰 ${team.name} purse edited to ${formatLakhs(newPurse)}`,
        teamCode
      );
      await this.save();
    });
  }

  // ============================================================
  // Release room resources (called when room is cleaned up)
  // ============================================================
  destroy(): void {
    this.stopTimer();
    this.queue = [];
  }
}

// ============================================================
// Factory: create initial RoomState from parsed players
// ============================================================
export function createInitialRoomState(
  roomCode: string,
  hostSessionId: string,
  hostName: string,
  players: Player[],
  sets: string[],
  pursePerTeam: number,
  timerDurationSeconds: number,
  reunsoldPhaseEnabled: boolean
): RoomState {
  const teams: Record<string, Team> = {};
  for (const t of IPL_TEAMS) {
    teams[t.code] = {
      ...t,
      ownerSessionId: null,
      ownerName: null,
      purseRemaining: pursePerTeam,
      squad: [],
      isConnected: false,
    };
  }

  return {
    roomCode,
    hostSessionId,
    hostName,
    status: "lobby",
    teams,
    sets,
    currentSetIndex: 0,
    currentSetQueue: [],
    currentPlayer: null,
    currentBid: 0,
    currentBidderTeam: null,
    timerEndsAt: null,
    timerDurationSeconds: Math.max(5, timerDurationSeconds),
    minTimerSeconds: 5,
    pursePerTeam,
    soldPlayers: [],
    unsoldPlayers: [],
    activityLog: [],
    allPlayers: players,
    reunsoldPhaseEnabled,
    reunsoldPhaseActive: false,
    totalPlayersCount: players.length,
    soldPlayersCount: 0,
  };
}
