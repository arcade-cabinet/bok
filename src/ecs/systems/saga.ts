/**
 * Saga system — ECS bridge for the journey auto-recording mechanic.
 * Throttled check (1s interval): reads player traits, detects milestones, updates SagaLog.
 * Consumed by game.ts.
 */

import type { World } from "koota";
import {
	Codex,
	ExploredChunks,
	InscriptionLevel,
	PlayerTag,
	SagaLog,
	ShelterState,
	WorldTime,
} from "../traits/index.ts";
import { unpackChunk } from "./map-data.ts";
import { createSagaEntry, detectNewMilestones } from "./saga-data.ts";

const SCAN_INTERVAL = 1.0;
let scanTimer = 0;

/** Injected biome resolver to avoid circular deps with terrain-generator. */
let biomeResolver: ((gx: number, gz: number) => number) | null = null;

/** Register a biome resolver for biome counting. */
export function registerSagaBiomeResolver(resolver: (gx: number, gz: number) => number): void {
	biomeResolver = resolver;
}

/** Reset module state for game restart. */
export function resetSagaState(): void {
	scanTimer = 0;
}

/** Count distinct biomes from explored chunks using the injected biome resolver. */
function countDistinctBiomes(visited: ReadonlySet<number>): number {
	if (!biomeResolver || visited.size === 0) return 1;
	const biomes = new Set<number>();
	for (const key of visited) {
		const [cx, cz] = unpackChunk(key);
		const gx = cx * 16 + 8;
		const gz = cz * 16 + 8;
		biomes.add(biomeResolver(gx, gz));
		if (biomes.size >= 6) break;
	}
	return biomes.size;
}

/**
 * Saga system — throttled milestone detection and entry generation.
 * Runs after creature and codex systems so kill/observe counts are current.
 */
export function sagaSystem(world: World, dt: number): void {
	scanTimer += dt;
	if (scanTimer < SCAN_INTERVAL) return;
	scanTimer -= SCAN_INTERVAL;

	let dayCount = 1;
	world.query(WorldTime).readEach(([time]) => {
		dayCount = time.dayCount;
	});

	world
		.query(PlayerTag, SagaLog, InscriptionLevel, ShelterState, ExploredChunks, Codex)
		.updateEach(([saga, inscription, shelter, explored, codex]) => {
			const biomesDiscovered = countDistinctBiomes(explored.visited);
			let creaturesObserved = 0;
			for (const progress of Object.values(codex.creatureProgress)) {
				if (progress > 0) creaturesObserved++;
			}

			const newMilestones = detectNewMilestones(
				saga.achieved,
				dayCount,
				inscription.totalBlocksPlaced,
				inscription.totalBlocksMined,
				shelter.inShelter,
				saga.creaturesKilled,
				biomesDiscovered,
				saga.bossDefeated,
				creaturesObserved,
				codex.loreEntries.size,
			);

			for (const id of newMilestones) {
				saga.achieved.add(id);
				saga.entries.push(createSagaEntry(id, dayCount));
			}
		});
}

/** Record a creature kill — called from creature.ts on creature death. */
export function recordCreatureKill(world: World): void {
	world.query(PlayerTag, SagaLog).updateEach(([saga]) => {
		saga.creaturesKilled++;
	});
}

/** Record a boss defeat — called from creature.ts on boss death. */
export function recordBossDefeat(world: World): void {
	world.query(PlayerTag, SagaLog).updateEach(([saga]) => {
		saga.bossDefeated = true;
	});
}
