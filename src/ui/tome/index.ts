/**
 * @module ui/tome
 * @role Tome (inventory/ability book) UI: weapon display overlay and page browser
 * @input Player TomePages trait, weapon configs
 * @output DOM overlays for tome interaction
 * @depends traits, content
 */
export { TomeOverlay, type TomeWeaponDisplay } from './TomeOverlay.ts';
export { PageBrowser, type TomePage } from './PageBrowser.ts';
