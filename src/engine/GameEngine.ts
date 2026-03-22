/**
 * @module engine/GameEngine
 * @role Thin orchestrator -- wires setup modules into a running game
 * @input Canvas element, game config
 * @output Running game with cleanup function
 */
import { loadRuntime } from '@jolly-pixel/runtime';
import * as THREE from 'three';

import { startAtmosphericSFX, stopAtmosphericSFX } from '../audio/AtmosphericSFX.ts';
import { startAmbient } from '../audio/GameAudio.ts';
import { playBiomeMusic, stopMusic } from '../audio/MusicManager.ts';
import { ContentRegistry } from '../content/index.ts';
import { createCombat } from './combat.ts';
import { spawnEnemies } from './enemySetup.ts';
import { createEngineCore } from './engineSetup.ts';
import { captureSnapshot, type SnapshotSources } from './engineSnapshot.ts';
import { createGameLoop } from './gameLoop.ts';
import { spawnChests } from './lootSetup.ts';
import { createPlayer } from './playerSetup.ts';
import { createTerrain } from './terrainSetup.ts';
import type { EngineEventListener, EngineState, GameStartConfig, MobileInput } from './types.ts';

export type { MobileInput } from './types.ts';

export interface GameInstance {
  /** Current engine state -- polled by React each frame */
  getState: () => EngineState;
  /** Subscribe to engine events (damage, kills, etc.) */
  onEvent: (listener: EngineEventListener) => void;
  /** Trigger player attack (from React touch button) */
  triggerAttack: () => void;
  /** Feed mobile joystick input from React */
  setMobileInput: (input: MobileInput) => void;
  /** Toggle pause */
  togglePause: () => void;
  /** Capture a mid-run snapshot for save/resume */
  captureSnapshot: () => import('../persistence/GameStateSerializer.ts').SerializedGameState;
  /** Cleanup everything */
  destroy: () => void;
}

/**
 * Initialize the full game on a canvas element.
 * Returns a GameInstance that React can interact with.
 */
export async function initGame(canvas: HTMLCanvasElement, config: GameStartConfig): Promise<GameInstance> {
  // --- Content lookups (needed before engine core for biome atmosphere) ---
  const content = new ContentRegistry();
  const biomeConfig = content.getBiome(config.biome);
  const bossConfig = content.getBoss(biomeConfig.bossId);

  // --- Core engine (Runtime, Rapier, Koota, scene, lighting) with biome atmosphere ---
  const engine = await createEngineCore(canvas, {
    skyColor: biomeConfig.skyColor,
    fogColor: biomeConfig.fogColor,
    fogDensity: biomeConfig.fogDensity,
  });

  // --- Biome weather effects ---
  const { WeatherSystem, ParticleSystem } = await import('../rendering/index');
  const weatherSystem = new WeatherSystem();
  engine.scene.add(weatherSystem.mesh);
  weatherSystem.setWeather(config.biome);

  // --- Particle system (combat effects, ambient) ---
  const particles = new ParticleSystem();
  engine.scene.add(particles.mesh);

  // --- Day/night biome tint ---
  engine.dayNight.setBiomeTint(new THREE.Color(biomeConfig.skyColor));

  // --- Terrain ---
  const terrain = createTerrain(engine.jpWorld, engine.rapierWorld, config.seed, config.biome);

  // --- Enemies + Boss ---
  const {
    enemies,
    boss,
    bossMesh,
    yukaManager,
    cleanup: cleanupEnemies,
  } = await spawnEnemies(engine.scene, terrain.getSurfaceY, terrain.islandSize, config.seed, config.biome);

  // --- Player (camera, input, weapon) ---
  const spawnX = Math.round(terrain.islandSize / 2);
  const spawnZ = Math.round(terrain.islandSize / 2);
  const { cam, inputSystem } = await createPlayer(
    engine.jpWorld,
    canvas,
    terrain.getSurfaceY,
    engine.isMobile,
    spawnX,
    spawnZ,
  );

  // --- Weapon config (use wooden-sword as default equipped weapon) ---
  const weaponConfig = content.getWeapon('wooden-sword');

  // --- Loot chests ---
  const chestCount = 4 + Math.floor(Math.random() * 4); // 4-7 chests per island
  const { chests, cleanup: cleanupChests } = spawnChests(
    engine.scene,
    terrain.getSurfaceY,
    terrain.islandSize,
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

  // --- Mobile input buffer (written by setMobileInput, read in frame loop) ---
  const mobileInput: MobileInput = { moveX: 0, moveZ: 0, lookX: 0, lookY: 0, action: null };

  // --- Game loop (physics + frame logic) ---
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
    getSurfaceY: terrain.getSurfaceY,
    weatherSystem,
    particles,
  });

  // --- Audio ---
  startAmbient();
  playBiomeMusic(config.biome);
  startAtmosphericSFX();

  // --- Boot ---
  await loadRuntime(engine.runtime);
  console.log('[Bok] Engine initialized');

  // --- Public API (unchanged) ---
  return {
    getState: (): EngineState => ({
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
        ...enemies.map((e) => ({
          x: e.mesh.position.x,
          z: e.mesh.position.z,
          type: 'enemy' as const,
        })),
        ...combat.state.lootDrops.map((d) => ({
          x: d.mesh.position.x,
          z: d.mesh.position.z,
          type: 'chest' as const,
        })),
        ...chests
          .filter((c) => !c.opened)
          .map((c) => ({
            x: c.position.x,
            z: c.position.z,
            type: 'chest' as const,
          })),
      ],
    }),
    onEvent: (listener) => {
      eventListeners.push(listener);
    },
    captureSnapshot: () => {
      const combatSources = combat.getSnapshotSources();
      const sources: SnapshotSources = {
        config: { biome: config.biome, seed: config.seed },
        cameraPosition: {
          x: cam.camera.position.x,
          y: cam.camera.position.y,
          z: cam.camera.position.z,
        },
        combatState: combatSources.combatState ?? {
          playerHealth: combat.state.playerHealth,
          maxHealth: combat.state.maxHealth,
          killCount: 0,
          elapsed: 0,
        },
        enemies: combatSources.enemies ?? [],
        inventory: {},
        equippedWeapon: weaponConfig.id,
        openedChests: combatSources.openedChests ?? [],
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
