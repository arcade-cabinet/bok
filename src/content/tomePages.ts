/**
 * @module content/tomePages
 * @role Display metadata for tome page abilities (name, icon, description)
 */
import type { TomePage } from '../components/modals/TomePageBrowser';

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
