import { trait } from 'koota';

/** Tag: this entity is the player. */
export const IsPlayer = trait();

/** Tome page abilities unlocked by the player. */
export const TomePages = trait(() => ({ unlockedPages: [] as string[] }));

/** Current run gear (lost on death). */
export const RunGear = trait(() => ({
  weapons: [] as string[],
  armor: '',
  consumables: [] as string[],
}));

/** Resources collected this run. */
export const RunResources = trait(() => ({ items: {} as Record<string, number> }));

/** Player movement intent from input system. */
export const MovementIntent = trait({ dirX: 0, dirZ: 0, sprint: false, jump: false });

/** Camera look intent from input system. */
export const LookIntent = trait({ deltaX: 0, deltaY: 0 });
