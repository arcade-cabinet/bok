/**
 * @module ui/screens
 * @role Full-screen overlays: main menu, pause, death, and victory screens
 * @input SceneDirector for transitions, run stats for results
 * @output DOM overlays with parchment styling and Cormorant Garamond typography
 * @depends scenes (SceneDirector)
 */

export { DeathScreen, type DeathStats } from './DeathScreen.ts';
export { MainMenu } from './MainMenu.ts';
export { PauseMenu } from './PauseMenu.ts';
export { VictoryScreen, type VictoryStats } from './VictoryScreen.ts';
