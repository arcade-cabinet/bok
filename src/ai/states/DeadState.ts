import { State, type Vehicle } from 'yuka';

/**
 * Dead state: marks entity for cleanup.
 * No transitions out — entity should be removed.
 */
export class DeadState extends State {
  /** Set to true when enter() is called. Systems can check this flag. */
  markedForCleanup = false;

  override enter(owner: Vehicle): void {
    owner.steering.clear();
    owner.active = false;
    this.markedForCleanup = true;
  }

  override execute(): void {
    // No-op: dead entities do nothing.
  }

  override exit(): void {
    // No-op: dead state has no exit behavior.
  }
}
