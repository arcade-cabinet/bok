import type { World } from "koota";
import { SeasonState, WorldTime } from "../traits/index.ts";

export type TimePhase = "Morning" | "Midday" | "Dusk" | "Night";

export function timeSystem(world: World, dt: number) {
	// Read night multiplier from season (separate query — backward compat)
	let nightMult = 1;
	world.query(SeasonState).readEach(([season]) => {
		nightMult = season.nightMult;
	});

	world.query(WorldTime).updateEach(([time]) => {
		const dayDuration = Number.isFinite(time.dayDuration) && time.dayDuration > 0 ? time.dayDuration : 240;
		// During night (sunHeight < 0, roughly timeOfDay 0.75–1.0 + 0.0–0.25),
		// slow time advancement to make nights feel longer/shorter.
		const isNight = time.timeOfDay >= 0.75 || time.timeOfDay < 0.25;
		const speedMult = isNight ? 1 / nightMult : 1;
		const total = time.timeOfDay + (dt / dayDuration) * speedMult;
		const rollover = Math.floor(total);
		time.dayCount += rollover;
		time.timeOfDay = total - rollover;
	});
}

export function getTimePhase(timeOfDay: number): TimePhase {
	const angle = timeOfDay * Math.PI * 2;
	const sunHeight = Math.sin(angle);

	if (sunHeight > 0.4) return "Midday";
	if (sunHeight > 0) return timeOfDay < 0.5 ? "Morning" : "Dusk";
	return "Night";
}

export function getSkyColor(phase: TimePhase): number {
	switch (phase) {
		case "Morning":
		case "Midday":
			return 0x87ceeb;
		case "Dusk":
			return 0xff7e47;
		case "Night":
			return 0x050510;
	}
}

export function getAmbientIntensity(phase: TimePhase): number {
	switch (phase) {
		case "Morning":
		case "Midday":
			return 0.35;
		case "Dusk":
			return 0.2;
		case "Night":
			return 0.05;
	}
}

export function getSunIntensity(phase: TimePhase): number {
	switch (phase) {
		case "Morning":
		case "Midday":
			return 1.2;
		case "Dusk":
			return 0.5;
		case "Night":
			return 0;
	}
}
