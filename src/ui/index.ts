/**
 * @module ui
 * @role All game UI: HUD overlays, tome browser, damage feedback
 * @input Koota entity traits, game state
 * @output DOM elements positioned over the game canvas
 * @depends traits, content
 */
export { HealthBar, Hotbar, Minimap, type MinimapMarker, DamageIndicator } from './hud/index.ts';
export { TomeOverlay, type TomeWeaponDisplay, PageBrowser, type TomePage } from './tome/index.ts';
