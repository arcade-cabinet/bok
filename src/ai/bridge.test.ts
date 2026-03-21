import { createWorld, type World } from 'koota';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { State, StateMachine, Vehicle } from 'yuka';
import { AIState, Health, Position, Velocity, YukaRef } from '../traits/index';
import { AIBridge } from './bridge';

/** Minimal FSM state for testing. */
class IdleState extends State {
  override enter() {
    /* noop */
  }
  override execute() {
    /* noop */
  }
  override exit() {
    /* noop */
  }
}

class ChaseState extends State {
  override enter() {
    /* noop */
  }
  override execute() {
    /* noop */
  }
  override exit() {
    /* noop */
  }
}

function createVehicleWithFSM(stateName: string): Vehicle {
  const vehicle = new Vehicle();
  const fsm = new StateMachine(vehicle);
  fsm.add('idle', new IdleState());
  fsm.add('chase', new ChaseState());
  fsm.changeTo(stateName);
  (vehicle as unknown as { stateMachine: StateMachine }).stateMachine = fsm;
  return vehicle;
}

describe('AIBridge', () => {
  let world: World;
  let bridge: AIBridge;

  beforeEach(() => {
    world = createWorld();
    bridge = new AIBridge();
  });

  describe('syncToKoota', () => {
    it('writes vehicle velocity to Koota Velocity trait', () => {
      const vehicle = createVehicleWithFSM('idle');
      vehicle.velocity.set(3, 0, -2);

      const entity = world.spawn(Position(), Velocity(), Health(), AIState(), YukaRef({ vehicle }));

      bridge.syncToKoota(vehicle, entity);

      const vel = entity.get(Velocity)!;
      expect(vel.x).toBe(3);
      expect(vel.y).toBe(0);
      expect(vel.z).toBe(-2);
    });

    it('writes FSM current state name to AIState trait', () => {
      const vehicle = createVehicleWithFSM('chase');

      const entity = world.spawn(Position(), Velocity(), Health(), AIState(), YukaRef({ vehicle }));

      bridge.syncToKoota(vehicle, entity);

      const aiState = entity.get(AIState)!;
      expect(aiState.state).toBe('chase');
    });

    it('writes "idle" when FSM has no current state', () => {
      const vehicle = new Vehicle();
      const fsm = new StateMachine(vehicle);
      (vehicle as unknown as { stateMachine: StateMachine }).stateMachine = fsm;

      const entity = world.spawn(Position(), Velocity(), Health(), AIState(), YukaRef({ vehicle }));

      bridge.syncToKoota(vehicle, entity);

      const aiState = entity.get(AIState)!;
      expect(aiState.state).toBe('idle');
    });
  });

  describe('syncFromKoota', () => {
    it('reads Position from Koota to vehicle position', () => {
      const vehicle = createVehicleWithFSM('idle');
      vehicle.position.set(0, 0, 0);

      const entity = world.spawn(
        Position({ x: 10, y: 5, z: -3 }),
        Velocity(),
        Health({ current: 100, max: 100 }),
        AIState(),
        YukaRef({ vehicle }),
      );

      bridge.syncFromKoota(vehicle, entity);

      expect(vehicle.position.x).toBe(10);
      expect(vehicle.position.y).toBe(5);
      expect(vehicle.position.z).toBe(-3);
    });

    it('triggers death state transition when health is zero', () => {
      const vehicle = createVehicleWithFSM('idle');
      const fsm = (vehicle as unknown as { stateMachine: StateMachine }).stateMachine;
      const deadState = new IdleState(); // stand-in for DeadState
      fsm.add('dead', deadState);

      const entity = world.spawn(
        Position(),
        Velocity(),
        Health({ current: 0, max: 100 }),
        AIState(),
        YukaRef({ vehicle }),
      );

      bridge.syncFromKoota(vehicle, entity);

      expect(fsm.currentState).toBe(deadState);
    });

    it('does not trigger death when health is above zero', () => {
      const vehicle = createVehicleWithFSM('chase');
      const fsm = (vehicle as unknown as { stateMachine: StateMachine }).stateMachine;
      fsm.add('dead', new IdleState());

      const entity = world.spawn(
        Position(),
        Velocity(),
        Health({ current: 50, max: 100 }),
        AIState(),
        YukaRef({ vehicle }),
      );

      bridge.syncFromKoota(vehicle, entity);

      // Should still be in 'chase', not 'dead'
      expect(fsm.in('chase')).toBe(true);
    });
  });

  afterEach(() => {
    world.destroy();
  });
});
