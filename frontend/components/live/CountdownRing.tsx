"use client";
import { useEffect, useRef, memo } from "react";

interface CountdownRingProps {
  timerEndsAt: number | null;
  timerDurationSeconds: number;
  isPaused: boolean;
  size?: number;
  isSoundEnabled?: boolean;
}

function CountdownRingComponent({
  timerEndsAt,
  timerDurationSeconds,
  isPaused,
  size = 160,
  isSoundEnabled = true,
}: CountdownRingProps) {
  const svgCircleRef = useRef<SVGCircleElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const animRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const prevSecondsRef = useRef<number | null>(null);

  useEffect(() => {
    const initAudio = () => {
      if (!audioCtxRef.current) {
        try {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContextClass) audioCtxRef.current = new AudioContextClass();
        } catch (e) {}
      }
    };
    window.addEventListener('click', initAudio, { once: true });
    window.addEventListener('keydown', initAudio, { once: true });
    return () => {
      window.removeEventListener('click', initAudio);
      window.removeEventListener('keydown', initAudio);
    };
  }, []);

  const playBeep = () => {
    if (!audioCtxRef.current || !isSoundEnabled) return;
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();
    
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
    
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
    gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  };

  useEffect(() => {
    if (!timerEndsAt || isPaused) return;

    const totalMs = timerDurationSeconds * 1000;
    const radius = (size - 16) / 2;
    const circumference = 2 * Math.PI * radius;

    const tick = () => {
      const remaining = Math.max(0, timerEndsAt - Date.now());
      
      const fraction = timerEndsAt ? Math.max(0, Math.min(1, remaining / totalMs)) : 1;
      const seconds = Math.max(0, Math.ceil(remaining / 1000));
      const isEmpty = seconds === 0;
      const isCritical = seconds <= 5 && seconds > 0;
      
      if (svgCircleRef.current) {
        const dashOffset = circumference * (1 - fraction);
        svgCircleRef.current.style.strokeDashoffset = dashOffset.toString();
        svgCircleRef.current.style.stroke = isEmpty ? "#EF4444" : isCritical ? "#EF4444" : fraction > 0.5 ? "#22C55E" : "#F59E0B";
      }

      if (textRef.current) {
        textRef.current.textContent = seconds.toString();
        textRef.current.className = `font-display font-black tabular-nums leading-none ${isCritical ? "text-status-danger" : "text-white"}`;
      }

      if (seconds !== prevSecondsRef.current) {
        if (prevSecondsRef.current !== null && isCritical) {
          playBeep();
        }
        prevSecondsRef.current = seconds;
      }

      if (remaining > 0) {
        animRef.current = requestAnimationFrame(tick);
      }
    };

    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [timerEndsAt, timerDurationSeconds, isPaused, size]);

  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;

  // Initial calculation for first render
  const initRemaining = timerEndsAt ? Math.max(0, timerEndsAt - Date.now()) : timerDurationSeconds * 1000;
  const initSeconds = Math.max(0, Math.ceil(initRemaining / 1000));
  const initFraction = timerEndsAt ? Math.max(0, Math.min(1, initRemaining / (timerDurationSeconds * 1000))) : 1;
  const initIsCritical = initSeconds <= 5 && initSeconds > 0;
  const initIsEmpty = initSeconds === 0;

  const initialRingColor = initIsEmpty ? "#EF4444" : initIsCritical ? "#EF4444" : initFraction > 0.5 ? "#22C55E" : "#F59E0B";

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="absolute inset-0 -rotate-90" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={8}
        />
        <circle
          ref={svgCircleRef}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={initialRingColor}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - initFraction)}
          style={{ transition: "stroke 0.5s ease" }}
        />
      </svg>

      <div className="relative flex flex-col items-center justify-center z-10">
        {isPaused ? (
          <div className="text-status-warning font-display font-black text-2xl">⏸</div>
        ) : (
          <>
            <span
              ref={textRef}
              className={`font-display font-black tabular-nums leading-none ${
                initIsCritical ? "text-status-danger" : "text-white"
              }`}
              style={{ fontSize: size * 0.28 }}
            >
              {initSeconds}
            </span>
            <span className="text-muted text-xs uppercase tracking-widest mt-0.5">sec</span>
          </>
        )}
      </div>
    </div>
  );
}

export default memo(CountdownRingComponent, (prev, next) => {
  return (
    prev.timerEndsAt === next.timerEndsAt &&
    prev.timerDurationSeconds === next.timerDurationSeconds &&
    prev.isPaused === next.isPaused &&
    prev.isSoundEnabled === next.isSoundEnabled
  );
});
