/**
 * Session resume — generates a brief narrative summary for returning players.
 * Pure data/math, no ECS/Three.js/React.
 */

export interface ResumeContext {
	/** Short narrative line (e.g. "Day 7 — You were exploring the Myren..."). */
	text: string;
	/** Active objective hint, if any. */
	objectiveHint: string | null;
}

/** Time-of-day ranges mapped to descriptive phrases. */
function timePhrase(timeOfDay: number): string {
	if (timeOfDay < 0.2) return "in the deep of night";
	if (timeOfDay < 0.3) return "at dawn";
	if (timeOfDay < 0.45) return "in the morning light";
	if (timeOfDay < 0.55) return "under the midday sun";
	if (timeOfDay < 0.7) return "in the afternoon";
	if (timeOfDay < 0.8) return "as dusk fell";
	return "beneath the stars";
}

/** Health condition descriptors. */
function healthPhrase(health: number): string | null {
	if (health < 25) return "badly wounded";
	if (health < 50) return "hurt";
	return null;
}

/** Hunger condition descriptors. */
function hungerPhrase(hunger: number): string | null {
	if (hunger < 20) return "starving";
	if (hunger < 40) return "hungry";
	return null;
}

/** Build condition clause (e.g. ", badly wounded and starving"). */
function conditionClause(health: number, hunger: number): string {
	const parts: string[] = [];
	const hp = healthPhrase(health);
	if (hp) parts.push(hp);
	const hg = hungerPhrase(hunger);
	if (hg) parts.push(hg);
	if (parts.length === 0) return "";
	return `, ${parts.join(" and ")}`;
}

/** Last saga entry as context hint. */
function lastSagaHint(entries: ReadonlyArray<{ text: string }>): string | null {
	if (entries.length === 0) return null;
	return entries[entries.length - 1].text;
}

/**
 * Generate a resume context summary from player state.
 * All parameters are plain values — no ECS queries.
 */
export function generateResumeContext(
	dayCount: number,
	timeOfDay: number,
	health: number,
	hunger: number,
	inShelter: boolean,
	sagaEntries: ReadonlyArray<{ text: string }>,
	activeObjectiveText: string | null,
): ResumeContext {
	const dayLabel = `Day ${dayCount}`;
	const time = timePhrase(timeOfDay);
	const location = inShelter ? "within your shelter" : "in the wilds";
	const condition = conditionClause(health, hunger);
	const saga = lastSagaHint(sagaEntries);

	let text = `${dayLabel} — You stood ${location} ${time}${condition}.`;
	if (saga) {
		text += ` ${saga}`;
	}

	return {
		text,
		objectiveHint: activeObjectiveText,
	};
}
