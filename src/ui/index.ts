/**
 * @module ui
 * @role All game UI: HUD overlays, tome browser, damage feedback
 * @input Koota entity traits, game state
 * @output DOM elements positioned over the game canvas
 * @depends traits, content
 */
export { DamageIndicator, HealthBar, Hotbar, Minimap, type MinimapMarker } from './hud/index.ts';
export {
  DeathScreen,
  type DeathStats,
  MainMenu,
  PauseMenu,
  VictoryScreen,
  type VictoryStats,
} from './screens/index.ts';
export { PageBrowser, TomeOverlay, type TomePage, type TomeWeaponDisplay } from './tome/index.ts';
