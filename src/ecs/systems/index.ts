export type { WardZone } from "./algiz-ward.ts";
export { computeWardRadius, isBlockedByWard, isInWardZone } from "./algiz-ward.ts";
export { computeAnsuzSignalStrength, countDetectedEntities, detectsEntity, isEntityDetected } from "./ansuz-sense.ts";
export type { ArchetypeKey, DetectedArchetype } from "./archetype-data.ts";
export { ALL_ARCHETYPES, ArchetypeId, FOUNDING_ARCHETYPES, FOUNDING_THRESHOLD } from "./archetype-data.ts";
export { detectAllArchetypes, groupByChunk } from "./archetype-detect.ts";
export type { GrowthZone } from "./berkanan-grow.ts";
export {
	computeGrowthMultiplier,
	computeGrowthRadius,
	getBestGrowthMultiplier,
	isInGrowthZone,
} from "./berkanan-grow.ts";
export { codexSystem, collectLoreEntry, discoverRecipe } from "./codex.ts";
export {
	COMPUTATIONAL_RUNE_IDS,
	HAGALAZ_ACTIVE_COLOR,
	HAGALAZ_MIN_GATE_SIGNAL,
	ISA_ACTIVE_COLOR,
	ISA_CRYSTAL_DELAY,
	ISA_DEFAULT_DELAY,
	isComputationalRune,
	NAUDIZ_ACTIVE_COLOR,
	NAUDIZ_OUTPUT_STRENGTH,
} from "./computational-rune-data.ts";
export type { ComputationalRuneEffects } from "./computational-rune-system.ts";
export {
	computationalRuneSystem,
	getComputationalEmitters,
	resetComputationalRuneState,
} from "./computational-rune-system.ts";
export { cookingSystem } from "./cooking.ts";
export { creatureSystem, damageCreature } from "./creature.ts";
export { eatingSystem } from "./eating.ts";
export {
	EMITTER_RUNE_IDS,
	EMITTER_STRENGTH,
	getEmitterConfig,
	hexToNumber,
	isEmitterRune,
	KENAZ_GLOW,
	SOWILO_GLOW,
} from "./emitter-runes.ts";
export type { EmitterEffects } from "./emitter-system.ts";
export { emitterSystem, getActiveEmitters, getSignalMap, resetEmitterState } from "./emitter-system.ts";
export {
	explorationSystem,
	getDiscoveredLandmarks,
	registerLandmarkResolver,
	resetExplorationState,
} from "./exploration.ts";
export { computeFaceIndex, isInternalFace } from "./face-selection.ts";
export { computePullVelocity, FEHU_COLLECT_DISTANCE, isAtSource, isInPullRange } from "./fehu-pull.ts";
export { analyzeAdjacentSignals, evaluateHagalaz, faceAxis, perpendicularFaces } from "./hagalaz-gate.ts";
export {
	computeInscriptionLevel,
	getSpawnRateMultiplier,
	INSCRIPTION_TIERS,
	isThresholdReached,
} from "./inscription-level.ts";
export {
	ALGIZ_BASE_RADIUS,
	ALGIZ_MAX_RADIUS,
	ALGIZ_RADIUS_PER_STRENGTH,
	ANSUZ_COOLDOWN,
	ANSUZ_DETECT_RADIUS,
	ANSUZ_EMIT_STRENGTH,
	BERKANAN_BASE_MULTIPLIER,
	BERKANAN_BASE_RADIUS,
	BERKANAN_MAX_MULTIPLIER,
	BERKANAN_MAX_RADIUS,
	BERKANAN_MULTIPLIER_PER_STRENGTH,
	BERKANAN_RADIUS_PER_STRENGTH,
	FEHU_PULL_RADIUS,
	FEHU_PULL_SPEED,
	INTERACTION_RUNE_IDS,
	INTERACTION_TICK_INTERVAL,
	isInteractionRune,
	isProtectionRune,
	MANNAZ_BASE_RADIUS,
	MANNAZ_MAX_RADIUS,
	MANNAZ_RADIUS_PER_STRENGTH,
	PROTECTION_RUNE_IDS,
	THURISAZ_DAMAGE_PER_STRENGTH,
	THURISAZ_DAMAGE_RADIUS,
	THURISAZ_MAX_DAMAGE,
	THURISAZ_MIN_SIGNAL,
} from "./interaction-rune-data.ts";
export type { InteractionRuneEffects, ItemDropInfo } from "./interaction-rune-system.ts";
export {
	getAnsuzEmitters,
	interactionRuneSystem,
	resetInteractionRuneState,
} from "./interaction-rune-system.ts";
export {
	evaluateIsa,
	getIsaDelay,
	getIsaInputStrength,
	popIsaOutput,
	pushIsaInput,
	resetIsaState,
} from "./isa-delay.ts";
export { CHARCOAL_ID, COPPER_INGOT_ID, findJeraRecipe, IRON_INGOT_ID, isJeraInput } from "./jera-transform.ts";
export { getActiveLightSources, lightSystem } from "./light.ts";
export {
	getBlockLightRadius,
	getItemLightRadius,
	ITEM_LIGHT_RADIUS,
	isInLight,
	lightDamageToMorker,
	lightIntensityAt,
	maxLightIntensity,
} from "./light-sources.ts";
export type { CalmZone } from "./mannaz-calm.ts";
export { computeCalmRadius, isAiTypeCalmable, isCalmedByZone, isInCalmZone } from "./mannaz-calm.ts";
export { miningSystem } from "./mining.ts";
export { movementSystem } from "./movement.ts";
export { computeNaudizOutput, evaluateNaudiz, maxSignalAtBlock } from "./naudiz-not.ts";
export { physicsSystem } from "./physics.ts";
export type { ProtectionRuneEffects } from "./protection-rune-system.ts";
export {
	getActiveCalmZones,
	getActiveGrowthZones,
	getActiveWards,
	protectionRuneSystem,
	resetProtectionRuneState,
} from "./protection-rune-system.ts";
export { questSystem } from "./quest.ts";
export { CHISEL_ITEM_ID, getRuneColor, getRuneDef, PLACEABLE_RUNES, RUNES, RuneId } from "./rune-data.ts";
export type { RuneEntry } from "./rune-index.ts";
export { getRuneIndex, RuneIndex, resetRuneIndex } from "./rune-index.ts";
export {
	getRuneOnFace,
	placeRune,
	runeInscriptionSystem,
} from "./rune-inscription.ts";
export { recordBossDefeat, recordCreatureKill, sagaSystem } from "./saga.ts";
export { computeActiveObjective, computeSagaStats } from "./saga-data.ts";
export {
	chunkNameSeed,
	computeSettlementLevel,
	generateSettlementName,
	meetsFoundingRequirement,
	SettlementLevel,
} from "./settlement-data.ts";
export type { Settlement } from "./settlement-detect.ts";
export { detectSettlements, diffSettlements } from "./settlement-detect.ts";
export type { SettlementEffects } from "./settlement-system.ts";
export { getActiveSettlements, resetSettlementState, settlementSystem } from "./settlement-system.ts";
export type { SignalTypeId } from "./signal-data.ts";
export {
	ALL_SIGNAL_TYPES,
	getBlockConductivity,
	MAX_BLOCKS_PER_TICK,
	MAX_EMITTERS,
	MAX_PROPAGATION_DEPTH,
	MAX_SIGNAL_STRENGTH,
	oppositeFace,
	SIGNAL_TICK_INTERVAL,
	SignalType,
} from "./signal-data.ts";
export type { RuneTransform, SignalEmitter, SignalMap } from "./signal-propagation.ts";
export { computeEffectiveStrength, getSignalStrength, propagateSignals } from "./signal-propagation.ts";
export { structureSystem } from "./structure.ts";
export { survivalSystem } from "./survival.ts";
export { computeThurisazDamage, findEntitiesInDamageRadius, isInDamageRadius } from "./thurisaz-damage.ts";
export { timeSystem } from "./time.ts";
export { drainDurability, getMaxDurability, isTool } from "./tool-durability.ts";
export { workstationProximitySystem } from "./workstation-proximity.ts";
export { worldEventSystem } from "./world-event.ts";
