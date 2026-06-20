import { Role } from "@/types";

export function formatLakhs(lakhs: number): string {
  if (lakhs >= 100) {
    const cr = lakhs / 100;
    return `₹${cr % 1 === 0 ? cr : cr.toFixed(2)} Cr`;
  }
  return `₹${lakhs} L`;
}

export function getRoleBadgeClass(role: Role): string {
  switch (role) {
    case "Batter": return "role-badge role-batter";
    case "Bowler": return "role-badge role-bowler";
    case "All-Rounder": return "role-badge role-allround";
    case "Wicketkeeper": return "role-badge role-wk";
  }
}

export function getRoleEmoji(role: Role): string {
  switch (role) {
    case "Batter": return "🏏";
    case "Bowler": return "🎳";
    case "All-Rounder": return "⭐";
    case "Wicketkeeper": return "🧤";
  }
}

export function formatTimer(remainingMs: number): string {
  const secs = Math.max(0, Math.ceil(remainingMs / 1000));
  return secs.toString();
}

export function getCookie(name: string): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : "";
}
