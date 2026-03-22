/**
 * @module engine/GameEngine
 * @role Thin orchestrator — wires setup modules into a running game
 * @input Canvas element, game config
 * @output Running game with cleanup function
 */
import { loadRuntime } from '@jolly-pixel/runtime';

import { startAtmosphericSFX, stopAtmosphericSFX } from '../audio/AtmosphericSFX.ts';
import { startAmbient } from '../audio/GameAudio.ts';
import { playBiomeMusic, stopMusic } from '../audio/MusicManager.ts';
import { ContentRegistry } from '../content/index.ts';
import { createCombat } from './combat.ts';
import { spawnEnemies } from './enemySetup.ts';
import { createEngineCore } from './engineSetup.ts';
import { captureSnapshot, type SnapshotSources } from './engineSnapshot.ts';
import { createGameLoop } from './gameLoop.ts';
import { createPlayer } from './playerSetup.ts';
import { createTerrain } from './terrainSetup.ts';
import type { EngineEventListener, EngineState, GameStartConfig, MobileInput } from './types.ts';

export type { MobileInput } from './types.ts';

export interface GameInstance {
  /** Current engine state — polled by React each frame */
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
  // --- Core engine (Runtime, Rapier, Koota, scene, lighting) ---
  const engine = await createEngineCore(canvas);

  // --- Terrain ---
  const terrain = createTerrain(engine.jpWorld, engine.rapierWorld, config.seed);

  // --- Enemies + Boss ---
  const {
    enemies,
    boss,
    bossMesh,
    yukaManager,
    cleanup: cleanupEnemies,
  } = await spawnEnemies(engine.scene, terrain.getSurfaceY, terrain.islandSize, config.seed);

  // --- Player (camera, input, weapon) ---
  const { cam, inputSystem } = await createPlayer(engine.jpWorld, canvas, terrain, engine.isMobile);

  // --- Boss content lookup ---
  const content = new ContentRegistry();
  const biomeConfig = content.getBiome(config.biome);
  const bossConfig = content.getBoss(biomeConfig.bossId);

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
      cleanupEnemies();
      stopMusic();
      stopAtmosphericSFX();
      engine.runtime.stop();
      engine.gameWorld.destroy();
    },
  };
}
