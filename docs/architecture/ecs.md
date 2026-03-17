# ECS Architecture (Koota)

## Overview

Bok uses **Koota** for entity-component-system (ECS) state management. All gameplay state lives in the Koota world — the rendering layer (Three.js) reads from it but never owns game state.

```text
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  ECS World   │────>│  Game Bridge │────>│  Three.js    │
│  (Koota)     │     │  (sync layer)│     │  (rendering) │
│              │<────│              │<────│              │
│  State truth │     │  callbacks   │     │  Visual only │
└──────────────┘     └──────────────┘     └──────────────┘
```

## Traits (Components)

All traits are defined in `src/ecs/traits/index.ts` using `trait()` from Koota.

### Player

| Trait | Key Fields | Purpose |
|-------|-----------|---------|
| `PlayerTag` | — | Marker — identifies the player entity |
| `Position` | x, y, z | World position |
| `Velocity` | x, y, z | Movement velocity |
| `Rotation` | pitch, yaw | Camera/look direction |
| `Health` | current, max | Hit points (0 = death) |
| `Hunger` | current, max, decayRate | Depletes over time |
| `Stamina` | current, max, regenRate | Sprint/jump resource |
| `PhysicsBody` | onGround, isSwimming, gravity, width, height, depth | Collision + physics state |
| `MoveInput` | forward, backward, left, right, jump, sprint | Input flags written each frame |
| `PlayerState` | isRunning, isDead, damageFlash, shakeX, shakeY, hungerSlowed, wantsEat | Meta state + camera shake |
| `ToolSwing` | progress, swayX, swayY, targetSwayX, targetSwayY | View model animation |

### Camera

| Trait | Key Fields | Purpose |
|-------|-----------|---------|
| `CameraTag` | — | Marker |
| `CameraFollow` | targetEntity, smoothing | Camera attachment |
| `CameraTransition` | active, progress, duration, start/target/lookAt XYZ, toEtching | Smooth cut to etching mode |

### Inventory

| Trait | Key Fields | Purpose |
|-------|-----------|---------|
| `Inventory` | items (Record), capacity | Item counts by block/item ID |
| `Hotbar` | slots[5], activeSlot | Equipped block or item per slot |
| `Equipment` | head, chest, legs, accessory | Worn armor slots |

### Mining / Crafting

| Trait | Key Fields | Purpose |
|-------|-----------|---------|
| `MiningState` | active, progress, targetX/Y/Z, targetKey, lastHitTime | Block mining progress |
| `CookingState` | active, timer, inputId, resultId | Active cooking operation |
| `WorkstationProximity` | maxTier | Highest workstation tier within range |

### Quest / Progression

| Trait | Key Fields | Purpose |
|-------|-----------|---------|
| `QuestProgress` | step, progress | Tutorial quest steps |
| `InscriptionLevel` | totalBlocksPlaced, totalBlocksMined, structuresBuilt | World modification tracking |
| `ExploredChunks` | visited (Set) | Packed chunk keys for fog of war |
| `Codex` | creatureProgress, loreEntries, discoveredRecipes | Observed knowledge |
| `SagaLog` | achieved, entries, creaturesKilled, bossDefeated | Narrative milestone log |

### World

| Trait | Key Fields | Purpose |
|-------|-----------|---------|
| `WorldTime` | timeOfDay, dayDuration, dayCount | Day/night cycle |
| `WorldSeed` | seed | Deterministic generation seed |
| `SeasonState` | current, progress, hungerMult, morkerMult, nightMult, tranaMigrating | Active season effects |
| `NorrskenEvent` | active, timer, dayTriggered, wasNight | Northern lights event state |

### Creature

| Trait | Key Fields | Purpose |
|-------|-----------|---------|
| `CreatureTag` | — | Marker — identifies creature entities |
| `CreatureType` | species | Species from Swedish folklore (Morker, Vittra, etc.) |
| `CreatureAI` | aiType, behaviorState, targetEntity, aggroRange, attackRange, moveSpeed | AI behavior control |
| `CreatureAnimation` | animState, animTimer, variant | Animation state machine |
| `CreatureHealth` | hp, maxHp, velY, meshIndex | HP + renderer mesh slot |
| `YukaState` | hasVehicle, currentStateName, wantsJump | Yuka pathfinding bridge |

### Rune

| Trait | Key Fields | Purpose |
|-------|-----------|---------|
| `RuneFaces` | faces (Record "x,y,z" → number[6]) | Rune ID per block face |
| `ChiselState` | active, selectedFace, selectedX/Y/Z, xrayActive, wheelOpen | Chisel tool interaction |
| `EtchingState` | active, selectedRuneId, blockX/Y/Z, faceIndex, lastScore, lastAccepted | Glyph tracing session |
| `RuneDiscovery` | discovered (Set), prevHealth, prevTimeOfDay | Unlocked rune IDs + edge detection |

### Settlement

| Trait | Key Fields | Purpose |
|-------|-----------|---------|
| `ShelterState` | inShelter, structureVolume, faluRedCount, morkerSpawnMult | Enclosed-space detection |
| `TerritoryState` | density, radius, sealActive, hostileSpawnMult, passiveBonus | Territory density + spawn modifiers |
| `SettlementBonusState` | combatMult, foodMult, detectionBonus, defenseMult | Archetype bonuses applied to player |

### Farming

| Trait | Key Fields | Purpose |
|-------|-----------|---------|
| `FarmPlots` | plots (Record "x,y,z" → FarmPlotEntry), lastProcessedDay | Planted crop state |

### UI

| Trait | Key Fields | Purpose |
|-------|-----------|---------|
| `TomteHint` | text, visible | Tutorial speech-bubble content |

---

## Systems

Systems are pure functions: `(world: World, dt: number, ...sideEffects) => void`. They run every frame inside `GameBridge.update()`.

The barrel export at `src/ecs/systems/index.ts` is the authoritative list. Systems are grouped below by category.

### System Categories

| Category | Systems |
|----------|---------|
| **Core** | movementSystem, physicsSystem, miningSystem, survivalSystem, cookingSystem, eatingSystem, timeSystem, questSystem, workstationProximitySystem, structureSystem, lightSystem |
| **Creature** | creatureSystem, creatureSpawner (passive/neutral/hostile), tomteSpawnSystem, ecosystem |
| **Rune** | runeInscriptionSystem, runeIndex, emitterSystem, signal propagation, interactionRuneSystem, protectionRuneSystem, networkRuneSystem, computationalRuneSystem, selfModifySystem, runeSensorSystem, runeCombatEffectsSystem, runeResourcePickupSystem, raidoSystem |
| **Settlement** | settlementSystem, settlementDetector, settlementBonus, territorySystem |
| **Season** | seasonSystem, seasonEffectsSystem, worldEventSystem |
| **Quality** | quality-presets, chunk-lod |
| **Progression** | progressionArc, sagaSystem, codexSystem, explorationSystem, runeDiscoverySystem |
| **Farming** | farmingSystem |

### Execution Order (GameBridge)

```text
updateAutopilot (dev only)
movementSystem → physicsSystem → survivalSystem → eatingSystem → cookingSystem
questSystem → timeSystem → seasonSystem → seasonEffectsSystem
workstationProximitySystem → structureSystem → lightSystem
runeSensorSystem → emitterSystem → interactionRuneSystem → protectionRuneSystem
networkRuneSystem → computationalRuneSystem → selfModifySystem
settlementSystem → territorySystem → raidoSystem
explorationSystem → creatureSystem → codexSystem → sagaSystem
runeDiscoverySystem → worldEventSystem → tickRuneWorld
```

Order matters: movement before physics (input drives velocity), physics before survival (fall damage), time before creature (day/night affects spawning).

---

## Side-Effect Callback Pattern

ECS systems never import Three.js. When a system needs to trigger a visual effect (spawn particles, remove a block, play a sound), the GameBridge passes a callback at call time:

```typescript
// mining.ts — pure ECS, no Three.js import
export interface MiningSideEffects {
  removeBlock: (x: number, y: number, z: number) => void;
  spawnParticles: (x: number, y: number, z: number, color: string, count: number) => void;
}

export function miningSystem(world: World, dt: number, hit: BlockHit | null, effects: MiningSideEffects) {
  // calls effects.removeBlock() rather than importing the voxel renderer
}
```

The GameBridge wires the concrete callbacks from the renderer layer:

```typescript
// game-bridge.ts
miningSystem(world, dt, hit, {
  removeBlock: (x, y, z) => setVoxelAt("Ground", x, y, z, 0),
  spawnParticles: spawn,
});
```

This keeps systems testable in isolation with no rendering dependencies.

---

## Entity Spawning

### Player Entity

Spawned once in `spawnPlayerEntity()` (called from `initGame()`):

```typescript
kootaWorld.spawn(
  PlayerTag, Position, Velocity, Rotation, Health, Hunger, Stamina,
  PhysicsBody, MoveInput, PlayerState, Inventory, Hotbar,
  MiningState, QuestProgress, ToolSwing, Equipment, InscriptionLevel,
  ExploredChunks, Codex, SagaLog, RuneDiscovery, RuneFaces,
  ChiselState, EtchingState, CameraTransition, ShelterState,
  TerritoryState, SettlementBonusState, FarmPlots, TomteHint, YukaState,
  CookingState, WorkstationProximity,
);
```

### World Entity

Spawned once in `initGame()`:

```typescript
kootaWorld.spawn(WorldTime(...), WorldSeed({ seed }), SeasonState());
kootaWorld.spawn(NorrskenEvent());
```

### Creature Entities

Spawned dynamically by the creature spawner systems; destroyed on death or despawn:

```typescript
world.spawn(CreatureTag, CreatureType({ species }), CreatureAI(...), CreatureHealth(...), Position(...), ...);
```

---

## Querying Patterns

```typescript
// Read-only
world.query(PlayerTag, Position).readEach(([pos]) => { /* pos.x, pos.y */ });

// Mutable
world.query(PlayerTag, Health).updateEach(([health]) => { health.current -= damage; });

// With entity reference
world.query(CreatureTag, CreatureHealth).updateEach(([hp], entity) => {
  if (hp.hp <= 0) entity.destroy();
});
```

---

## World Lifecycle

- `kootaWorld` is a module-level singleton in `src/engine/game.ts`
- `initGame()` initializes noise, spawns all entities, starts the game loop
- `destroyGame()` calls `kootaWorld.reset()` (clears all entities) and resets module-level system state
- Save/load serializes specific traits to SQLite via `game-save.ts`
