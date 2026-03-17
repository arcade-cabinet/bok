/**
 * Title screen — brand-aligned landing with shader background,
 * 3-button menu (New Game / Continue / Settings), and modal routing.
 */

import { useCallback, useState } from "react";
import { NewGameModal } from "./NewGameModal.tsx";
import { RuneCanvas } from "./RuneCanvas.tsx";
import { SettingsModal } from "./SettingsModal.tsx";

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

			{/* Main menu — always rendered, modals overlay on top */}
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
					className="text-center max-w-md mb-10 text-sm leading-relaxed opacity-80 px-6"
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
			</div>

			{/* Modals overlay on top of the menu */}
			{view === "newGame" && <NewGameModal onStart={handleNewGame} onClose={() => setView("menu")} />}
			{view === "settings" && <SettingsModal onClose={() => setView("menu")} />}
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
