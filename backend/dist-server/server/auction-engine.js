"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNextBidAmount = getNextBidAmount;
exports.validateBid = validateBid;
exports.advanceToNextPlayer = advanceToNextPlayer;
exports.finalizePlayer = finalizePlayer;
exports.formatLakhs = formatLakhs;
const types_1 = require("../types");
const shuffle_1 = require("../lib/shuffle");
// ============================================================
// Bid increment calculation
// Returns the minimum valid next bid given the current bid
// ============================================================
function getNextBidAmount(currentBid, slabs = types_1.DEFAULT_BID_SLABS) {
    for (const slab of slabs) {
        if (currentBid >= slab.from && currentBid < slab.to) {
            return currentBid + slab.increment;
        }
    }
    // Fallback: use last slab's increment
    const last = slabs[slabs.length - 1];
    return currentBid + last.increment;
}
// ============================================================
// Validate whether a bid is legal given current room state
// Returns null if valid, or an error reason string.
// ============================================================
function validateBid(state, teamCode, bidAmount, slabs = types_1.DEFAULT_BID_SLABS) {
    if (state.status !== "live")
        return "Auction is not live";
    if (!state.currentPlayer)
        return "No player currently up for bid";
    if (state.currentBidderTeam === teamCode)
        return "Already the highest bidder";
    const team = state.teams[teamCode];
    if (!team)
        return "Unknown team";
    const minNextBid = state.currentBid === 0
        ? state.currentPlayer.basePrice
        : getNextBidAmount(state.currentBid, slabs);
    if (bidAmount < minNextBid) {
        return `Bid must be at least ₹${formatLakhs(minNextBid)}`;
    }
    // v1: simple purse check
    // TODO: Add minimum-squad-size reservation here in v2:
    //   const remainingRequired = MIN_SQUAD_SIZE - team.squad.length;
    //   const minReserve = remainingRequired * BASE_RESERVE_PER_PLAYER;
    //   if (team.purseRemaining - bidAmount < minReserve) return "Insufficient purse for squad requirements";
    if (team.purseRemaining < bidAmount) {
        return `Insufficient purse (₹${formatLakhs(team.purseRemaining)} remaining)`;
    }
    return null; // valid
}
// ============================================================
// Advance to the next player in the current set queue.
// If the set is exhausted, advance to the next set (with fresh shuffle).
// If all sets are exhausted (and re-auction not needed), return "ended".
// Returns the updated partial RoomState fields.
// ============================================================
function advanceToNextPlayer(state, allPlayers) {
    // Dequeue the remaining queue (currentPlayer was just processed)
    const remainingQueue = [...state.currentSetQueue];
    // If there are more players in the current set, take the next one
    if (remainingQueue.length > 0) {
        const nextPlayer = remainingQueue.shift();
        return {
            currentSetQueue: remainingQueue,
            currentPlayer: { ...nextPlayer, status: "in_auction" },
            currentBid: 0,
            currentBidderTeam: null,
            timerEndsAt: Date.now() + state.timerDurationSeconds * 1000,
        };
    }
    // Current set is done — try next set
    let nextSetIndex = state.currentSetIndex + 1;
    const sets = state.sets;
    // Skip empty sets
    while (nextSetIndex < sets.length) {
        const setName = sets[nextSetIndex];
        const setPlayers = allPlayers.filter((p) => p.set === setName && p.status === "upcoming");
        if (setPlayers.length > 0) {
            const shuffled = (0, shuffle_1.fisherYatesShuffle)(setPlayers);
            const nextPlayer = shuffled.shift();
            return {
                currentSetIndex: nextSetIndex,
                currentSetQueue: shuffled,
                currentPlayer: { ...nextPlayer, status: "in_auction" },
                currentBid: 0,
                currentBidderTeam: null,
                timerEndsAt: Date.now() + state.timerDurationSeconds * 1000,
            };
        }
        nextSetIndex++;
    }
    // Check if re-auction phase should start
    if (state.reunsoldPhaseEnabled && !state.reunsoldPhaseActive && state.unsoldPlayers.length > 0) {
        const shuffled = (0, shuffle_1.fisherYatesShuffle)([...state.unsoldPlayers]);
        const nextPlayer = shuffled.shift();
        return {
            reunsoldPhaseActive: true,
            currentSetIndex: nextSetIndex,
            currentSetQueue: shuffled,
            currentPlayer: { ...nextPlayer, status: "in_auction" },
            currentBid: 0,
            currentBidderTeam: null,
            timerEndsAt: Date.now() + state.timerDurationSeconds * 1000,
        };
    }
    // All sets exhausted — auction ended
    return {
        status: "ended",
        currentPlayer: null,
        currentBid: 0,
        currentBidderTeam: null,
        timerEndsAt: null,
        currentSetQueue: [],
    };
}
// ============================================================
// Finalize a player (sold or unsold) — mutates partial state
// ============================================================
function finalizePlayer(state, player, soldTo, soldPrice) {
    const teams = { ...state.teams };
    let updatedPlayer;
    let updatedSold = [...state.soldPlayers];
    let updatedUnsold = [...state.unsoldPlayers];
    let updatedAll = state.allPlayers.map((p) => (p.id === player.id ? { ...p } : p));
    if (soldTo && soldPrice !== null) {
        updatedPlayer = { ...player, status: "sold", soldTo, soldPrice };
        teams[soldTo] = {
            ...teams[soldTo],
            purseRemaining: teams[soldTo].purseRemaining - soldPrice,
            squad: [...teams[soldTo].squad, updatedPlayer],
        };
        updatedSold.push(updatedPlayer);
    }
    else {
        updatedPlayer = { ...player, status: "unsold" };
        updatedUnsold.push(updatedPlayer);
    }
    updatedAll = updatedAll.map((p) => (p.id === player.id ? updatedPlayer : p));
    return {
        teams,
        soldPlayers: updatedSold,
        unsoldPlayers: updatedUnsold,
        allPlayers: updatedAll,
        soldPlayersCount: updatedSold.length,
    };
}
// ============================================================
// Format Lakhs for display
// ============================================================
function formatLakhs(lakhs) {
    if (lakhs >= 100) {
        const cr = lakhs / 100;
        return `₹${cr % 1 === 0 ? cr : cr.toFixed(2)} Cr`;
    }
    return `₹${lakhs} L`;
}
