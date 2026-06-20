"use client";
import { useState } from "react";
import { RoomState } from "@/types";

interface HostPanelProps {
  state: RoomState;
  onHostAction: (action: string) => void;
  onExtendTimer: (extra: number) => void;
  onSetTimerDuration: (secs: number) => void;
  onKickUser: (sessionId: string) => void;
  onReassignTeam: (teamCode: string, newSessionId: string, newOwnerName: string) => void;
  onEditPurse: (teamCode: string, newPurse: number) => void;
}

export default function HostPanel({
  state,
  onExtendTimer,
  onSetTimerDuration,
}: HostPanelProps) {
  const [newTimerSecs, setNewTimerSecs] = useState(state.timerDurationSeconds);

  return (
    <div
      className="w-full rounded-xl overflow-hidden"
      style={{
        background: "rgba(10, 15, 30, 0.5)",
        border: "1px solid rgba(242,183,5,0.3)",
      }}
    >
      {/* Panel header */}
      <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: "1px solid rgba(242,183,5,0.15)" }}>
        <span className="text-amber-bid font-bold text-sm">🎙️ HOST CONTROL PANEL</span>
        <span className="ml-auto text-xs px-2 py-0.5 rounded font-bold"
          style={{ background: state.status === "live" ? "rgba(31,170,89,0.2)" : "rgba(242,183,5,0.2)", color: state.status === "live" ? "#1FAA59" : "#F2B705" }}>
          {state.status.toUpperCase()}
        </span>
      </div>

      <div className="p-4 space-y-4">
        {/* ── TIMER TAB ── */}
        <div className="space-y-3">
          <p className="text-muted text-xs uppercase tracking-wide">Timer</p>
          <div className="flex gap-2">
            {[5, 10, 15, 30].map((s) => (
              <button key={s} onClick={() => onExtendTimer(s)}
                className="flex-1 py-2 rounded-lg text-sm font-bold transition-all hover:bg-[rgba(242,183,5,0.2)]"
                style={{ background: "rgba(242,183,5,0.1)", border: "1px solid rgba(242,183,5,0.2)", color: "#F2B705" }}>
                +{s}s
              </button>
            ))}
          </div>
          <div className="flex gap-2 items-center mt-2">
            <input
              type="number"
              value={newTimerSecs}
              min={5}
              max={120}
              onChange={(e) => setNewTimerSecs(Number(e.target.value))}
              className="input-field py-2 text-sm w-24"
            />
            <button
              onClick={() => onSetTimerDuration(newTimerSecs)}
              className="btn-secondary text-sm py-2 flex-1"
            >
              Set timer for next player
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
