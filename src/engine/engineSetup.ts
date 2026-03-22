/**
 * @module engine/engineSetup
 * @role Initialize JollyPixel Runtime, Rapier physics, Koota world, and scene
 * @input Canvas element
 * @output EngineCore with all initialized systems
 */
import RAPIER from '@dimforge/rapier3d';
import type { Systems } from '@jolly-pixel/engine';
import { Runtime } from '@jolly-pixel/runtime';
import { createWorld } from 'koota';
import * as THREE from 'three';

import { isMobileDevice } from '../input/index';
import { initPlatform } from '../platform/CapacitorBridge.ts';
import { DayNightCycle } from '../rendering/index.ts';
import { GamePhase, IslandState, LookIntent, MovementIntent, Time } from '../traits/index.ts';
import type { JpWorld } from './types.ts';

/** Core engine systems initialized from a canvas element */
export interface EngineCore {
  runtime: Runtime;
  jpWorld: JpWorld;
  rapierWorld: RAPIER.World;
  gameWorld: ReturnType<typeof createWorld>;
  scene: THREE.Scene;
  dayNight: DayNightCycle;
  isMobile: boolean;
}

/** Optional biome-specific atmosphere colors for scene setup */
export interface BiomeAtmosphere {
  skyColor: string;
  fogColor: string;
  fogDensity: number;
}

/**
 * Initialize core engine systems: platform, Koota world, Rapier physics,
 * JollyPixel Runtime, scene setup, day/night cycle, and lighting.
 */
export async function createEngineCore(
  canvas: HTMLCanvasElement,
  biomeAtmosphere?: BiomeAtmosphere,
): Promise<EngineCore> {
  // Platform init (Capacitor status bar, orientation, etc.)
  await initPlatform();

  // Koota world
  const gameWorld = createWorld(Time, GamePhase, MovementIntent, LookIntent, IslandState);

  // Rapier physics
  const rapierWorld = new RAPIER.World({ x: 0, y: -9.81, z: 0 });

  // JollyPixel runtime
  const runtime = new Runtime(canvas, {
    includePerformanceStats: import.meta.env.DEV,
  });
  const jpWorld = runtime.world;

  // Mobile detection
  const isMobile = isMobileDevice();

  // Performance scaling
  const pixelRatio = Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2);
  const threeRenderer = jpWorld.renderer as unknown as Systems.ThreeRenderer;
  if (threeRenderer.webGLRenderer) threeRenderer.webGLRenderer.setPixelRatio(pixelRatio);

  // Scene setup — apply biome atmosphere or defaults
  const skyHex = biomeAtmosphere?.skyColor ?? '#87ceeb';
  const fogHex = biomeAtmosphere?.fogColor ?? '#87ceeb';
  const fogDensity = biomeAtmosphere?.fogDensity ?? 0.015;

  const scene = jpWorld.sceneManager.getSource() as THREE.Scene;
  scene.background = new THREE.Color(skyHex);
  scene.fog = new THREE.FogExp2(fogHex, fogDensity);

  // Day/night cycle + lighting
  const dayNight = new DayNightCycle();
  for (const obj of dayNight.sceneObjects) scene.add(obj);
  scene.add(new THREE.HemisphereLight(0xaaccee, 0x886622, 0.7));

  return { runtime, jpWorld, rapierWorld, gameWorld, scene, dayNight, isMobile };
}
