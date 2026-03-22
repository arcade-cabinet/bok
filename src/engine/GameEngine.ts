/**
 * @module engine/GameEngine
 * @role Thin orchestrator — wires setup modules into a running game
 * @input Canvas element, game config
 * @output Running game with cleanup function
 */
import { loadRuntime } from '@jolly-pixel/runtime';
import { VoxelRenderer } from '@jolly-pixel/voxel.renderer';
import * as THREE from 'three';

import { startAtmosphericSFX, stopAtmosphericSFX } from '../audio/AtmosphericSFX.ts';
import { startAmbient } from '../audio/GameAudio.ts';
import { playBiomeMusic, stopMusic } from '../audio/MusicManager.ts';
import { ContentRegistry } from '../content/index.ts';
import { getBiomeBlockDefs } from './biomeBlocks.ts';
import { ChunkWorld } from './chunkWorld.ts';
import { createCombat } from './combat.ts';
import { spawnEnemies } from './enemySetup.ts';
import { createEngineCore } from './engineSetup.ts';
import { captureSnapshot, type SnapshotSources } from './engineSnapshot.ts';
import { createGameLoop } from './gameLoop.ts';
import { spawnChests } from './lootSetup.ts';
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

  // --- Core engine with biome atmosphere ---
  const engine = await createEngineCore(canvas, {
    skyColor: biomeConfig.skyColor,
    fogColor: biomeConfig.fogColor,
    fogDensity: biomeConfig.fogDensity,
  });

  // --- Chunk-based infinite terrain ---
  const blockDefs = getBiomeBlockDefs(config.biome);
  const RAPIER = (await import('@dimforge/rapier3d')).default;
  const voxelMap = engine.jpWorld.createActor('terrain').addComponentAndGet(VoxelRenderer, {
    chunkSize: 16,
    layers: ['Ground'],
    blocks: blockDefs,
    alphaTest: 0.5,
    material: 'lambert',
    rapier: { api: RAPIER as never, world: engine.rapierWorld as never },
  });

  // Register tileset
  const { generateTileset, TILESET_COLS, TILESET_ROWS } = await import('../rendering/index');
  const tileset = generateTileset();
  const tilesetTexture = new THREE.Texture(tileset.canvas);
  tilesetTexture.magFilter = THREE.NearestFilter;
  tilesetTexture.minFilter = THREE.NearestFilter;
  tilesetTexture.needsUpdate = true;
  voxelMap.tilesetManager.registerTexture(
    { id: 'game', src: tileset.dataUrl, tileSize: 32, cols: TILESET_COLS, rows: TILESET_ROWS },
    tilesetTexture as unknown as THREE.Texture<HTMLImageElement>,
  );

  // Create ChunkWorld — infinite terrain from seed
  const chunkWorld = new ChunkWorld(voxelMap, { seed: config.seed, biome: biomeConfig });
  // Generate initial chunks around spawn (0,0)
  chunkWorld.updateAroundPlayer(0, 0);

  // --- Weather + Particles ---
  const { WeatherSystem, ParticleSystem } = await import('../rendering/index');
  const weatherSystem = new WeatherSystem();
  engine.scene.add(weatherSystem.mesh);
  weatherSystem.setWeather(config.biome);
  const particles = new ParticleSystem();
  engine.scene.add(particles.mesh);

  // --- Day/night biome tint ---
  engine.dayNight.setBiomeTint(new THREE.Color(biomeConfig.skyColor));

  // --- Enemies + Boss (spawn around origin for now) ---
  const worldSize = 64; // effective area for initial enemy placement
  const {
    enemies,
    boss,
    bossMesh,
    yukaManager,
    cleanup: cleanupEnemies,
  } = await spawnEnemies(engine.scene, chunkWorld.getSurfaceY.bind(chunkWorld), worldSize, config.seed, config.biome);

  // --- Player at world origin ---
  const { cam, inputSystem } = await createPlayer(
    engine.jpWorld,
    canvas,
    chunkWorld.getSurfaceY.bind(chunkWorld),
    engine.isMobile,
    0,
    0,
  );

  // --- Weapon ---
  const weaponConfig = content.getWeapon('wooden-sword');

  // --- Loot chests ---
  const chestCount = 4 + Math.floor(Math.random() * 4);
  const { chests, cleanup: cleanupChests } = spawnChests(
    engine.scene,
    chunkWorld.getSurfaceY.bind(chunkWorld),
    worldSize,
    config.seed,
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
    config.seed,
    particles,
  );

  // --- Mobile input ---
  const mobileInput: MobileInput = { moveX: 0, moveZ: 0, lookX: 0, lookY: 0, action: null };

  // --- Game loop ---
  const loop = createGameLoop({
    jpWorld: engine.jpWorld,
    rapierWorld: engine.rapierWorld,
    gameWorld: engine.gameWorld,
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
  });

  // --- Audio ---
  startAmbient();
  playBiomeMusic(config.biome);
  startAtmosphericSFX();

  // --- Boot ---
  await loadRuntime(engine.runtime);
  console.log('[Bok] Engine initialized — infinite ChunkWorld');

  return {
    getState: (): EngineState => {
      // Update chunks based on player position
      chunkWorld.updateAroundPlayer(cam.camera.position.x, cam.camera.position.z);

      return {
        playerHealth: combat.state.playerHealth,
        maxHealth: combat.state.maxHealth,
        enemyCount: enemies.length,
        biomeName: config.biome,
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
        ],
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
        equippedWeapon: 'sword',
        openedChests: [],
        defeatedBoss: combatSources.defeatedBoss ?? boss.defeated,
      };
      return captureSnapshot(sources);
    },
    triggerAttack: () => combat.triggerAttack(),
    setMobileInput: (input: MobileInput) => {
      mobileInput.moveX = input.moveX;
      mobileInput.moveZ = input.moveZ;
      mobileInput.lookX = input.lookX;
      mobileInput.lookY = input.lookY;
      if (input.action) mobileInput.action = input.action;
    },
    togglePause: () => loop.togglePause(),
    destroy: () => {
      combat.cleanup();
      cleanupChests();
      cleanupEnemies();
      weatherSystem.dispose();
      engine.scene.remove(particles.mesh);
      stopMusic();
      stopAtmosphericSFX();
      engine.runtime.stop();
      engine.gameWorld.destroy();
    },
  };
}
