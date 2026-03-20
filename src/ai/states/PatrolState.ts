import { State, type Vehicle, WanderBehavior } from 'yuka';

/** Detection range to transition from patrol to chase. */
const DETECTION_RANGE = 15;

/**
 * Patrol state: wander randomly.
 * Transitions to 'chase' when player is within detection range.
 */
export class PatrolState extends State {
  readonly #wander = new WanderBehavior();
  #playerVehicle: Vehicle | null = null;

  /** Set the player vehicle reference for detection checks. */
  setPlayerTarget(player: Vehicle): void {
    this.#playerVehicle = player;
  }

  override enter(owner: Vehicle): void {
    owner.steering.clear();
    owner.steering.add(this.#wander);
  }

  override execute(owner: Vehicle): void {
    if (!this.#playerVehicle) return;

    const dx = this.#playerVehicle.position.x - owner.position.x;
    const dz = this.#playerVehicle.position.z - owner.position.z;
    const distSq = dx * dx + dz * dz;

    if (distSq <= DETECTION_RANGE * DETECTION_RANGE) {
      const fsm = (owner as unknown as { stateMachine: { changeTo: (id: string) => void } }).stateMachine;
      fsm.changeTo('chase');
    }
  }

  override exit(owner: Vehicle): void {
    owner.steering.remove(this.#wander);
  }
}
