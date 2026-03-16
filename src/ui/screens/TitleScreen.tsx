/**
 * Title screen — brand-aligned landing with shader background,
 * 3-button menu (New Game / Continue / Settings), and modal routing.
 */

import { useCallback, useState } from "react";
import { NewGameModal } from "./NewGameModal.tsx";
import { RuneCanvas } from "./RuneCanvas.tsx";

type TitleView = "menu" | "newGame" | "settings";

interface TitleScreenProps {
	onStartGame: (seed: string) => void;
	onContinueGame?: () => void;
}

export function TitleScreen({ onStartGame, onContinueGame }: TitleScreenProps) {
	const [view, setView] = useState<TitleView>("menu");

	const handleNewGame = useCallback(
		(seed: string) => {
			onStartGame(seed);
		},
		[onStartGame],
	);

	return (
		<div className="absolute inset-0 z-50 pointer-events-auto">
			{/* Shader background */}
			<RuneCanvas />

			{/* Main menu */}
			{view === "menu" && (
				<div className="absolute inset-0 flex flex-col items-center justify-center" style={{ zIndex: 1 }}>
					{/* Title block */}
					<div className="text-center mb-10" style={{ animation: "title-emerge 2s ease-out" }}>
						<h1
							className="font-display text-8xl font-black tracking-widest mb-3"
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
						className="text-center max-w-md mb-10 text-sm leading-relaxed opacity-60 px-6"
						style={{
							color: "var(--color-bok-parchment)",
							animation: "subtitle-fade 2s ease-out 1s both",
						}}
					>
						You awaken on stone, surrounded by torchlight. The land stretches endlessly, carved by forces older than
						memory. What you build here will echo.
					</p>

					{/* 3-button menu */}
					<div
						className="flex flex-col items-center gap-3 w-64"
						style={{ animation: "subtitle-fade 2s ease-out 1.3s both" }}
					>
						{onContinueGame && (
							<MenuButton variant="primary" onClick={onContinueGame}>
								Continue Saga
							</MenuButton>
						)}
						<MenuButton variant={onContinueGame ? "secondary" : "primary"} onClick={() => setView("newGame")}>
							New Game
						</MenuButton>
						<MenuButton variant="ghost" onClick={() => setView("settings")}>
							Settings
						</MenuButton>
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
			)}

			{/* New Game modal */}
			{view === "newGame" && <NewGameModal onStart={handleNewGame} onClose={() => setView("menu")} />}

			{/* Settings placeholder */}
			{view === "settings" && <SettingsPanel onClose={() => setView("menu")} />}
		</div>
	);
}

// ─── Sub-components ───

type ButtonVariant = "primary" | "secondary" | "ghost";

function MenuButton({
	variant,
	onClick,
	children,
}: {
	variant: ButtonVariant;
	onClick: () => void;
	children: React.ReactNode;
}) {
	const styles: Record<ButtonVariant, React.CSSProperties> = {
		primary: {
			background: "var(--color-bok-gold)",
			color: "var(--color-bok-ink)",
			boxShadow: "0 0 30px rgba(201,168,76,0.2)",
		},
		secondary: {
			background: "var(--color-bok-parchment)",
			color: "var(--color-bok-ink)",
			boxShadow: "0 0 20px rgba(224,213,193,0.1)",
		},
		ghost: {
			background: "rgba(255,255,255,0.05)",
			color: "var(--color-bok-parchment)",
		},
	};

	return (
		<button
			type="button"
			onClick={onClick}
			className="btn btn-lg w-full font-display tracking-[0.15em] uppercase transition-all duration-300 hover:scale-105"
			style={styles[variant]}
		>
			{children}
		</button>
	);
}

function SettingsPanel({ onClose }: { onClose: () => void }) {
	return (
		<div
			className="absolute inset-0 z-60 flex items-center justify-center"
			style={{ background: "rgba(5,5,16,0.85)", backdropFilter: "blur(6px)" }}
		>
			<div
				className="glass-panel p-8 w-full max-w-md mx-4 flex flex-col items-center gap-6"
				style={{ animation: "title-emerge 0.4s ease-out" }}
			>
				<h2
					className="font-display text-2xl tracking-[0.15em] uppercase"
					style={{ color: "var(--color-bok-parchment)" }}
				>
					Settings
				</h2>

				<p className="text-sm text-center opacity-40" style={{ color: "var(--color-bok-parchment)" }}>
					Settings will be available in a future update.
				</p>

				<button
					type="button"
					onClick={onClose}
					className="btn w-full font-display tracking-[0.1em] uppercase"
					style={{
						background: "rgba(255,255,255,0.06)",
						color: "var(--color-bok-parchment)",
					}}
				>
					Back
				</button>
			</div>
		</div>
	);
}
