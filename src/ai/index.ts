/**
 * @module ai
 * @role Yuka AI integration and Koota bridge
 * @input Koota entities with AI traits, EnemyConfig from content
 * @output AI-driven Velocity, AIState, Intent updates on Koota entities
 * @depends traits, content, yuka
 * @tested bridge.test.ts
 */
export { AIBridge } from './bridge';
export { createEnemyVehicle, type AIVehicle } from './EnemyVehicleFactory';
export { PatrolState, ChaseState, AttackState, DeadState } from './states/index';
