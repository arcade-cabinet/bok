/**
 * @module progression
 * @role Run lifecycle and permanent progression tracking
 * @input Run events (start, visit, boss defeat, end), unlock requests
 * @output Persisted run records, unlock state, tome page state
 * @depends traits, persistence
 * @tested RunManager.test.ts
 */
export { RunManager, type RunState } from './RunManager.ts';
export { TomeProgression } from './TomeProgression.ts';
export { UnlockTracker } from './UnlockTracker.ts';
