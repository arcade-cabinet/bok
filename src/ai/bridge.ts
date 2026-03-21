import type { Entity } from 'koota';
import type { Vehicle } from 'yuka';
import { AIState, Health, Position, Velocity } from '../traits/index';
import type { AIVehicle } from './types';

/**
 * Bidirectional sync between Yuka AI vehicles and Koota ECS entities.
 */
export class AIBridge {
  /**
   * Store frame dt on the Yuka vehicle so FSM states can read it.
   */
  setDt(vehicle: Vehicle, dt: number): void {
    (vehicle as unknown as { _dt: number })._dt = dt;
  }

  syncToKoota(vehicle: Vehicle, entity: Entity): void {
    // Write velocity from Yuka vehicle to Koota
    entity.set(Velocity, {
      x: vehicle.velocity.x,
      y: vehicle.velocity.y,
      z: vehicle.velocity.z,
    });

    // Write AI state from FSM
    const fsm = (vehicle as AIVehicle).stateMachine;
    let stateName = 'idle';
    if (fsm?.currentState) {
      // Find the state name by looking up the current state in the FSM's states map
      for (const [id, state] of fsm.states) {
        if (state === fsm.currentState) {
          stateName = id;
          break;
        }
      }
    }

    entity.set(AIState, { state: stateName });
  }

  /**
   * Sync Koota → Yuka: read corrected positions and health into vehicle.
   * - Position trait (after Rapier correction) → vehicle.position
   * - Health ≤ 0 → trigger FSM transition to 'dead'
   */
  syncFromKoota(vehicle: Vehicle, entity: Entity): void {
    // Read corrected position from Koota into Yuka
    const pos = entity.get(Position);
    if (pos) {
      vehicle.position.set(pos.x, pos.y, pos.z);
    }

    // Check health for death trigger
    const health = entity.get(Health);
    if (health && health.current <= 0) {
      const fsm = (vehicle as AIVehicle).stateMachine;
      if (fsm && !fsm.in('dead')) {
        fsm.changeTo('dead');
      }
    }
  }
}
