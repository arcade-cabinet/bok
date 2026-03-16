import type { World } from "koota";
import { EnemyState, EnemyTag, Position, WorldTime } from "../traits/index.ts";

export function enemySystem(world: World, dt: number) {
	let timeOfDay = 0.25;
	world.query(WorldTime).readEach(([time]) => {
		timeOfDay = time.timeOfDay;
	});

	const isDaytime = timeOfDay > 0.25 && timeOfDay < 0.75;

	world.query(EnemyTag, EnemyState, Position).updateEach(([enemy, pos], entity) => {
		if (isDaytime) {
			enemy.hp -= dt * 2;
		}

		enemy.velY -= 28 * dt;
		pos.y += enemy.velY * dt;

		if (pos.y < 0) {
			pos.y = 0;
			enemy.velY = 0;
		}

		if (enemy.hp <= 0) {
			entity.destroy();
		}
	});
}
