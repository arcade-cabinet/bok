/**
 * @module scenes
 * @role Game state FSM — manages scene lifecycle and transitions
 * @depends traits
 */

export { BossArenaScene } from './BossArenaScene.ts';
export { HubScene } from './HubScene.ts';
export { IslandScene } from './IslandScene.ts';
export { type BiomeCard, IslandSelectScene } from './IslandSelectScene.ts';
export { MainMenuScene } from './MainMenuScene.ts';
export { ResultsScene, type RunStats } from './ResultsScene.ts';
export { SailingScene } from './SailingScene.ts';
export { Scene } from './Scene.ts';
export type { SceneName } from './SceneDirector.ts';
export { SceneDirector } from './SceneDirector.ts';
