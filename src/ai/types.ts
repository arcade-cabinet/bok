import type { Vehicle, StateMachine } from 'yuka';

/** Extended Vehicle with attached StateMachine. */
export interface AIVehicle extends Vehicle {
  stateMachine: StateMachine;
}
