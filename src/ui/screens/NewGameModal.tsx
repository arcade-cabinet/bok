/**
 * New Game modal — seed customization overlay.
 * Adjective-Adjective-Noun seed format with shuffle button.
 */

import { useCallback, useState } from "react";
import { generateRandomSeedString } from "../../world/noise.ts";

interface NewGameModalProps {
	onStart: (seed: string) => void;
	onClose: () => void;
}

export function NewGameModal({ onStart, onClose }: NewGameModalProps) {
	const [seed, setSeed] = useState(generateRandomSeedString);

	const handleShuffle = useCallback(() => {
		setSeed(generateRandomSeedString());
	}, []);

	const handleStart = useCallback(() => {
		if (seed.trim()) onStart(seed.trim());
	}, [onStart, seed]);

	return (
		<div
			className="absolute inset-0 z-60 flex items-center justify-center"
			style={{ background: "rgba(5,5,16,0.85)", backdropFilter: "blur(6px)" }}
		>
			<div
				className="glass-panel p-8 w-full max-w-md mx-4 flex flex-col items-center gap-6"
				style={{ animation: "title-emerge 0.4s ease-out" }}
			>
				{/* Header */}
				<h2
					className="font-display text-2xl tracking-[0.15em] uppercase"
					style={{ color: "var(--color-bok-parchment)" }}
				>
					New Saga
				</h2>

				<p className="text-sm text-center opacity-50" style={{ color: "var(--color-bok-parchment)" }}>
					Every world is born from a name. Speak it, or let fate decide.
				</p>

				{/* Seed input with shuffle */}
				<div className="w-full">
					<label
						className="text-xs tracking-wider uppercase opacity-40 mb-2 block"
						style={{ color: "var(--color-bok-parchment)" }}
						htmlFor="seed-input"
					>
						World Seed
					</label>
					<div className="flex items-center gap-2">
						<input
							id="seed-input"
							type="text"
							value={seed}
							onChange={(e) => setSeed(e.target.value)}
							className="glass-panel flex-1 px-4 py-3 bg-transparent border-none outline-none text-center font-mono text-lg font-bold"
							style={{ color: "var(--color-bok-gold)" }}
							spellCheck={false}
							autoComplete="off"
						/>
						<button
							type="button"
							onClick={handleShuffle}
							className="btn glass-panel px-3 py-3 text-xl"
							style={{ color: "var(--color-bok-gold)" }}
							title="Shuffle seed"
							aria-label="Shuffle seed"
						>
							&#x21BB;
						</button>
					</div>
				</div>

				{/* Actions */}
				<div className="flex gap-3 w-full">
					<button
						type="button"
						onClick={onClose}
						className="btn flex-1 font-display tracking-[0.1em] uppercase"
						style={{
							background: "rgba(255,255,255,0.06)",
							color: "var(--color-bok-parchment)",
						}}
					>
						Back
					</button>
					<button
						type="button"
						onClick={handleStart}
						className="btn btn-lg flex-1 font-display tracking-[0.15em] uppercase transition-all duration-300 hover:scale-105"
						style={{
							background: "var(--color-bok-gold)",
							color: "var(--color-bok-ink)",
							boxShadow: "0 0 30px rgba(201,168,76,0.25)",
						}}
					>
						Awaken
					</button>
				</div>
			</div>
		</div>
	);
}
