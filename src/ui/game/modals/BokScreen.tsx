/**
 * BokScreen — full-screen birch-bark journal overlay.
 * Shell for the 4 tabbed pages: Kartan, Listan, Kunskapen, Sagan.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { LandmarkMarker } from "../../../ecs/systems/map-data.ts";
import { computeTravelCost, type TravelAnchor } from "../../../ecs/systems/raido-travel.ts";
import type { BiomeId } from "../../../world/biomes.ts";
import { TravelConfirm } from "../../shared/TravelConfirm.tsx";
import type { BokCodexProps } from "../bok/BokCodex.tsx";
import { BokCodex } from "../bok/BokCodex.tsx";
import type { BokLedgerProps } from "../bok/BokLedger.tsx";
import { BokLedger } from "../bok/BokLedger.tsx";
import { BokMap } from "../bok/BokMap.tsx";
import { BokPage } from "../bok/BokPage.tsx";
import type { BokSagaProps } from "../bok/BokSaga.tsx";
import { BokSaga } from "../bok/BokSaga.tsx";

export type BokTabId = "kartan" | "listan" | "kunskapen" | "sagan";

const BOK_TABS: { id: BokTabId; label: string }[] = [
	{ id: "kartan", label: "Kartan" },
	{ id: "listan", label: "Listan" },
	{ id: "kunskapen", label: "Kunskapen" },
	{ id: "sagan", label: "Sagan" },
];

const TAB_TITLES: Record<BokTabId, string> = {
	kartan: "Kartan — The Map",
	listan: "Listan — Inventory",
	kunskapen: "Kunskapen — Knowledge",
	sagan: "Sagan — The Saga",
};

export interface MapData {
	visited: ReadonlySet<number>;
	playerCx: number;
	playerCz: number;
	biomeAt: (cx: number, cz: number) => BiomeId;
	landmarks: readonly LandmarkMarker[];
	travelAnchors?: readonly TravelAnchor[];
}

export interface TravelData {
	/** Crystal dust count in player inventory. */
	dustAvailable: number;
	/** Called to execute fast travel. Returns true on success. */
	onTravel: (anchor: TravelAnchor, cost: number) => boolean;
}

interface BokScreenProps {
	isOpen: boolean;
	onClose: () => void;
	mapData?: MapData;
	codexData?: BokCodexProps;
	ledgerData?: BokLedgerProps;
	sagaData?: BokSagaProps;
	travelData?: TravelData;
}

const SWIPE_THRESHOLD = 50;

export function BokScreen({ isOpen, onClose, mapData, codexData, ledgerData, sagaData, travelData }: BokScreenProps) {
	const [activeTab, setActiveTab] = useState<BokTabId>("kartan");
	const [closing, setClosing] = useState(false);
	const touchStartRef = useRef<number>(0);
	const [travelTarget, setTravelTarget] = useState<TravelAnchor | null>(null);

	// Close with animation
	const handleClose = useCallback(() => {
		setClosing(true);
		setTimeout(() => {
			setClosing(false);
			onClose();
		}, 250);
	}, [onClose]);

	// Keyboard: Escape or B closes
	useEffect(() => {
		if (!isOpen) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.code === "Escape" || e.code === "KeyB") {
				e.preventDefault();
				handleClose();
			}
		};
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	}, [isOpen, handleClose]);

	// Swipe left/right to switch tabs
	const onTouchStart = useCallback((e: React.TouchEvent) => {
		touchStartRef.current = e.changedTouches[0].clientX;
	}, []);

	const onTouchEnd = useCallback(
		(e: React.TouchEvent) => {
			const dx = e.changedTouches[0].clientX - touchStartRef.current;
			if (Math.abs(dx) < SWIPE_THRESHOLD) return;

			const currentIdx = BOK_TABS.findIndex((t) => t.id === activeTab);
			if (dx < 0 && currentIdx < BOK_TABS.length - 1) {
				setActiveTab(BOK_TABS[currentIdx + 1].id);
			} else if (dx > 0 && currentIdx > 0) {
				setActiveTab(BOK_TABS[currentIdx - 1].id);
			}
		},
		[activeTab],
	);

	if (!isOpen) return null;

	const animClass = closing ? "bok-close" : "bok-open";

	return (
		<div
			className={`absolute inset-0 z-30 flex flex-col pointer-events-auto ${animClass}`}
			role="dialog"
			aria-modal="true"
			aria-label="Bok journal"
			data-testid="bok-screen"
			onTouchStart={onTouchStart}
			onTouchEnd={onTouchEnd}
		>
			{/* Backdrop — tap to close */}
			<div
				className="absolute inset-0"
				style={{ background: "rgba(0, 0, 0, 0.4)" }}
				onClick={handleClose}
				aria-hidden="true"
			/>

			{/* Journal body */}
			<div
				className="relative flex-1 flex flex-col mx-auto w-full max-w-lg mt-8 mb-20 rounded-xl overflow-hidden shadow-2xl"
				style={{
					background: "var(--color-bok-parchment)",
					border: "3px solid var(--color-bok-gold)",
					boxShadow: "0 0 40px rgba(201,168,76,0.15), 0 20px 60px rgba(0,0,0,0.4)",
				}}
			>
				{/* Page content */}
				<BokPage title={TAB_TITLES[activeTab]}>
					{activeTab === "kartan" && mapData && (
						<>
							<BokMap
								visited={mapData.visited}
								playerCx={mapData.playerCx}
								playerCz={mapData.playerCz}
								biomeAt={mapData.biomeAt}
								landmarks={mapData.landmarks}
								travelAnchors={mapData.travelAnchors}
								onTravelRequest={(anchor) => setTravelTarget(anchor)}
							/>
							{travelTarget && travelData && (
								<TravelConfirm
									destX={travelTarget.x}
									destY={travelTarget.y}
									destZ={travelTarget.z}
									cost={computeTravelCost(mapData.playerCx * 16, mapData.playerCz * 16, travelTarget.x, travelTarget.z)}
									dustAvailable={travelData.dustAvailable}
									onConfirm={() => {
										const cost = computeTravelCost(
											mapData.playerCx * 16,
											mapData.playerCz * 16,
											travelTarget.x,
											travelTarget.z,
										);
										travelData.onTravel(travelTarget, cost);
										setTravelTarget(null);
										handleClose();
									}}
									onCancel={() => setTravelTarget(null)}
								/>
							)}
						</>
					)}
					{activeTab === "listan" && ledgerData && <BokLedger items={ledgerData.items} />}
					{activeTab === "kunskapen" && codexData && (
						<BokCodex
							creatureProgress={codexData.creatureProgress}
							loreEntryIds={codexData.loreEntryIds}
							discoveredRecipeCount={codexData.discoveredRecipeCount}
							discoveredRuneIds={codexData.discoveredRuneIds}
						/>
					)}
					{activeTab === "sagan" && sagaData && (
						<BokSaga entries={sagaData.entries} activeObjective={sagaData.activeObjective} stats={sagaData.stats} />
					)}
				</BokPage>
			</div>

			{/* Tab navigation — bottom */}
			<div
				className="absolute bottom-0 left-0 right-0 flex justify-center gap-1 pb-4 pt-2"
				style={{
					background: "linear-gradient(transparent, rgba(0,0,0,0.6))",
				}}
				role="tablist"
				data-testid="bok-tabs"
			>
				{BOK_TABS.map((tab) => (
					<button
						type="button"
						role="tab"
						key={tab.id}
						onClick={() => setActiveTab(tab.id)}
						className={`
							px-4 py-2 min-h-[44px] min-w-[44px] rounded-lg font-display text-xs tracking-[0.15em] uppercase
							transition-all duration-200
						`}
						style={
							activeTab === tab.id
								? {
										background: "var(--color-bok-parchment)",
										color: "var(--color-bok-ink)",
										boxShadow: "0 0 15px rgba(201,168,76,0.3)",
									}
								: {
										background: "rgba(255,255,255,0.08)",
										color: "var(--color-bok-parchment)",
									}
						}
						data-testid={`bok-tab-${tab.id}`}
						aria-selected={activeTab === tab.id}
					>
						{tab.label}
					</button>
				))}
			</div>
		</div>
	);
}
