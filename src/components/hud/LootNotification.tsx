import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

export interface LootItem {
  name: string;
  amount: number;
}

interface Props {
  items: LootItem[];
}

interface DisplayEntry {
  id: number;
  name: string;
  amount: number;
}

const AUTO_DISMISS_MS = 3000;

/**
 * LootNotification — floating toast-style notifications that slide in from the right
 * when the player picks up loot. Multiple notifications stack vertically.
 * Each auto-dismisses after 3 seconds. Uses Framer Motion for enter/exit animations.
 */
export function LootNotification({ items }: Props) {
  const [entries, setEntries] = useState<DisplayEntry[]>([]);
  const nextId = useRef(0);
  const prevLength = useRef(0);

  useEffect(() => {
    if (items.length <= prevLength.current) {
      prevLength.current = items.length;
      return;
    }

    const newItems = items.slice(prevLength.current);
    prevLength.current = items.length;

    const newEntries = newItems.map((item) => ({
      id: nextId.current++,
      name: item.name,
      amount: item.amount,
    }));

    setEntries((prev) => [...prev, ...newEntries]);

    const timers = newEntries.map((entry) =>
      setTimeout(() => {
        setEntries((prev) => prev.filter((e) => e.id !== entry.id));
      }, AUTO_DISMISS_MS),
    );

    return () => {
      for (const timer of timers) clearTimeout(timer);
    };
  }, [items]);

  return (
    <div className="fixed top-20 right-4 z-30 flex flex-col gap-2 pointer-events-none" data-testid="loot-notifications">
      <AnimatePresence>
        {entries.map((entry) => (
          <motion.div
            key={entry.id}
            initial={{ x: 120, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 120, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="bg-base-100/90 border-2 border-secondary/60 rounded-lg px-4 py-2 shadow-lg"
            data-testid="loot-item"
          >
            <span className="text-sm font-bold text-accent" style={{ fontFamily: 'Cinzel, Georgia, serif' }}>
              +{entry.amount}
            </span>{' '}
            <span className="text-sm text-base-content" style={{ fontFamily: 'Georgia, serif' }}>
              {entry.name}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
