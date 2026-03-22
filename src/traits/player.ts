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

/**
 * Player movement intent from input system.
 *
 * Registered as a WORLD-LEVEL singleton (not per-entity) because this is a
 * single-player game. InputSystem writes it once per frame; the active scene
 * reads it for the one player entity. This avoids a per-frame player-entity
 * query just to pipe input and keeps the data flow straightforward.
 */
export const MovementIntent = trait({ dirX: 0, dirZ: 0, sprint: false, jump: false });

/**
 * Camera look intent from input system.
 *
 * World-level singleton for the same single-player reason as MovementIntent.
 * Written by InputSystem (mouse delta + gamepad right stick + touch), read by
 * the active scene to rotate the first-person camera.
 */
export const LookIntent = trait({ deltaX: 0, deltaY: 0 });
