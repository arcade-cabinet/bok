interface CrosshairProps {
  isMining: boolean;
  miningProgress: number;
}

export function Crosshair({ isMining, miningProgress }: CrosshairProps) {
  const circumference = 2 * Math.PI * 14;
  const offset = circumference - miningProgress * circumference;

  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center">
      <svg className="absolute -rotate-90 w-8 h-8" viewBox="0 0 30 30">
        <circle
          cx="15"
          cy="15"
          r="14"
          fill="none"
          stroke="rgba(255,215,0,0.9)"
          strokeWidth="3"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: "stroke-dashoffset 0.1s linear",
            filter: "drop-shadow(0 0 2px rgba(0,0,0,0.8))",
          }}
        />
      </svg>
      <div
        className={`w-1 h-1 rounded-full transition-transform duration-100 ${
          isMining ? "scale-150 bg-amber-400" : "bg-white"
        }`}
        style={{ boxShadow: "0 0 4px rgba(0,0,0,0.8)" }}
      />
    </div>
  );
}
