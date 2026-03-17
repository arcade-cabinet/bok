interface CrosshairProps {
	isMining: boolean;
	miningProgress: number;
	/** True when the camera raycast hits a solid block within reach. */
	lookingAtBlock: boolean;
}

export function Crosshair({ isMining, miningProgress, lookingAtBlock }: CrosshairProps) {
	const clamped = Math.max(0, Math.min(1, miningProgress));
	const circumference = 2 * Math.PI * 14;
	const offset = circumference - clamped * circumference;

	// DOOM-style: dot only visible when looking at interactable target
	const dotVisible = lookingAtBlock || isMining;

	return (
		<div
			className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center"
			aria-hidden="true"
			data-testid="crosshair"
		>
			{/* Mining progress ring — only while actively mining */}
			{isMining && (
				<svg
					className="absolute -rotate-90 w-8 h-8"
					viewBox="0 0 30 30"
					aria-hidden="true"
					data-testid="crosshair-ring"
				>
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
			)}
			{/* Center dot — contextual visibility */}
			<div
				className={`rounded-full transition-all duration-100 ${
					isMining ? "w-1.5 h-1.5 bg-amber-400" : lookingAtBlock ? "w-1 h-1 bg-white" : "w-0.5 h-0.5 bg-white/30"
				}`}
				style={{ boxShadow: dotVisible ? "0 0 4px rgba(0,0,0,0.8)" : "none" }}
			/>
		</div>
	);
}
