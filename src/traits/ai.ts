import { trait } from 'koota';

/** Current AI behavioral state name. */
export const AIState = trait({ state: 'idle' });

/** Reference to Yuka Vehicle/GameEntity. Callback-based (AoS) since it holds an object. */
export const YukaRef = trait(() => ({ vehicle: null as unknown }));

/** Reference to JollyPixel Actor for render sync. Callback-based (AoS). */
export const ActorRef = trait(() => ({ actor: null as unknown }));

/** AI perception memory — last known player position. */
export const AIMemory = trait({ lastSeenX: 0, lastSeenY: 0, lastSeenZ: 0, lastSeenTime: 0 });

/** Goal intent output from Yuka goal system. */
export const Intent = trait({ goal: '' });

/** Enemy configuration ID (references content JSON). */
export const EnemyType = trait({ configId: '' });

/** Boss configuration ID. */
export const BossType = trait({ configId: '', phase: 1 });
