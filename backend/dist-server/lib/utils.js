"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatLakhs = formatLakhs;
exports.getRoleBadgeClass = getRoleBadgeClass;
exports.getRoleEmoji = getRoleEmoji;
exports.formatTimer = formatTimer;
exports.getCookie = getCookie;
function formatLakhs(lakhs) {
    if (lakhs >= 100) {
        const cr = lakhs / 100;
        return `₹${cr % 1 === 0 ? cr : cr.toFixed(2)} Cr`;
    }
    return `₹${lakhs} L`;
}
function getRoleBadgeClass(role) {
    switch (role) {
        case "Batter": return "role-badge role-batter";
        case "Bowler": return "role-badge role-bowler";
        case "All-Rounder": return "role-badge role-allround";
        case "Wicketkeeper": return "role-badge role-wk";
    }
}
function getRoleEmoji(role) {
    switch (role) {
        case "Batter": return "🏏";
        case "Bowler": return "🎳";
        case "All-Rounder": return "⭐";
        case "Wicketkeeper": return "🧤";
    }
}
function formatTimer(remainingMs) {
    const secs = Math.max(0, Math.ceil(remainingMs / 1000));
    return secs.toString();
}
function getCookie(name) {
    if (typeof document === "undefined")
        return "";
    const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
    return match ? decodeURIComponent(match[2]) : "";
}
