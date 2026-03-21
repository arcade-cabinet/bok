import type { World } from 'koota';
import type { BossConfig, ContentRegistry } from '../../content/index';
import { BossType, Health } from '../../traits/index';

/**
 * Monitors boss health and advances phase when thresholds are crossed.
 * Phase thresholds come from boss config (e.g., 1.0/0.66/0.33).
 */
export function bossPhaseSystem(world: World, content: ContentRegistry): void {
  const entities = world.query(BossType, Health);

  for (const entity of entities) {
    const boss = entity.get(BossType)!;
    const health = entity.get(Health)!;

    let bossConfig: BossConfig;
    try {
      bossConfig = content.getBoss(boss.configId);
    } catch {
      continue;
    }

    const healthPct = health.current / health.max;
    const phases = bossConfig.phases;

    // Find which phase we should be in based on health percentage
    // Phases are ordered by descending healthThreshold (1.0, 0.66, 0.33)
    let targetPhase = 1;
    for (let i = 0; i < phases.length; i++) {
      if (healthPct <= phases[i].healthThreshold) {
        targetPhase = i + 1;
      }
    }

    if (targetPhase > boss.phase) {
      entity.set(BossType, {
        configId: boss.configId,
        phase: targetPhase,
      });
    }
  }
}
