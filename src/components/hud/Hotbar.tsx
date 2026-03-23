import { useEffect } from 'react';

export interface SlotData {
  label: string;
  /** Resource count to display (e.g., number of blocks available) */
  count?: number;
}

interface Props {
  slots: SlotData[];
  activeIndex: number;
  onSelect: (index: number) => void;
}

const SLOT_COUNT = 5;
const SLOT_KEYS = ['slot-1', 'slot-2', 'slot-3', 'slot-4', 'slot-5'] as const;

/**
 * Weapon/item hotbar — 5 slots with keyboard (1-5), mouse wheel cycling,
 * and tap-to-select on mobile. Shows resource counts when available.
 */
export function Hotbar({ slots, activeIndex, onSelect }: Props) {
  // Keyboard 1-5 and mouse wheel input
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const digit = Number.parseInt(e.key, 10);
      if (digit >= 1 && digit <= SLOT_COUNT) {
        onSelect(digit - 1);
      }
    };

    const onWheel = (e: WheelEvent) => {
      const direction = e.deltaY > 0 ? 1 : -1;
      onSelect((activeIndex + direction + SLOT_COUNT) % SLOT_COUNT);
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('wheel', onWheel, { passive: true });
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('wheel', onWheel);
    };
  }, [activeIndex, onSelect]);

  return (
    <div
      className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1 pointer-events-auto"
      role="toolbar"
      aria-label="Weapon hotbar"
      style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
    >
      {Array.from({ length: SLOT_COUNT }, (_, i) => {
        const isActive = i === activeIndex;
        const slot = slots[i];
        const label = slot?.label || '';
        const count = slot?.count;
        const countStr = count != null && count > 0 ? ` x${count}` : '';

        return (
          <button
            key={SLOT_KEYS[i]}
            type="button"
            aria-label={`Slot ${i + 1}${label ? `: ${label}` : ': empty'}${countStr ? ` (${count})` : ''}${isActive ? ' (selected)' : ''}`}
            aria-pressed={isActive}
            className={`btn btn-sm sm:btn-md relative w-10 h-10 sm:w-14 sm:h-14 p-0 focus-visible:ring-2 focus-visible:ring-[#c4a572] focus-visible:outline-none ${
              isActive
                ? 'btn-primary border-2 border-[#c4a572] shadow-[0_0_8px_rgba(196,165,114,0.6)]'
                : 'btn-ghost border-2 border-secondary bg-base-100/60'
            }`}
            onPointerDown={(e) => {
              e.preventDefault();
              onSelect(i);
            }}
          >
            <span
              className="kbd kbd-xs absolute top-0.5 right-1 opacity-50 bg-transparent border-none p-0 text-[9px] sm:text-[10px]"
              aria-hidden="true"
            >
              {i + 1}
            </span>
            <span className="text-[9px] sm:text-xs mt-1 leading-tight text-center">
              {label}
              {countStr && <span className="block text-[8px] sm:text-[9px] opacity-70">{countStr}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}
