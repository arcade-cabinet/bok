/**
 * @module scenes
 * @role Game state FSM — manages scene lifecycle and transitions
 * @depends traits
 */
export { Scene } from './Scene.ts';
export { SceneDirector } from './SceneDirector.ts';
export type { SceneName } from './SceneDirector.ts';
export { MainMenuScene } from './MainMenuScene.ts';
export { HubScene } from './HubScene.ts';
export { IslandScene } from './IslandScene.ts';
export { BossArenaScene } from './BossArenaScene.ts';
export { IslandSelectScene, type BiomeCard } from './IslandSelectScene.ts';
export { SailingScene } from './SailingScene.ts';
export { ResultsScene, type RunStats } from './ResultsScene.ts';
