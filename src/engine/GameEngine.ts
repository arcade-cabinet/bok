/**
 * @module engine/GameEngine
 * @role Thin orchestrator — wires setup modules into a running game
 * @input Canvas element, game config
 * @output Running game with cleanup function
 */
import RAPIER from '@dimforge/rapier3d';
import { loadRuntime } from '@jolly-pixel/runtime';
import { VoxelRenderer } from '@jolly-pixel/voxel.renderer';
import * as THREE from 'three';

import { actions } from '../actions';
import { startAtmosphericSFX, stopAtmosphericSFX } from '../audio/AtmosphericSFX.ts';
import { startAmbient } from '../audio/GameAudio.ts';
import { playBiomeMusic, stopMusic } from '../audio/MusicManager.ts';
import { ContentRegistry } from '../content/index.ts';
import { createGhostPreview } from '../rendering/GhostPreview.ts';
import {
  CW_TILESET_COLS,
  CW_TILESET_ROWS,
  generateCubeWorldTileset,
  generateTileset,
  ParticleSystem,
  TILESET_COLS,
  TILESET_ROWS,
  WeatherSystem,
} from '../rendering/index';
import { createBlockInteraction, SHAPE_DISPLAY_NAMES } from '../systems/block-interaction.ts';
import { GameModeState } from '../traits';
import { world as kootaWorld } from '../world';
import { getBiomeBlockDefs } from './biomeBlocks.ts';
import { ChunkWorld } from './chunkWorld.ts';
import { createCombat } from './combat.ts';
import { applyTintsAfterLoad, spawnEnemies } from './enemySetup.ts';
import { createEngineCore } from './engineSetup.ts';
import { captureSnapshot, type SnapshotSources } from './engineSnapshot.ts';
import { createGameLoop } from './gameLoop.ts';
import { deriveIslandSeed } from './islandSeed.ts';
import { spawnChests } from './lootSetup.ts';
import { spawnModelActor } from './models.ts';
import { createPlayer } from './playerSetup.ts';
import type { EngineEventListener, EngineState, GameStartConfig, MobileInput } from './types.ts';

export type { MobileInput } from './types.ts';

export interface GameInstance {
  getState: () => EngineState;
  onEvent: (listener: EngineEventListener) => void;
  triggerAttack: () => void;
  setMobileInput: (input: MobileInput) => void;
  togglePause: () => void;
  captureSnapshot: () => import('../persistence/GameStateSerializer.ts').SerializedGameState;
  /** Block interaction: cycle selected block (+1 or -1) */
  cycleBlock: (direction: 1 | -1) => void;
  /** Block interaction: cycle selected shape, returns new shape display name */
  cycleShape: () => string;
  /** Block interaction: get the name of the selected block */
  getSelectedBlockName: () => string;
  /** Get all accumulated block deltas (for island persistence on exit) */
  getBlockDeltas: () => ReadonlyArray<{ x: number; y: number; z: number; blockId: number }>;
  /** Flush accumulated block deltas (call after persisting) */
  flushBlockDeltas: () => void;
  /** Change equipped weapon mid-game (updates combat damage) */
  setEquippedWeapon: (weaponId: string) => void;
  /** Change equipped tool tier mid-game (updates block breaking speed) */
  setToolTier: (tier: string) => void;
  destroy: () => void;
}

/**
 * Initialize the full game on a canvas element.
 * Uses ChunkWorld for infinite seed-based terrain generation.
 */
export async function initGame(canvas: HTMLCanvasElement, config: GameStartConfig): Promise<GameInstance> {
  // --- Content lookups ---
  const content = new ContentRegistry();
  const biomeConfig = content.getBiome(config.biome);
  const bossConfig = content.getBoss(biomeConfig.bossId);

  // --- Island-specific seed: ensures different biomes produce different terrain ---
  const islandSeed = deriveIslandSeed(config.seed, config.biome);

  // --- Core engine with biome atmosphere ---
  const engine = await createEngineCore(canvas, {
    skyColor: biomeConfig.skyColor,
    fogColor: biomeConfig.fogColor,
    fogDensity: biomeConfig.fogDensity,
  });

  // --- Initialize Koota ECS world (runs alongside old engine systems) ---
  try {
    kootaWorld.set(GameModeState, { mode: config.mode });
    console.log('[Bok] Koota ECS world initialized with mode:', config.mode);
  } catch (err) {
    console.warn('[Bok] Failed to initialize Koota ECS world:', err);
  }

  // --- Chunk-based infinite terrain ---
  const blockDefs = getBiomeBlockDefs(config.biome);
  const voxelMap = engine.jpWorld.createActor('terrain').addComponentAndGet(VoxelRenderer, {
    chunkSize: 16,
    layers: ['Ground'],
    blocks: blockDefs,
    alphaTest: 0.5,
    material: 'lambert',
    rapier: { api: RAPIER as never, world: engine.rapierWorld as never },
  });

  // Register CubeWorld-palette tileset with procedural detail, falling back to bright programmatic.
  const tileset = (() => {
    try {
      return { ...generateCubeWorldTileset(), cols: CW_TILESET_COLS, rows: CW_TILESET_ROWS };
    } catch {
      const fallback = generateTileset();
      return { ...fallback, cols: TILESET_COLS, rows: TILESET_ROWS };
    }
  })();
  const tilesetTexture = new THREE.Texture(tileset.canvas);
  tilesetTexture.magFilter = THREE.NearestFilter;
  tilesetTexture.minFilter = THREE.NearestFilter;
  tilesetTexture.needsUpdate = true;
  voxelMap.tilesetManager.registerTexture(
    { id: 'game', src: tileset.dataUrl, tileSize: 32, cols: tileset.cols, rows: tileset.rows },
    tilesetTexture as unknown as THREE.Texture<HTMLImageElement>,
  );

  // Create ChunkWorld — infinite terrain from island-specific seed
  const chunkWorld = new ChunkWorld(voxelMap, { seed: islandSeed, biome: biomeConfig });
  // Generate initial chunks around spawn (0,0)
  chunkWorld.updateAroundPlayer(0, 0);

  // --- Restore block deltas from persistence (if returning to a previously visited island) ---
  if (config.restoredDeltas && config.restoredDeltas.length > 0) {
    chunkWorld.applyWorldDeltas(config.restoredDeltas);
    console.log(`[Bok] Restored ${config.restoredDeltas.length} block deltas for ${config.biome}`);
  }

  // --- Block interaction system ---
  const blockInteraction = createBlockInteraction(RAPIER, engine.rapierWorld, voxelMap, chunkWorld);

  // --- Ghost preview wireframe ---
  const ghostPreview = createGhostPreview(engine.scene);

  // --- Weather + Particles ---
  const weatherSystem = new WeatherSystem();
  engine.scene.add(weatherSystem.mesh);
  weatherSystem.setWeather(config.biome);
  const particles = new ParticleSystem();
  engine.scene.add(particles.mesh);

  // --- Day/night biome tint ---
  engine.dayNight.setBiomeTint(new THREE.Color(biomeConfig.skyColor));

  // --- Environment props (3D models: trees, rocks, crystals, etc.) ---
  // Props use JollyPixel actors with ModelRenderer — models batch-load during awake().
  try {
    const { generatePropPlacements, spawnPropActors } = await import('../systems/spawn-props');
    const propPlacements = generatePropPlacements(
      islandSeed,
      config.biome,
      -32,
      -32,
      32,
      32,
      chunkWorld.getSurfaceY.bind(chunkWorld),
    );
    spawnPropActors(engine.jpWorld, propPlacements);
  } catch (err) {
    console.warn('[Bok] Prop spawning failed:', err);
  }

  // --- Structures (ruins, dungeons, shrines, markets, towers, houses) ---
  // Structures are multi-piece glTF placements driven by StructureTemplates.
  // Each piece gets a JollyPixel actor with ModelRenderer — batch-loads during awake().
  let shrineLandmarks: Array<{ x: number; z: number; discovered: boolean }> = [];
  try {
    const { generateStructurePlacements, spawnStructureActors, getShrineLandmarks } = await import(
      '../systems/spawn-structures'
    );
    const structurePlacements = generateStructurePlacements(
      islandSeed,
      config.biome,
      -30,
      -30,
      30,
      30,
      chunkWorld.getSurfaceY.bind(chunkWorld),
      4,
    );
    spawnStructureActors(engine.jpWorld, structurePlacements, chunkWorld.getSurfaceY.bind(chunkWorld));
    shrineLandmarks = getShrineLandmarks(structurePlacements).map((s) => ({ ...s, discovered: false }));

    // --- Shrine glow: golden point lights visible from distance ---
    for (const shrine of shrineLandmarks) {
      const shrineY = chunkWorld.getSurfaceY(Math.round(shrine.x), Math.round(shrine.z));
      const light = new THREE.PointLight(0xc4a572, 2, 25);
      light.position.set(shrine.x, shrineY + 3, shrine.z);
      light.name = `shrine-glow-${Math.round(shrine.x)}-${Math.round(shrine.z)}`;
      engine.scene.add(light);
    }
  } catch (err) {
    console.warn('[Bok] Structure spawning failed:', err);
  }

  // --- Enemies + Boss (spawn around origin for now) ---
  // Enemies are now JollyPixel actors with ModelRenderer — models load during awake().
  const worldSize = 64; // effective area for initial enemy placement
  const {
    enemies,
    boss,
    bossMesh,
    yukaManager,
    actors: enemyActors,
    kootaEntities: _kootaEntities,
    kootaBossEntity: _kootaBossEntity,
    cleanup: cleanupEnemies,
  } = spawnEnemies(
    engine.jpWorld,
    engine.scene,
    chunkWorld.getSurfaceY.bind(chunkWorld),
    worldSize,
    islandSeed,
    config.biome,
    kootaWorld,
  );

  // --- Player at world origin ---
  // Weapon model is a JollyPixel actor — loads during awake().
  const { cam, inputSystem } = createPlayer(
    engine.jpWorld,
    canvas,
    chunkWorld.getSurfaceY.bind(chunkWorld),
    engine.isMobile,
    0,
    0,
  );

  // --- Spawn Koota player entity for ECS systems ---
  try {
    const { spawnPlayer } = actions(kootaWorld);
    spawnPlayer(0, 0);
    console.log('[Bok] Koota player entity spawned');
  } catch (err) {
    console.warn('[Bok] Failed to spawn Koota player entity:', err);
  }

  // --- Passive animals (spawn near player, wander) ---
  // Animals use JollyPixel actors with ModelRenderer — models load during awake().
  try {
    const { generateAnimalSpawns } = await import('../systems/spawn-animals');
    const animalSpawns = generateAnimalSpawns(
      islandSeed,
      config.biome,
      0,
      0,
      0,
      chunkWorld.getSurfaceY.bind(chunkWorld),
      0,
    );
    for (const spawn of animalSpawns) {
      spawnModelActor(
        engine.jpWorld,
        `animal-${spawn.type}`,
        `/assets/models/Animals/${spawn.modelFile}.gltf`,
        { x: spawn.x, y: spawn.y, z: spawn.z },
        0.6,
      );
    }
  } catch (err) {
    console.warn('[Bok] Animal spawning failed:', err);
  }

  // --- Weapon + Tool Tier ---
  const weaponConfig = content.getWeapon('wooden-sword');
  // Creative mode starts with diamond tools for instant block breaking
  const initialToolTier = config.mode === 'creative' ? 'diamond' : 'hand';

  // --- Loot chests ---
  const chestCount = 4 + Math.floor(Math.random() * 4);
  const { chests, cleanup: cleanupChests } = spawnChests(
    engine.scene,
    chunkWorld.getSurfaceY.bind(chunkWorld),
    worldSize,
    islandSeed,
    chestCount,
  );

  // --- Combat ---
  const eventListeners: EngineEventListener[] = [];
  const combat = createCombat(
    engine.scene,
    enemies,
    boss,
    bossMesh,
    (event) => {
      for (const listener of eventListeners) listener(event);
    },
    bossConfig.id,
    bossConfig.tomePageDrop,
    bossConfig.phases,
    weaponConfig,
    chests,
    islandSeed,
    particles,
    config.mode,
  );

  // --- Mobile input ---
  const mobileInput: MobileInput = { moveX: 0, moveZ: 0, lookX: 0, lookY: 0, action: null };

  // --- Game loop ---
  const loop = createGameLoop({
    jpWorld: engine.jpWorld,
    rapierWorld: engine.rapierWorld,
    gameWorld: engine.gameWorld,
    kootaWorld,
    scene: engine.scene,
    dayNight: engine.dayNight,
    cam,
    inputSystem,
    enemies,
    yukaManager,
    combat,
    isMobile: engine.isMobile,
    mobileInput,
    getSurfaceY: chunkWorld.getSurfaceY.bind(chunkWorld),
    weatherSystem,
    particles,
    blockInteraction,
    ghostPreview,
    onEngineEvent: (event) => {
      for (const listener of eventListeners) listener(event);
    },
    initialToolTier,
  });

  // --- Audio ---
  startAmbient();
  playBiomeMusic(config.biome);
  startAtmosphericSFX();

  // --- Boot ---
  // loadRuntime() batch-loads all enqueued assets, then runtime.start() triggers
  // awake() on all actors. After this, ModelRenderer children are in the scene graph.
  await loadRuntime(engine.runtime);

  // Apply biome tinting now that model meshes are loaded and available.
  applyTintsAfterLoad(enemyActors, config.biome);

  console.log('[Bok] Engine initialized — infinite ChunkWorld (JollyPixel ModelRenderer)');

  return {
    getState: (): EngineState => {
      // Update chunks based on player position
      chunkWorld.updateAroundPlayer(cam.camera.position.x, cam.camera.position.z);

      // Check shrine proximity for landmark discovery (radius 6 world units)
      const SHRINE_DISCOVER_RADIUS = 6;
      for (const shrine of shrineLandmarks) {
        if (shrine.discovered) continue;
        const dx = cam.camera.position.x - shrine.x;
        const dz = cam.camera.position.z - shrine.z;
        if (dx * dx + dz * dz < SHRINE_DISCOVER_RADIUS * SHRINE_DISCOVER_RADIUS) {
          shrine.discovered = true;
          // Remove shrine glow light
          const glowName = `shrine-glow-${Math.round(shrine.x)}-${Math.round(shrine.z)}`;
          const glowLight = engine.scene.getObjectByName(glowName);
          if (glowLight) engine.scene.remove(glowLight);
          for (const listener of eventListeners) {
            listener({ type: 'landmarkDiscovered', position: { x: shrine.x, z: shrine.z } });
          }
        }
      }

      return {
        playerHealth: combat.state.playerHealth,
        maxHealth: combat.state.maxHealth,
        enemyCount: enemies.length,
        biomeName: biomeConfig.name,
        bossNearby:
          !boss.defeated &&
          (() => {
            const dx = cam.camera.position.x - bossMesh.position.x;
            const dz = cam.camera.position.z - bossMesh.position.z;
            return Math.sqrt(dx * dx + dz * dz) < 20;
          })(),
        bossHealthPct: boss.defeated ? 0 : (enemies.find((e) => e.mesh === bossMesh)?.health ?? 0) / boss.maxHealth,
        bossPhase: boss.phase,
        paused: loop.isPaused(),
        phase: loop.isPaused() ? 'paused' : combat.state.phase,
        context: loop.getContext(),
        stamina: loop.getStamina(),
        maxStamina: loop.getMaxStamina(),
        comboStep: combat.getComboStep(),
        isBlocking: loop.isBlocking(),
        suggestedTargetPos: (() => {
          const gov = loop.getGovernorOutput();
          if (gov.suggestedTarget >= 0 && gov.suggestedTarget < enemies.length) {
            return {
              x: enemies[gov.suggestedTarget].mesh.position.x,
              y: enemies[gov.suggestedTarget].mesh.position.y,
              z: enemies[gov.suggestedTarget].mesh.position.z,
            };
          }
          return null;
        })(),
        threatLevel: loop.getGovernorOutput().threatLevel,
        canDodge: loop.getGovernorOutput().canDodge,
        playerX: cam.camera.position.x,
        playerZ: cam.camera.position.z,
        minimapMarkers: [
          ...enemies.map((e) => ({ x: e.mesh.position.x, z: e.mesh.position.z, type: 'enemy' as const })),
          ...combat.state.lootDrops.map((d) => ({
            x: d.mesh.position.x,
            z: d.mesh.position.z,
            type: 'chest' as const,
          })),
          ...shrineLandmarks.filter((s) => !s.discovered).map((s) => ({ x: s.x, z: s.z, type: 'shrine' as const })),
        ],
        selectedBlockName: blockInteraction.getSelectedBlockName(),
        selectedShapeName: SHAPE_DISPLAY_NAMES[blockInteraction.getSelectedShape()] ?? 'Cube',
        selectedBlockLabel: blockInteraction.getSelectedBlockLabel(),
        lookingAtBlock: (() => {
          const result = blockInteraction.query(cam.camera);
          return result.targetBlock !== null;
        })(),
        placementPreview: (() => {
          const preview = blockInteraction.getPlacementPreview(cam.camera);
          if (!preview) return null;
          return { x: preview.position.x, y: preview.position.y, z: preview.position.z, shape: preview.shape };
        })(),
        breakingProgress: loop.getBreakingProgress(),
        bossPosition: boss.defeated ? null : { x: bossMesh.position.x, y: bossMesh.position.y, z: bossMesh.position.z },
        bossDefeated: boss.defeated,
        playerYaw: cam.camera.rotation.y,
        enemyPositions: enemies
          .filter((e) => {
            if (e.dying) return false;
            const dx = cam.camera.position.x - e.mesh.position.x;
            const dz = cam.camera.position.z - e.mesh.position.z;
            return dx * dx + dz * dz < 20 * 20;
          })
          .map((e) => ({
            x: e.mesh.position.x,
            y: e.mesh.position.y,
            z: e.mesh.position.z,
            health: e.health,
            maxHealth: e.maxHealth,
            type: e.type,
          })),
        bossName: bossConfig.name,
        targetBlockPosition: (() => {
          const result = blockInteraction.query(cam.camera);
          if (!result.targetBlock) return null;
          return { x: result.targetBlock.x, y: result.targetBlock.y, z: result.targetBlock.z };
        })(),
        equippedWeaponId: combat.getWeaponId(),
        equippedToolTier: loop.getToolTier(),
      };
    },
    onEvent: (listener) => {
      eventListeners.push(listener);
    },
    captureSnapshot: () => {
      const combatSources = combat.getSnapshotSources();
      const sources: SnapshotSources = {
        config: { biome: config.biome, seed: config.seed },
        cameraPosition: { x: cam.camera.position.x, y: cam.camera.position.y, z: cam.camera.position.z },
        combatState: combatSources.combatState ?? {
          playerHealth: combat.state.playerHealth,
          maxHealth: combat.state.maxHealth,
          killCount: 0,
          elapsed: 0,
        },
        enemies: combatSources.enemies ?? [],
        inventory: {},
        equippedWeapon: combat.getWeaponId(),
        openedChests: [],
        defeatedBoss: combatSources.defeatedBoss ?? boss.defeated,
      };
      return captureSnapshot(sources);
    },
    triggerAttack: () => combat.triggerAttack(),
    cycleBlock: (direction: 1 | -1) => blockInteraction.cycleBlock(direction),
    cycleShape: () => blockInteraction.cycleShape(),
    getSelectedBlockName: () => blockInteraction.getSelectedBlockName(),
    getBlockDeltas: () => blockInteraction.getDeltas(),
    flushBlockDeltas: () => blockInteraction.flushDeltas(),
    setMobileInput: (input: MobileInput) => {
      mobileInput.moveX = input.moveX;
      mobileInput.moveZ = input.moveZ;
      mobileInput.lookX = input.lookX;
      mobileInput.lookY = input.lookY;
      if (input.action) mobileInput.action = input.action;
    },
    togglePause: () => loop.togglePause(),
    setEquippedWeapon: (weaponId: string) => {
      combat.setWeapon(weaponId);
      // Auto-derive tool tier from weapon: tier lookup via content registry
      try {
        const weapons = content.getAllWeapons();
        const w = weapons.find((wp) => wp.id === weaponId);
        // Map weapon power level to tool tier based on base damage thresholds
        if (w) {
          let tier = 'wood';
          if (w.baseDamage >= 18) tier = 'diamond';
          else if (w.baseDamage >= 14) tier = 'gold';
          else if (w.baseDamage >= 10) tier = 'stone';
          loop.setToolTier(tier);
        }
      } catch {
        // Keep current tool tier on lookup failure
      }
    },
    setToolTier: (tier: string) => loop.setToolTier(tier),
    destroy: () => {
      combat.cleanup();
      cleanupChests();
      cleanupEnemies();
      ghostPreview.dispose();
      weatherSystem.dispose();
      engine.scene.remove(particles.mesh);
      stopMusic();
      stopAtmosphericSFX();
      engine.runtime.stop();
      engine.gameWorld.destroy();
      // Koota ECS world is a singleton — reset it rather than destroy
      try {
        kootaWorld.reset();
      } catch (err) {
        console.warn('[Bok] Failed to reset Koota world:', err);
      }
    },
  };
}
