import type { World } from 'koota';
import { Position, Velocity } from '../../traits/index.ts';

export class MovementSystem {
  update(world: World, dt: number): void {
    world.query(Position, Velocity).updateEach(([pos, vel]) => {
      pos.x += vel.x * dt;
      pos.y += vel.y * dt;
      pos.z += vel.z * dt;
    });
  }
}
