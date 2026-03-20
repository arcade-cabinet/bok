import type { Entity } from 'koota';
import type { Vehicle, StateMachine } from 'yuka';
import { Position, Velocity, Health, AIState } from '../traits/index';

/** Extended Vehicle with our attached StateMachine. */
interface AIVehicle extends Vehicle {
  stateMachine: StateMachine;
}

/**
 * Bidirectional sync between Yuka AI vehicles and Koota ECS entities.
 */
export class AIBridge {
  /**
   * Sync Yuka → Koota: write AI decisions into ECS traits.
   * - Vehicle velocity → Velocity trait
   * - FSM current state name → AIState trait
   */
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
