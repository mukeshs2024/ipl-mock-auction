"use client";
import { Team } from "@/types";

interface TeamBadgeProps {
  team: Pick<Team, "code" | "name" | "colorHex">;
  size?: "sm" | "md" | "lg" | "xl";
  showName?: boolean;
}

// Generate a simple SVG abstract crest — no official IP
export function TeamBadgeSVG({ team, size = "md" }: { team: Pick<Team, "code" | "colorHex">; size?: "sm" | "md" | "lg" | "xl" }) {
  const sizes = { sm: 32, md: 48, lg: 64, xl: 96 };
  const px = sizes[size];
  const fontSize = { sm: 10, md: 14, lg: 18, xl: 26 }[size];

  // Generate a hex color with 60% opacity for the secondary
  const hex = team.colorHex;

  return (
    <svg width={px} height={px} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      {/* Shield shape */}
      <defs>
        <linearGradient id={`grad-${team.code}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={hex} stopOpacity="1" />
          <stop offset="100%" stopColor={hex} stopOpacity="0.6" />
        </linearGradient>
      </defs>
      {/* Shield path */}
      <path
        d="M50 5 L90 20 L90 55 Q90 80 50 95 Q10 80 10 55 L10 20 Z"
        fill={`url(#grad-${team.code})`}
        stroke={hex}
        strokeWidth="2"
        opacity="0.9"
      />
      {/* Inner shield highlight */}
      <path
        d="M50 12 L83 25 L83 54 Q83 75 50 88 Q17 75 17 54 L17 25 Z"
        fill="none"
        stroke="rgba(255,255,255,0.15)"
        strokeWidth="1"
      />
      {/* Horizontal stripe */}
      <rect x="10" y="45" width="80" height="12" fill="rgba(0,0,0,0.25)" />
      {/* Team code text */}
      <text
        x="50"
        y="53"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={fontSize}
        fontWeight="900"
        fontFamily="Barlow Condensed, sans-serif"
        fill="white"
        letterSpacing="1"
      >
        {team.code}
      </text>
    </svg>
  );
}

export default function TeamBadge({ team, size = "md", showName = false }: TeamBadgeProps) {
  return (
    <div className="flex items-center gap-2">
      <TeamBadgeSVG team={team} size={size} />
      {showName && (
        <span className="font-semibold text-white">{team.name}</span>
      )}
    </div>
  );
}
