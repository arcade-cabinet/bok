import { PursuitBehavior, State, type Vehicle } from 'yuka';

/** Range at which enemy transitions to attack. */
const ATTACK_RANGE = 2.5;
/** Range at which enemy gives up chase and returns to patrol. */
const LOSE_RANGE = 25;

/**
 * Chase state: pursue the player.
 * Transitions to 'attack' when in melee range.
 * Transitions back to 'patrol' if player escapes beyond lose range.
 */
export class ChaseState extends State {
  #pursuit: PursuitBehavior | null = null;
  #playerVehicle: Vehicle | null = null;

  /** Set the player vehicle reference for pursuit. */
  setPlayerTarget(player: Vehicle): void {
    this.#playerVehicle = player;
  }

  override enter(owner: Vehicle): void {
    owner.steering.clear();
    if (this.#playerVehicle) {
      this.#pursuit = new PursuitBehavior(this.#playerVehicle);
      owner.steering.add(this.#pursuit);
    }
  }

  override execute(owner: Vehicle): void {
    if (!this.#playerVehicle) return;

    const dx = this.#playerVehicle.position.x - owner.position.x;
    const dz = this.#playerVehicle.position.z - owner.position.z;
    const distSq = dx * dx + dz * dz;

    const fsm = (owner as unknown as { stateMachine: { changeTo: (id: string) => void } }).stateMachine;

    if (distSq <= ATTACK_RANGE * ATTACK_RANGE) {
      fsm.changeTo('attack');
    } else if (distSq > LOSE_RANGE * LOSE_RANGE) {
      fsm.changeTo('patrol');
    }
  }

  override exit(owner: Vehicle): void {
    if (this.#pursuit) {
      owner.steering.remove(this.#pursuit);
      this.#pursuit = null;
    }
  }
}
