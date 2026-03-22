import { AnimatePresence, motion } from 'framer-motion';
import type { GoalProgress } from '../../engine/goalSystem';

interface Props {
  goals: GoalProgress[];
  bossUnlocked: boolean;
  completionMessage: string;
}

/**
 * GoalTracker — HUD overlay showing biome objectives and progress.
 * Renders in the top-right area below the Menu button.
 * Goals fade out when completed. Boss unlock message appears when all done.
 */
export function GoalTracker({ goals, bossUnlocked, completionMessage }: Props) {
  if (goals.length === 0) return null;

  return (
    <div className="fixed top-16 right-4 z-10 w-56" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>
      <div className="bg-[#fdf6e3]/80 border-2 border-[#8b5a2b] rounded-lg p-3 space-y-2">
        <h3
          className="text-xs font-bold tracking-wider uppercase"
          style={{ fontFamily: 'Cinzel, Georgia, serif', color: '#8b5a2b' }}
        >
          Objectives
        </h3>

        <AnimatePresence>
          {goals.map((goal) => (
            <motion.div
              key={goal.definition.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: goal.completed ? 0.5 : 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className={`text-xs ${goal.completed ? 'line-through' : ''}`}
              style={{ color: '#2c1e16' }}
            >
              <div className="flex items-center gap-1">
                <span>{goal.definition.icon}</span>
                <span className="flex-1">{goal.definition.title}</span>
                <span
                  className="tabular-nums font-mono text-[10px]"
                  style={{ color: goal.completed ? '#4a9c60' : '#8b5a2b' }}
                >
                  {goal.current}/{goal.definition.target}
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {bossUnlocked && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xs italic mt-2 pt-2 border-t border-[#8b5a2b]/30"
            style={{ color: '#c44a4a' }}
          >
            {completionMessage}
          </motion.div>
        )}
      </div>
    </div>
  );
}
