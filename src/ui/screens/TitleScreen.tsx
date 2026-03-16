import { useCallback, useState } from "react";
import { generateRandomSeedString } from "../../world/noise.ts";

const PARTICLES = Array.from({ length: 20 }, (_, i) => ({
	id: `particle-${i}`,
	left: Math.random() * 100,
	duration: 8 + Math.random() * 12,
	delay: Math.random() * 8,
}));

function ParticleField() {
	return (
		<div className="absolute inset-0 overflow-hidden pointer-events-none">
			{PARTICLES.map((p) => (
				<div
					key={p.id}
					className="absolute w-1 h-1 rounded-full bg-amber-200 opacity-20"
					style={{
						left: `${p.left}%`,
						bottom: `-5%`,
						animation: `float-up ${p.duration}s linear ${p.delay}s infinite`,
					}}
				/>
			))}
		</div>
	);
}

interface TitleScreenProps {
	onStartGame: (seed: string) => void;
	onContinueGame?: () => void;
}

export function TitleScreen({ onStartGame, onContinueGame }: TitleScreenProps) {
	const [seed, setSeed] = useState(generateRandomSeedString);

	const handleReroll = useCallback(() => {
		setSeed(generateRandomSeedString());
	}, []);

	const handleStart = useCallback(() => {
		onStartGame(seed);
	}, [onStartGame, seed]);

	return (
		<div
			className="absolute inset-0 z-50 flex flex-col items-center justify-center pointer-events-auto"
			style={{
				background: "radial-gradient(ellipse at center, rgba(26,26,46,0.85) 0%, rgba(5,5,8,0.97) 70%)",
				backdropFilter: "blur(8px)",
			}}
		>
			{/* Atmospheric particles */}
			<ParticleField />

			{/* Title */}
			<div className="text-center mb-8" style={{ animation: "title-emerge 2s ease-out" }}>
				<h1
					className="font-display text-8xl font-black tracking-widest mb-2"
					style={{
						color: "var(--color-bok-parchment)",
						textShadow: "0 0 60px rgba(201,168,76,0.3), 0 10px 30px rgba(0,0,0,0.5)",
					}}
				>
					BOK
				</h1>
				<p
					className="font-display text-sm tracking-[0.3em] uppercase"
					style={{
						color: "var(--color-bok-gold)",
						animation: "subtitle-fade 2s ease-out 0.5s both",
					}}
				>
					A world remembers those who shape it
				</p>
			</div>

			{/* Lore text */}
			<p
				className="text-center max-w-md mb-8 text-sm leading-relaxed opacity-60"
				style={{
					color: "var(--color-bok-parchment)",
					animation: "subtitle-fade 2s ease-out 1s both",
				}}
			>
				You awaken on stone, surrounded by torchlight. The land stretches endlessly, carved by forces older than memory.
				What you build here will echo.
			</p>

			{/* Seed input */}
			<div
				className="glass-panel flex items-center gap-3 px-4 py-3 mb-6"
				style={{ animation: "subtitle-fade 2s ease-out 1.2s both" }}
			>
				<span className="text-xs tracking-wider uppercase opacity-40" style={{ color: "var(--color-bok-parchment)" }}>
					Seed
				</span>
				<input
					type="text"
					value={seed}
					onChange={(e) => setSeed(e.target.value)}
					className="bg-transparent border-none outline-none text-center font-mono text-lg font-bold w-64"
					style={{ color: "var(--color-bok-gold)" }}
					spellCheck={false}
					autoComplete="off"
					aria-label="World seed"
				/>
				<button
					type="button"
					onClick={handleReroll}
					className="btn btn-ghost btn-xs text-xs tracking-wider opacity-60 hover:opacity-100"
					style={{ color: "var(--color-bok-parchment)" }}
				>
					REROLL
				</button>
			</div>

			{/* Action buttons */}
			<div className="flex flex-col items-center gap-3" style={{ animation: "subtitle-fade 2s ease-out 1.5s both" }}>
				{onContinueGame && (
					<button
						type="button"
						onClick={onContinueGame}
						className="btn btn-lg border-none font-display text-lg tracking-[0.2em] uppercase transition-all duration-300 hover:scale-105"
						style={{
							background: "var(--color-bok-gold)",
							color: "var(--color-bok-ink)",
							boxShadow: "0 0 30px rgba(201,168,76,0.2)",
						}}
					>
						Continue
					</button>
				)}
				<button
					type="button"
					onClick={handleStart}
					className="btn btn-lg border-none font-display text-lg tracking-[0.2em] uppercase transition-all duration-300 hover:scale-105"
					style={{
						background: "var(--color-bok-parchment)",
						color: "var(--color-bok-ink)",
						boxShadow: "0 0 30px rgba(224,213,193,0.15)",
					}}
				>
					Awaken
				</button>
			</div>

			{/* Controls hint */}
			<div
				className="mt-12 text-center text-xs opacity-30 space-y-1"
				style={{
					color: "var(--color-bok-parchment)",
					animation: "subtitle-fade 2s ease-out 2s both",
				}}
			>
				<p>WASD Move &middot; Mouse Look &middot; Left Click Mine &middot; Right Click Place</p>
				<p>E Inventory &middot; 1-5 Hotbar &middot; Shift Sprint &middot; Space Jump</p>
			</div>
		</div>
	);
}
