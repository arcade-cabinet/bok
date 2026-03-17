/**
 * BokSaga — Sagan (The Saga) page of the Bok journal.
 * Renders saga entries chronologically, active objective as saga verse, and stats.
 *
 * Props use plain arrays/objects (not Sets) so they serialize across Playwright CT boundary.
 */

import type { ActiveObjective, SagaStats } from "../../../ecs/systems/saga-data.ts";

export interface SagaEntryProps {
	milestoneId: string;
	day: number;
	text: string;
}

export interface BokSagaProps {
	entries: SagaEntryProps[];
	activeObjective: ActiveObjective | null;
	stats: SagaStats;
}

export function BokSaga({ entries, activeObjective, stats }: BokSagaProps) {
	return (
		<div className="space-y-6" data-testid="bok-saga">
			{/* Active Objective */}
			{activeObjective && (
				<section data-testid="saga-objective">
					<h3
						className="font-display text-sm tracking-[0.2em] uppercase mb-3"
						style={{ color: "var(--color-bok-ink)" }}
					>
						Current Verse
					</h3>
					<div
						className="rounded-lg p-3"
						style={{
							background: "rgba(201,168,76,0.08)",
							border: "1px solid rgba(201,168,76,0.25)",
						}}
					>
						<p
							className="text-xs leading-relaxed italic"
							style={{ color: "var(--color-bok-ink)", opacity: 0.8 }}
							data-testid="saga-objective-text"
						>
							{activeObjective.text}
						</p>
						{activeObjective.target > 1 && (
							<div className="mt-2 flex items-center gap-2">
								<div
									className="flex-1 h-1 rounded-full"
									style={{ background: "rgba(0,0,0,0.1)" }}
									data-testid="saga-objective-progress"
								>
									<div
										className="h-full rounded-full transition-all"
										style={{
											width: `${Math.round((activeObjective.progress / activeObjective.target) * 100)}%`,
											background: "#c9a84c",
										}}
									/>
								</div>
								<span className="text-xs opacity-40" style={{ color: "var(--color-bok-ink)" }}>
									{activeObjective.progress}/{activeObjective.target}
								</span>
							</div>
						)}
					</div>
				</section>
			)}

			{/* Saga Entries */}
			<section data-testid="saga-entries">
				<h3 className="font-display text-sm tracking-[0.2em] uppercase mb-3" style={{ color: "var(--color-bok-ink)" }}>
					The Saga
				</h3>
				{entries.length === 0 ? (
					<p className="text-xs opacity-40 italic" style={{ color: "var(--color-bok-ink)" }}>
						The saga has yet to begin...
					</p>
				) : (
					<div className="space-y-2">
						{entries.map((entry) => (
							<SagaCard key={entry.milestoneId} entry={entry} />
						))}
					</div>
				)}
			</section>

			{/* Stats */}
			<section data-testid="saga-stats">
				<h3 className="font-display text-sm tracking-[0.2em] uppercase mb-3" style={{ color: "var(--color-bok-ink)" }}>
					Chronicles
				</h3>
				<div className="grid grid-cols-2 gap-2">
					<StatItem label="Days Survived" value={stats.daysSurvived} testId="stat-days" />
					<StatItem label="Blocks Placed" value={stats.blocksPlaced} testId="stat-placed" />
					<StatItem label="Blocks Mined" value={stats.blocksMined} testId="stat-mined" />
					<StatItem label="Creatures Observed" value={stats.creaturesObserved} testId="stat-observed" />
				</div>
			</section>
		</div>
	);
}

// ─── Sub-components ───

function SagaCard({ entry }: { entry: SagaEntryProps }) {
	return (
		<div
			className="rounded-lg p-3"
			style={{
				background: "rgba(0,0,0,0.04)",
				border: "1px solid rgba(201,168,76,0.15)",
			}}
			data-testid={`saga-entry-${entry.milestoneId}`}
		>
			<div className="flex items-center gap-2 mb-1">
				<span className="text-xs opacity-40" style={{ color: "var(--color-bok-ink)" }}>
					Day {entry.day}
				</span>
			</div>
			<p className="text-xs leading-relaxed italic" style={{ color: "var(--color-bok-ink)", opacity: 0.7 }}>
				{entry.text}
			</p>
		</div>
	);
}

function StatItem({ label, value, testId }: { label: string; value: number; testId: string }) {
	return (
		<div
			className="rounded-lg p-2 text-center"
			style={{
				background: "rgba(0,0,0,0.04)",
				border: "1px solid rgba(201,168,76,0.1)",
			}}
			data-testid={testId}
		>
			<div className="font-display text-lg" style={{ color: "var(--color-bok-gold)" }}>
				{value}
			</div>
			<div className="text-xs opacity-50" style={{ color: "var(--color-bok-ink)" }}>
				{label}
			</div>
		</div>
	);
}
