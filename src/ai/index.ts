/**
 * @module ai
 * @role Yuka AI integration and Koota bridge
 * @input Koota entities with AI traits, EnemyConfig from content
 * @output AI-driven Velocity, AIState, Intent updates on Koota entities
 * @depends traits, content, yuka
 * @tested bridge.test.ts
 */
export { AIBridge } from './bridge';
export { createEnemyVehicle } from './EnemyVehicleFactory';
export type { GovernorOutput, PlayerGovernor, ThreatLevel } from './PlayerGovernor';
export { createPlayerGovernor } from './PlayerGovernor';
export { AttackState, ChaseState, DeadState, PatrolState } from './states/index';
export type { AIVehicle } from './types';
