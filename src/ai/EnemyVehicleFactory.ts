import { StateMachine, Vehicle } from 'yuka';
import type { EnemyConfig } from '../content/index';
import { AttackState } from './states/AttackState';
import { ChaseState } from './states/ChaseState';
import { DeadState } from './states/DeadState';
import { PatrolState } from './states/PatrolState';
import type { AIVehicle } from './types';

/**
 * Creates a Yuka Vehicle configured from EnemyConfig.
 * Sets mass, maxSpeed, attaches SteeringManager (built-in),
 * creates StateMachine with patrol/chase/attack/dead states.
 */
export function createEnemyVehicle(config: EnemyConfig, playerVehicle?: Vehicle): AIVehicle {
  const vehicle = new Vehicle() as AIVehicle;
  vehicle.mass = 1;
  vehicle.maxSpeed = config.speed;
  vehicle.maxForce = config.speed * 2;

  // Create FSM
  const fsm = new StateMachine(vehicle);

  const patrol = new PatrolState();
  const chase = new ChaseState();
  const attack = new AttackState();
  const dead = new DeadState();

  // Wire player target if available
  if (playerVehicle) {
    patrol.setPlayerTarget(playerVehicle);
    chase.setPlayerTarget(playerVehicle);
    attack.setPlayerTarget(playerVehicle);
  }

  fsm.add('patrol', patrol);
  fsm.add('chase', chase);
  fsm.add('attack', attack);
  fsm.add('dead', dead);
  fsm.changeTo('patrol');

  vehicle.stateMachine = fsm;

  return vehicle;
}
