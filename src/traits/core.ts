import { trait } from 'koota';

/** 3D world position. */
export const Position = trait({ x: 0, y: 0, z: 0 });

/** Linear velocity vector. */
export const Velocity = trait({ x: 0, y: 0, z: 0 });

/** Angular velocity for rotation. */
export const AngularVelocity = trait({ x: 0, y: 0, z: 0 });

/** Rotation as euler angles (radians). */
export const Rotation = trait({ x: 0, y: 0, z: 0 });

/** Scale factor. */
export const Scale = trait({ x: 1, y: 1, z: 1 });

/** Shorthand transform grouping (for render sync). */
export const Transform = trait({ posX: 0, posY: 0, posZ: 0, rotY: 0 });

/** Health with current and max values. */
export const Health = trait({ current: 100, max: 100 });

/** Stamina for dodge/sprint. */
export const Stamina = trait({ current: 100, max: 100, regenRate: 20 });
