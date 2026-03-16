/**
 * Rune Discovery System — ECS system that checks discovery triggers
 * and records newly discovered runes in the RuneDiscovery trait.
 *
 * Runs at 1s throttle (discovery is not time-critical).
 * Reads creature positions, landmarks, biome, and player state.
 */

import type { World } from "koota";
import type { SpeciesId } from "../traits/index.ts";
import {
	CreatureTag,
	CreatureType,
	Health,
	PlayerTag,
	Position,
	RuneDiscovery,
	SagaLog,
	WorldTime,
} from "../traits/index.ts";
import { getDiscoveredLandmarks } from "./exploration.ts";
import type { DiscoveryContext } from "./rune-discovery.ts";
import { checkDiscoveryTrigger } from "./rune-discovery.ts";
import type { RuneDiscoveryEntry } from "./rune-discovery-data.ts";
import { getTutorialRunes, RUNE_DISCOVERIES } from "./rune-discovery-data.ts";

/** Discovery scan interval in seconds. */
const SCAN_INTERVAL = 1.0;

/** Distance (squared) within which creatures trigger discovery. */
const CREATURE_DETECT_DIST_SQ = 20 * 20;

/** Side effects for discovery events. */
export interface RuneDiscoveryEffects {
	addSagaEntry: (text: string) => void;
	spawnParticles: (x: number, y: number, z: number, color: string, count: number) => void;
}

let scanTimer = 0;
let biomeResolver: ((gx: number, gz: number) => number) | null = null;

/** Biome ID → lowercase name mapping (matches biomes.ts Biome const keys). */
const BIOME_NAMES: Record<number, string> = {
	0: "angen",
	1: "bokskogen",
	2: "fjallen",
	3: "skargarden",
	4: "myren",
	5: "blothogen",
};

/** Register a biome resolver to avoid circular imports. */
export function registerDiscoveryBiomeResolver(resolver: (gx: number, gz: number) => number): void {
	biomeResolver = resolver;
}

/** Reset module state on destroyGame. */
export function resetDiscoveryState(): void {
	scanTimer = 0;
}

/**
 * Rune discovery ECS system.
 * Scans for discovery triggers and records new discoveries.
 */
export function runeDiscoverySystem(world: World, dt: number, effects: RuneDiscoveryEffects): void {
	scanTimer += dt;
	if (scanTimer < SCAN_INTERVAL) return;
	scanTimer -= SCAN_INTERVAL;

	// Read player position and state
	let px = 0;
	let py = 0;
	let pz = 0;
	let timeOfDay = 0.25;
	let dayCount = 1;
	let currentHealth = 100;
	let creaturesKilled = 0;

	world.query(PlayerTag, Position).readEach(([pos]) => {
		px = pos.x;
		py = pos.y;
		pz = pos.z;
	});

	world.query(WorldTime).readEach(([time]) => {
		timeOfDay = time.timeOfDay;
		dayCount = time.dayCount;
	});

	world.query(PlayerTag, Health).readEach(([health]) => {
		currentHealth = health.current;
	});

	world.query(PlayerTag, SagaLog).readEach(([saga]) => {
		creaturesKilled = saga.creaturesKilled;
	});

	// Collect nearby creature species
	const nearbyCreatures: SpeciesId[] = [];
	world.query(CreatureTag, CreatureType, Position).readEach(([ct, cpos]) => {
		const dx = cpos.x - px;
		const dz = cpos.z - pz;
		if (dx * dx + dz * dz < CREATURE_DETECT_DIST_SQ) {
			nearbyCreatures.push(ct.species);
		}
	});

	// Collect nearby landmark types from discovered landmarks
	const nearbyLandmarks: string[] = [];
	for (const lm of getDiscoveredLandmarks()) {
		const lx = lm.cx * 16 + 8;
		const lz = lm.cz * 16 + 8;
		const dx = lx - px;
		const dz = lz - pz;
		if (dx * dx + dz * dz < CREATURE_DETECT_DIST_SQ) {
			nearbyLandmarks.push(lm.type);
		}
	}

	// Resolve current biome
	let currentBiome = "angen";
	if (biomeResolver) {
		const biomeId = biomeResolver(Math.floor(px), Math.floor(pz));
		currentBiome = BIOME_NAMES[biomeId] ?? "angen";
	}

	// Check discoveries
	world.query(PlayerTag, RuneDiscovery).updateEach(([disc]) => {
		// Detect damage: compare current health to previous
		const tookDamage = currentHealth < disc.prevHealth;

		const ctx: DiscoveryContext = {
			timeOfDay,
			prevTimeOfDay: disc.prevTimeOfDay,
			nearbyCreatures,
			nearbyLandmarks,
			currentBiome,
			tookDamage,
			creaturesKilled,
		};

		for (const entry of RUNE_DISCOVERIES) {
			if (disc.discovered.has(entry.runeId)) continue;
			if (checkDiscoveryTrigger(entry, ctx)) {
				discoverRune(disc, entry, dayCount, px, py, pz, effects);
			}
		}

		// Update tracking state for next tick
		disc.prevHealth = currentHealth;
		disc.prevTimeOfDay = timeOfDay;
	});
}

/** Record a single rune discovery. */
function discoverRune(
	disc: { discovered: Set<number> },
	entry: RuneDiscoveryEntry,
	dayCount: number,
	px: number,
	py: number,
	pz: number,
	effects: RuneDiscoveryEffects,
): void {
	disc.discovered.add(entry.runeId);
	const sagaText = entry.sagaText.replace("{day}", String(dayCount));
	effects.addSagaEntry(sagaText);
	effects.spawnParticles(px, py + 1, pz, "#FFD700", 20);
}

/**
 * Grant tutorial runes to a freshly created RuneDiscovery set.
 * Called during initGame after spawning the player entity.
 */
export function grantTutorialRunes(discovered: Set<number>): void {
	for (const runeId of getTutorialRunes()) {
		discovered.add(runeId);
	}
}

/** Get the current discovered runes as an array (for persistence). */
export function getDiscoveredRuneIds(world: World): number[] {
	const ids: number[] = [];
	world.query(PlayerTag, RuneDiscovery).readEach(([disc]) => {
		for (const id of disc.discovered) {
			ids.push(id);
		}
	});
	return ids;
}

/** Restore discovered rune IDs (from persistence). */
export function restoreDiscoveredRunes(world: World, runeIds: number[]): void {
	world.query(PlayerTag, RuneDiscovery).updateEach(([disc]) => {
		for (const id of runeIds) {
			disc.discovered.add(id);
		}
	});
}
