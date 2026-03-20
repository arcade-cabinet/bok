/**
 * @module ui/hud
 * @role In-game HUD elements: health, hotbar, minimap, damage feedback
 * @input Koota entity traits (Health, RunGear), world state
 * @output DOM overlay elements positioned over game canvas
 * @depends traits
 */
export { HealthBar } from './HealthBar.ts';
export { Hotbar } from './Hotbar.ts';
export { Minimap, type MinimapMarker } from './Minimap.ts';
export { DamageIndicator } from './DamageIndicator.ts';
