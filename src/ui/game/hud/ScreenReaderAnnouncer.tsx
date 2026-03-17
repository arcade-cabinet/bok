/**
 * ScreenReaderAnnouncer — visually hidden live region that
 * announces game state changes to screen readers.
 * Tracks phase transitions, low health, day changes, and death.
 */

import { useEffect, useRef, useState } from "react";

interface ScreenReaderAnnouncerProps {
	phase: "title" | "playing" | "dead";
	health: number;
	dayCount: number;
}

const LOW_HEALTH_THRESHOLD = 25;

export function ScreenReaderAnnouncer({ phase, health, dayCount }: ScreenReaderAnnouncerProps) {
	const [message, setMessage] = useState("");
	const prevPhaseRef = useRef(phase);
	const prevDayRef = useRef(dayCount);
	const wasLowHealthRef = useRef(false);

	useEffect(() => {
		// Phase transitions
		if (phase !== prevPhaseRef.current) {
			if (phase === "playing") setMessage("Game started. You awaken on stone.");
			else if (phase === "dead") setMessage("You have fallen. Press Return to respawn.");
			else if (phase === "title") setMessage("Title screen.");
			prevPhaseRef.current = phase;
			return;
		}

		// Day change (only while playing)
		if (phase === "playing" && dayCount !== prevDayRef.current) {
			setMessage(`Day ${dayCount} has begun.`);
			prevDayRef.current = dayCount;
			return;
		}

		// Low health warning
		if (phase === "playing") {
			const isLow = health <= LOW_HEALTH_THRESHOLD && health > 0;
			if (isLow && !wasLowHealthRef.current) {
				setMessage(`Warning: health critical at ${Math.round(health)} percent.`);
			}
			wasLowHealthRef.current = isLow;
		}
	}, [phase, health, dayCount]);

	return (
		<div className="sr-only" aria-live="assertive" aria-atomic="true" role="status" data-testid="sr-announcer">
			{message}
		</div>
	);
}
