import type { StateMachine, Vehicle } from 'yuka';

/** Extended Vehicle with attached StateMachine. */
export interface AIVehicle extends Vehicle {
  stateMachine: StateMachine;
}
