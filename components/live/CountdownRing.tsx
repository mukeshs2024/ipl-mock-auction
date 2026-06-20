"use client";
import { useEffect, useRef, useState } from "react";

interface CountdownRingProps {
  timerEndsAt: number | null;
  timerDurationSeconds: number;
  isPaused: boolean;
  size?: number;
}

export default function CountdownRing({
  timerEndsAt,
  timerDurationSeconds,
  isPaused,
  size = 160,
}: CountdownRingProps) {
  const [remaining, setRemaining] = useState(timerDurationSeconds * 1000);
  const animRef = useRef<number>(0);

  useEffect(() => {
    if (!timerEndsAt || isPaused) return;

    const tick = () => {
      const r = timerEndsAt - Date.now();
      setRemaining(Math.max(0, r));
      if (r > 0) {
        animRef.current = requestAnimationFrame(tick);
      }
    };
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [timerEndsAt, isPaused]);

  const totalMs = timerDurationSeconds * 1000;
  const fraction = timerEndsAt ? Math.max(0, Math.min(1, remaining / totalMs)) : 1;
  const seconds = Math.max(0, Math.ceil(remaining / 1000));
  const isCritical = seconds <= 5 && seconds > 0;
  const isEmpty = seconds === 0;

  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - fraction);

  // Colors
  const ringColor = isEmpty ? "#E2433D" : isCritical ? "#E2433D" : fraction > 0.5 ? "#1FAA59" : "#F2B705";

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Background ring */}
      <svg className="absolute inset-0 -rotate-90" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(30,45,74,0.6)"
          strokeWidth={8}
        />
        {/* Progress ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={ringColor}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: "stroke 0.5s ease, stroke-dashoffset 0.1s linear" }}
        />
      </svg>

      {/* Glow effect when critical */}
      {isCritical && (
        <div
          className="absolute inset-0 rounded-full animate-pulse-crimson"
          style={{ opacity: 0.3 }}
        />
      )}

      {/* Center content */}
      <div className="relative flex flex-col items-center justify-center z-10">
        {isPaused ? (
          <div className="text-[#F2B705] font-display font-black text-2xl">⏸</div>
        ) : (
          <>
            <span
              className={`font-display font-black tabular-nums leading-none ${
                isCritical ? "text-crimson-hot" : "text-white"
              }`}
              style={{ fontSize: size * 0.28 }}
            >
              {seconds}
            </span>
            <span className="text-muted text-xs uppercase tracking-widest mt-0.5">sec</span>
          </>
        )}
      </div>
    </div>
  );
}
