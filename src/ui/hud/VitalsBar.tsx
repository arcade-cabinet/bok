interface VitalsBarProps {
  health: number;
  hunger: number;
  stamina: number;
}

export function VitalsBar({ health, hunger, stamina }: VitalsBarProps) {
  return (
    <div className="flex flex-col items-center gap-2 mb-3">
      {/* Health & Hunger */}
      <div className="flex gap-4 w-72 justify-center">
        <div className="w-24 h-2 rounded-full overflow-hidden bg-black/60 border border-white/15 shadow-lg">
          <div
            className="h-full transition-[width] duration-200 rounded-full"
            style={{
              width: `${Math.max(0, health)}%`,
              background: "linear-gradient(90deg, #c62828, #ff5252)",
            }}
          />
        </div>
        <div className="w-24 h-2 rounded-full overflow-hidden bg-black/60 border border-white/15 shadow-lg">
          <div
            className="h-full transition-[width] duration-200 rounded-full"
            style={{
              width: `${Math.max(0, hunger)}%`,
              background: "linear-gradient(90deg, #ef6c00, #ffa726)",
            }}
          />
        </div>
      </div>
      {/* Stamina */}
      <div className="w-52 h-1 rounded-full overflow-hidden bg-black/60 border border-white/10 shadow-lg">
        <div
          className="h-full transition-[width] duration-100 rounded-full"
          style={{
            width: `${Math.max(0, stamina)}%`,
            background: "linear-gradient(90deg, #1565c0, #4fc3f7)",
          }}
        />
      </div>
    </div>
  );
}
