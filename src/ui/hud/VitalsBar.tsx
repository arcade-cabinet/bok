interface VitalsBarProps {
	health: number;
	hunger: number;
	stamina: number;
	hungerSlowed?: boolean;
	/** When false, hides the numeric bars (diegetic mode). Defaults to true. */
	visible?: boolean;
}

export function VitalsBar({ health, hunger, stamina, hungerSlowed = false, visible = true }: VitalsBarProps) {
	if (!visible) return null;

	return (
		<div className="flex flex-col items-center gap-2 mb-3" data-testid="vitals-bar">
			{/* Health & Hunger */}
			<div className="flex gap-4 w-72 justify-center">
				<div className="w-24 h-2 rounded-full overflow-hidden bg-black/60 border border-white/15 shadow-lg">
					<div
						className="h-full transition-[width] duration-200 rounded-full"
						style={{
							width: `${Math.max(0, Math.min(100, health))}%`,
							background: "linear-gradient(90deg, #c62828, #ff5252)",
						}}
					/>
				</div>
				<div className="relative w-24 h-2 rounded-full overflow-hidden bg-black/60 border border-white/15 shadow-lg">
					<div
						className={`h-full transition-[width] duration-200 rounded-full ${hungerSlowed ? "animate-pulse" : ""}`}
						style={{
							width: `${Math.max(0, Math.min(100, hunger))}%`,
							background: hungerSlowed
								? "linear-gradient(90deg, #bf360c, #ff6e40)"
								: "linear-gradient(90deg, #ef6c00, #ffa726)",
						}}
					/>
				</div>
			</div>
			{/* Stamina */}
			<div className="w-52 h-1 rounded-full overflow-hidden bg-black/60 border border-white/10 shadow-lg">
				<div
					className="h-full transition-[width] duration-100 rounded-full"
					style={{
						width: `${Math.max(0, Math.min(100, stamina))}%`,
						background: "linear-gradient(90deg, #1565c0, #4fc3f7)",
					}}
				/>
			</div>
			{/* Slow movement indicator */}
			{hungerSlowed && (
				<div
					className="text-xs font-bold text-orange-300 animate-pulse"
					style={{ textShadow: "1px 1px 2px #000" }}
					aria-live="polite"
				>
					Hungry — movement slowed
				</div>
			)}
		</div>
	);
}
