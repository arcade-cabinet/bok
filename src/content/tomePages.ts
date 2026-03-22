/**
 * @module content/tomePages
 * @role Display metadata for tome page abilities (name, icon, description)
 */
import type { TomePage } from '../components/modals/TomePageBrowser';

/** Extended metadata including which boss drops the page and in which biome. */
export interface TomePageMeta {
  name: string;
  icon: string;
  description: string;
  bossName: string;
  biomeName: string;
}

/** Ability ID → display metadata for the tome page browser. */
export const TOME_PAGE_CATALOG: Record<string, Omit<TomePage, 'id' | 'level'>> = {
  dash: { name: 'Dash', icon: '💨', description: 'Burst forward with uncanny speed, phasing through enemies.' },
  'ice-path': {
    name: 'Ice Path',
    icon: '❄️',
    description: 'Freeze the ground beneath your feet, creating a slippery trail.',
  },
  'fire-lance': {
    name: 'Fire Lance',
    icon: '🔥',
    description: 'Hurl a blazing spear that pierces through multiple foes.',
  },
  'block-shield': {
    name: 'Block Shield',
    icon: '🛡️',
    description: 'Conjure a magical barrier that absorbs incoming damage.',
  },
  'ground-pound': {
    name: 'Ground Pound',
    icon: '💥',
    description: 'Slam the earth with devastating force, staggering nearby enemies.',
  },
  'wind-jump': {
    name: 'Wind Jump',
    icon: '🌪️',
    description: 'Ride an updraft to leap far higher than normally possible.',
  },
  'stone-skin': {
    name: 'Stone Skin',
    icon: '🪨',
    description: 'Harden your body to stone, greatly reducing damage taken.',
  },
  'shadow-step': {
    name: 'Shadow Step',
    icon: '👤',
    description: 'Melt into the shadows and reappear behind your target.',
  },
};

/** Extended catalog with boss/biome provenance for the enhanced TomePageBrowser. */
export const TOME_PAGE_EXTENDED: Record<string, TomePageMeta> = {
  dash: {
    ...TOME_PAGE_CATALOG.dash,
    bossName: 'Ancient Treant',
    biomeName: 'Whispering Woods',
  },
  'ice-path': {
    ...TOME_PAGE_CATALOG['ice-path'],
    bossName: 'Frost Wyrm',
    biomeName: 'Frozen Tundra',
  },
  'fire-lance': {
    ...TOME_PAGE_CATALOG['fire-lance'],
    bossName: 'Magma King',
    biomeName: 'Volcanic Wastes',
  },
  'block-shield': {
    ...TOME_PAGE_CATALOG['block-shield'],
    bossName: 'Mire Hag',
    biomeName: 'Murky Swamp',
  },
  'ground-pound': {
    ...TOME_PAGE_CATALOG['ground-pound'],
    bossName: 'Pharaoh Construct',
    biomeName: 'Scorching Desert',
  },
  'wind-jump': {
    ...TOME_PAGE_CATALOG['wind-jump'],
    bossName: 'Storm Titan',
    biomeName: 'Sky Ruins',
  },
  'stone-skin': {
    ...TOME_PAGE_CATALOG['stone-skin'],
    bossName: 'Abyssal Leviathan',
    biomeName: 'Deep Ocean',
  },
  'shadow-step': {
    ...TOME_PAGE_CATALOG['shadow-step'],
    bossName: 'Crystal Hydra',
    biomeName: 'Crystal Caves',
  },
};

/** Ordered list of all tome page ability IDs. */
export const ALL_TOME_PAGE_IDS: string[] = Object.keys(TOME_PAGE_EXTENDED);
