import { State, type Vehicle, ArriveBehavior, Vector3 } from 'yuka';

/** Range beyond which enemy stops attacking and chases again. */
const CHASE_RANGE = 4;
/** Cooldown between attacks in seconds. */
const ATTACK_COOLDOWN = 1.0;

/**
 * Attack state: close distance and attack on cooldown.
 * Uses ArriveBehavior to close distance to player.
 * Transitions back to 'chase' if target moves out of attack range.
 */
export class AttackState extends State {
  #arrive: ArriveBehavior | null = null;
  #playerVehicle: Vehicle | null = null;
  #cooldownRemaining = 0;
  readonly #target = new Vector3();

  /** Set the player vehicle reference for targeting. */
  setPlayerTarget(player: Vehicle): void {
    this.#playerVehicle = player;
  }

  /** Callback invoked when an attack fires. Override for integration. */
  onAttack: ((owner: Vehicle) => void) | null = null;

  override enter(owner: Vehicle): void {
    owner.steering.clear();
    this.#arrive = new ArriveBehavior(this.#target, 3, 0.5);
    owner.steering.add(this.#arrive);
    this.#cooldownRemaining = 0;
  }

  override execute(owner: Vehicle): void {
    if (!this.#playerVehicle) return;

    // Update arrive target to player position
    this.#target.copy(this.#playerVehicle.position);

    const dx = this.#playerVehicle.position.x - owner.position.x;
    const dz = this.#playerVehicle.position.z - owner.position.z;
    const distSq = dx * dx + dz * dz;

    const fsm = (owner as unknown as { stateMachine: { changeTo: (id: string) => void } }).stateMachine;

    if (distSq > CHASE_RANGE * CHASE_RANGE) {
      fsm.changeTo('chase');
      return;
    }

    // Attack on cooldown — read dt from custom property set by AIBridge
    const dt = (owner as unknown as { _dt?: number })._dt ?? 1 / 60;
    this.#cooldownRemaining -= dt;
    if (this.#cooldownRemaining <= 0) {
      this.#cooldownRemaining = ATTACK_COOLDOWN;
      this.onAttack?.(owner);
    }
  }

  override exit(owner: Vehicle): void {
    if (this.#arrive) {
      owner.steering.remove(this.#arrive);
      this.#arrive = null;
    }
  }
}
