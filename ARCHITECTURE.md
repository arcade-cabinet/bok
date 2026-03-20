# Architecture — Bok: The Builder's Tome

## Three-Layer Integration

### Layer 1: Koota (State)
All game entity data lives in Koota traits. Koota is the single source of truth.
- Traits: Position, Velocity, Health, AIState, WeaponStats, etc.
- Relations: ChildOf, Contains, FiredBy, Targeting
- World traits (singletons): Time, GamePhase, IslandState

### Layer 2: Yuka (AI)
Yuka owns all AI decisions for enemies and bosses.
- Steering behaviors drive enemy movement
- StateMachine drives enemy behavior states
- CompositeGoal trees drive boss phase logic
- Perception (Vision + Memory) drives awareness
- AIBridge syncs Yuka ↔ Koota bidirectionally

### Layer 3: JollyPixel (Render)
JollyPixel owns the game loop, voxel rendering, and scene graph.
- Runtime drives the frame loop
- VoxelRenderer renders chunked terrain with Rapier colliders
- Actors exist for visual entities (player model, enemy meshes)
- RenderSyncBehavior reads Koota traits → updates Actor transforms

## Frame Loop
1. Update Time (Koota world trait)
2. Poll Input → write PlayerIntent traits
3. Yuka AI update → write Velocity/AIState/Intent traits
4. Koota game systems → process movement, combat, progression, spawning
5. Rapier physics step → collision resolution, corrected positions
6. JollyPixel render sync → Koota traits → Actor transforms
7. Render frame

## Data Flow
Content JSON → ContentRegistry (Zod validated) → Generation (pure functions) → Koota entities → Systems process → Yuka AI decides → Render displays

## Persistence
@capacitor-community/sqlite with jeep-sqlite for web. SQLite tables for permanent progression, run history, settings, and mid-run save state.
