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
export { isFuseBlock, shouldFuseBurn } from "./fuse-burn.ts";
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
export { canPlaceBlock, computePlacementCost, selectPlacementBlock } from "./jera-place.ts";
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
export {
	isNetworkRune,
	NETWORK_RUNE_IDS,
	TIWAZ_BASE_MULTIPLIER,
	TIWAZ_BASE_RADIUS,
	TIWAZ_MAX_MULTIPLIER,
	TIWAZ_MAX_RADIUS,
	URUZ_FORCE_PER_STRENGTH,
	URUZ_MAX_FORCE,
	URUZ_MIN_SIGNAL,
	URUZ_PUSH_RADIUS,
} from "./network-rune-data.ts";
export type { NetworkRuneEffects } from "./network-rune-system.ts";
export { getActiveBuffZones, networkRuneSystem, resetNetworkRuneState } from "./network-rune-system.ts";
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
export {
	CRYSTAL_DUST_ID,
	isRaidoRune,
	RAIDO_GLOW,
	RAIDO_PAIR_RANGE_CHUNKS,
	RAIDO_SCAN_INTERVAL,
	TRAVEL_BASE_COST,
	TRAVEL_MAX_COST,
} from "./raido-data.ts";
export type { RaidoEffects } from "./raido-system.ts";
export { executeFastTravel, getActiveAnchors, getActivePairs, raidoSystem, resetRaidoState } from "./raido-system.ts";
export type { TravelAnchor } from "./raido-travel.ts";
export {
	canAffordTravel,
	computeTravelCost,
	findPairedAnchors,
	findRaidoAnchors,
	getPairPartner,
} from "./raido-travel.ts";
export { CHISEL_ITEM_ID, getRuneColor, getRuneDef, PLACEABLE_RUNES, RUNES, RuneId } from "./rune-data.ts";
export {
	checkDiscoveryTrigger,
	isCreatureNearby,
	isInBiome,
	isLandmarkNearby,
	isSunriseObserved,
} from "./rune-discovery.ts";
export {
	DiscoveryTrigger,
	getDiscoveryEntry,
	getTutorialRunes,
	RUNE_DISCOVERIES,
	TOTAL_DISCOVERABLE_RUNES,
} from "./rune-discovery-data.ts";
export type { RuneDiscoveryEffects } from "./rune-discovery-system.ts";
export {
	getDiscoveredRuneIds,
	grantTutorialRunes,
	registerDiscoveryBiomeResolver,
	resetDiscoveryState,
	restoreDiscoveredRunes,
	runeDiscoverySystem,
} from "./rune-discovery-system.ts";
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
	DESTROY_MIN_SIGNAL,
	FUSE_BURN_THRESHOLD,
	isSelfModifyRune,
	PLACE_MIN_SIGNAL,
} from "./self-modify-data.ts";
export type { SelfModifyEffects } from "./self-modify-system.ts";
export { resetSelfModifyState, selfModifySystem } from "./self-modify-system.ts";
export type { SettlementBonuses } from "./settlement-data.ts";
export {
	chunkNameSeed,
	computeSettlementBonuses,
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
export type { TerritoryEffects } from "./territory.ts";
export { getActiveTerritoryZones, resetTerritoryState, territorySystem } from "./territory.ts";
export type { TerritoryZone } from "./territory-data.ts";
export {
	computeTerritoryDensity,
	computeTerritoryRadius,
	hostileSpawnMultiplier,
	isInTerritory,
	isTerritoryBlock,
	passiveSpawnBonus,
	RUNE_SEAL_BLOCK_ID,
} from "./territory-data.ts";
export {
	computeDecayCount,
	countTerritoryBlocks,
	isDecayable,
	isDecayEligible,
	isSealNearby,
	selectDecayTargets,
} from "./territory-decay.ts";
export { computeThurisazDamage, findEntitiesInDamageRadius, isInDamageRadius } from "./thurisaz-damage.ts";
export { canDestroyBlock, computeDestructionCost } from "./thurisaz-destroy.ts";
export { timeSystem } from "./time.ts";
export type { BuffZone } from "./tiwaz-buff.ts";
export { computeBuffMultiplier, computeBuffRadius, getBestBuffMultiplier, isInBuffZone } from "./tiwaz-buff.ts";
export { drainDurability, getMaxDurability, isTool } from "./tool-durability.ts";
export { computePushForce, computePushVelocity, findEntitiesInPushRadius, isInPushRadius } from "./uruz-force.ts";
export { workstationProximitySystem } from "./workstation-proximity.ts";
export { worldEventSystem } from "./world-event.ts";
