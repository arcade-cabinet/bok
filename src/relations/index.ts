/**
 * @module relations
 * @role Koota relation definitions for entity-to-entity connections
 * @input None (definitions only)
 * @output Relation constructors
 * @depends koota
 * @tested relations.test.ts
 */
import { relation } from 'koota';

/** Parent-child hierarchy. Removing target cleans up orphans. */
export const ChildOf = relation({ autoRemoveTarget: true });

/** Inventory containment. Entity holds items. */
export const Contains = relation({ store: { amount: 1 } });

/** Projectile fired by entity. Removing target cleans up projectile. */
export const FiredBy = relation({ autoRemoveTarget: true });

/** AI targeting relation. Exclusive: can only target one entity. */
export const Targeting = relation({ exclusive: true });

/** Equipped weapon/armor relation. */
export const EquippedBy = relation({ exclusive: true });
