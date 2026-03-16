# ECS Architecture (Koota)

## Overview

Bok uses **Koota** for entity-component-system (ECS) state management. All gameplay state lives in the Koota world — the rendering layer (Jolly Pixel / Three.js) reads from it but never owns game state.

```text
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  ECS World   │────>│  Game Bridge │────>│  Three.js    │
│  (Koota)     │     │  (Behavior)  │     │  (Rendering) │
│              │<────│              │<────│              │
│  State truth │     │  Sync layer  │     │  Visual only │
└──────────────┘     └──────────────┘     └──────────────┘
```

## Traits (Components)

Traits are defined in `src/ecs/traits/index.ts`. Every trait is created with `trait()` from Koota.

### Player Traits
| Trait | Fields | Purpose |
|-------|--------|---------|
| `PlayerTag` | (none) | Marker — identifies the player entity |
| `Position` | x, y, z | World position |
| `Velocity` | x, y, z | Movement velocity |
| `Rotation` | pitch, yaw | Camera/look direction |
| `Health` | current, max | Hit points (0 = death) |
| `Hunger` | current, max, decayRate | Depletes over time |
| `Stamina` | current, max, regenRate | Sprint/jump resource |
| `PhysicsBody` | onGround, isSwimming, gravity, width, height, depth | Collision + physics state |
| `MoveInput` | forward, backward, left, right, jump, sprint | Input flags |
| `PlayerState` | isRunning, isDead, damageFlash, shakeX, shakeY | Meta state |
| `Inventory` | wood, stone, dirt, grass, sand, glass, stonebricks, planks, torches | Resource counts |
| `Hotbar` | slots[5], activeSlot | Equipped items |
| `MiningState` | active, progress, targetX/Y/Z, targetKey, lastHitTime | Mining progress |
| `QuestProgress` | step, progress | Tutorial quests |
| `ToolSwing` | progress, swayX/Y, targetSwayX/Y | View model animation |

### World Traits
| Trait | Fields | Purpose |
|-------|--------|---------|
| `WorldTime` | timeOfDay, dayDuration, dayCount | Day/night cycle |
| `WorldSeed` | seed | Deterministic generation |

### Enemy Traits
| Trait | Fields | Purpose |
|-------|--------|---------|
| `EnemyTag` | (none) | Marker — identifies enemy entities |
| `EnemyState` | hp, velY, aiState, attackCooldown, meshIndex | Enemy AI + rendering |

## Systems

Systems are pure functions: `(world: World, dt: number, ...sideEffects) => void`. They run every frame in the GameBridge.

### Execution Order
```text
1. movementSystem    — Process input → velocity
2. physicsSystem     — Apply gravity, collision, swimming
3. survivalSystem    — Hunger decay, stamina regen, damage flash decay, shake decay
4. questSystem       — Check quest completion conditions
5. timeSystem        — Advance day/night cycle
6. enemySystem       — Enemy AI, spawning, combat (via side effects)
7. miningSystem      — Mining progress, block break (via side effects)
```

Order matters: movement before physics (input drives velocity), physics before survival (fall damage sets damageFlash), time before enemy (day/night affects spawning).

### Side Effect Pattern
Systems that need to interact with the rendering layer receive **side-effect callbacks** instead of importing rendering code directly:

```typescript
// mining.ts — pure ECS logic
export interface MiningSideEffects {
  removeBlock: (x: number, y: number, z: number) => void;
  spawnParticles: (x: number, y: number, z: number, color: string, count: number) => void;
}

export function miningSystem(world: World, dt: number, hit: BlockHit | null, effects: MiningSideEffects) {
  // ... uses effects.removeBlock() instead of importing voxel renderer
}
```

This keeps systems testable and decoupled from Three.js.

## Entity Spawning

### Player Entity
Spawned once in `initGame()`:
```typescript
kootaWorld.spawn(
  PlayerTag, Position, Velocity, Rotation, Health, Hunger, Stamina,
  PhysicsBody, MoveInput, PlayerState, Inventory, Hotbar,
  MiningState, QuestProgress, ToolSwing
);
```

### World Entity
Spawned once in `initGame()`:
```typescript
kootaWorld.spawn(WorldTime, WorldSeed);
```

### Enemy Entities
Spawned dynamically by `enemySystem()` during night, destroyed on death/despawn:
```typescript
world.spawn(EnemyTag, Position({ x, y, z }), EnemyState({ hp: 6, ... }));
```

## Querying Patterns

```typescript
// Read-only query (no mutation)
kootaWorld.query(PlayerTag, Position).readEach(([pos]) => {
  // pos.x, pos.y, pos.z — read only
});

// Mutable query
kootaWorld.query(PlayerTag, Health).updateEach(([health]) => {
  health.current -= damage; // mutation allowed
});

// Entity reference in callback
kootaWorld.query(EnemyTag, EnemyState).updateEach(([enemy], entity) => {
  if (enemy.hp <= 0) entity.destroy();
});
```

## World Lifecycle

- `kootaWorld` is a module-level singleton in `src/engine/game.ts`
- `initGame()` spawns entities
- `destroyGame()` calls `kootaWorld.reset()` which clears all entities
- Save/load serializes/deserializes specific traits to SQLite
