interface DeathScreenProps {
	onRespawn: () => void;
}

export function DeathScreen({ onRespawn }: DeathScreenProps) {
	return (
		<div
			role="alert"
			className="absolute inset-0 z-50 flex flex-col items-center justify-center pointer-events-auto"
			style={{
				background: "radial-gradient(ellipse at center, rgba(80,0,0,0.85) 0%, rgba(20,0,0,0.97) 70%)",
				backdropFilter: "blur(8px)",
			}}
		>
			<h1
				className="font-display text-6xl font-black tracking-wider mb-4"
				style={{
					color: "#ff5252",
					textShadow: "0 0 40px rgba(255,50,50,0.4), 0 10px 30px rgba(0,0,0,0.5)",
				}}
			>
				FALLEN
			</h1>
			<p className="text-base opacity-80 mb-8" style={{ color: "var(--color-bok-parchment)" }}>
				The wilderness claims another soul. But the land remembers.
			</p>
			<button
				type="button"
				onClick={onRespawn}
				className="btn btn-lg border-none font-display text-lg tracking-[0.2em] uppercase transition-all duration-300 hover:scale-105"
				style={{
					background: "var(--color-bok-parchment)",
					color: "var(--color-bok-ink)",
					boxShadow: "0 0 30px rgba(224,213,193,0.15)",
				}}
			>
				Return
			</button>
		</div>
	);
}
