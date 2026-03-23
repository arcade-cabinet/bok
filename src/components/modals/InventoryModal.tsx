import { useCallback, useEffect, useMemo, useState } from 'react';

interface Props {
  inventory: Record<string, number>;
  onClose: () => void;
  /** Currently equipped weapon ID (highlighted in weapons tab) */
  equippedWeaponId?: string;
  /** Callback when player equips a weapon */
  onEquipWeapon?: (weaponId: string) => void;
}

type ItemCategory = 'materials' | 'weapons' | 'consumables';

const TAB_ORDER: ItemCategory[] = ['materials', 'weapons', 'consumables'];
const TAB_LABELS: Record<ItemCategory, string> = {
  materials: 'Materials',
  weapons: 'Weapons',
  consumables: 'Consumables',
};

/** Known weapon item IDs. */
const WEAPON_IDS = new Set([
  'wooden-sword',
  'iron-sword',
  'crystal-blade',
  'volcanic-edge',
  'frost-cleaver',
  'war-hammer',
  'battle-axe',
  'twin-daggers',
  'trident',
  'short-bow',
  'crossbow',
  'fire-staff',
  'ice-wand',
  'lightning-rod',
  'crystal-sling',
]);

/** Known consumable item IDs. */
const CONSUMABLE_IDS = new Set(['health-potion', 'stamina-elixir', 'torch']);

/** Item display icons (emoji stand-ins). */
const ITEM_ICONS: Record<string, string> = {
  wood: '🪵',
  stone: '🪨',
  coal: '⬛',
  herbs: '🌿',
  iron: '⛓️',
  'iron-ore': '⛏️',
  emerald: '💚',
  ruby: '❤️',
  mushroom: '🍄',
  honey: '🍯',
  'magma-crystal': '🔥',
  'frost-shard': '❄️',
  'void-essence': '🌑',
  'ancient-bone': '🦴',
  'dragon-scale': '🐉',
  'star-fragment': '⭐',
  'tome-ink': '🖋️',
  'phoenix-feather': '🪶',
  'wooden-planks': '🪵',
  'stone-bricks': '🧱',
  water: '💧',
  'wooden-sword': '🗡️',
  'iron-sword': '⚔️',
  'fire-staff': '🔮',
  'health-potion': '🧪',
  'stamina-elixir': '⚗️',
  torch: '🔦',
};

/** Format an item ID into a display name (kebab-case to Title Case). */
function formatItemName(itemId: string): string {
  return itemId
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/** Categorize an item ID. */
function categorize(itemId: string): ItemCategory {
  if (WEAPON_IDS.has(itemId)) return 'weapons';
  if (CONSUMABLE_IDS.has(itemId)) return 'consumables';
  return 'materials';
}

/**
 * InventoryModal — modal overlay displaying the player's collected items.
 * Items are organized into tabs: Materials, Weapons, Consumables.
 * Each item shows an emoji icon and count in a responsive grid.
 * Uses daisyUI modal, card, tabs, and badge components with the parchment theme.
 */
export function InventoryModal({ inventory, onClose, equippedWeaponId, onEquipWeapon }: Props) {
  const [activeTab, setActiveTab] = useState<ItemCategory>('materials');

  const categorized = useMemo(() => {
    const result: Record<ItemCategory, Array<{ id: string; amount: number }>> = {
      materials: [],
      weapons: [],
      consumables: [],
    };
    for (const [itemId, amount] of Object.entries(inventory)) {
      if (amount <= 0) continue;
      result[categorize(itemId)].push({ id: itemId, amount });
    }
    return result;
  }, [inventory]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const currentItems = categorized[activeTab];

  return (
    <div className="modal modal-open overlay-safe-area">
      <button type="button" className="modal-backdrop bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="modal-box card bg-base-100 border-2 border-secondary max-w-xl w-[80%] max-h-[80vh] overflow-y-auto">
        <h2
          className="text-2xl sm:text-3xl text-center mb-4 pb-3 border-b-2 border-secondary text-base-content"
          style={{ fontFamily: 'Cinzel, Georgia, serif' }}
        >
          Inventory
        </h2>

        {/* Tabs */}
        <div className="tabs tabs-box mb-4" role="tablist">
          {TAB_ORDER.map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              className={`tab ${activeTab === tab ? 'tab-active' : ''}`}
              onClick={() => setActiveTab(tab)}
              data-testid={`tab-${tab}`}
            >
              {TAB_LABELS[tab]}
              {categorized[tab].length > 0 && (
                <span className="badge badge-xs badge-secondary ml-1">{categorized[tab].length}</span>
              )}
            </button>
          ))}
        </div>

        {/* Item grid */}
        {currentItems.length === 0 ? (
          <p
            className="text-center text-base-content/60 italic py-8"
            style={{ fontFamily: 'Crimson Text, Georgia, serif' }}
          >
            No {TAB_LABELS[activeTab].toLowerCase()} collected yet.
          </p>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-2">
            {currentItems.map((item) => {
              const isWeapon = activeTab === 'weapons';
              const isEquipped = isWeapon && equippedWeaponId === item.id;
              return (
                <div
                  key={item.id}
                  className={`card bg-base-200/60 border p-3 text-center ${isEquipped ? 'border-accent ring-1 ring-accent/40' : 'border-secondary/30'}`}
                  data-testid={`item-${item.id}`}
                >
                  <div className="text-2xl mb-1">{ITEM_ICONS[item.id] ?? '📦'}</div>
                  <div
                    className="text-xs font-bold text-base-content mb-0.5 truncate"
                    style={{ fontFamily: 'Cinzel, Georgia, serif' }}
                  >
                    {formatItemName(item.id)}
                  </div>
                  <div className="badge badge-sm badge-outline badge-secondary">x{item.amount}</div>
                  {isWeapon && onEquipWeapon && (
                    <button
                      type="button"
                      className={`btn btn-xs mt-1 ${isEquipped ? 'btn-accent btn-disabled' : 'btn-primary'}`}
                      onClick={() => !isEquipped && onEquipWeapon(item.id)}
                      data-testid={`equip-${item.id}`}
                    >
                      {isEquipped ? 'Equipped' : 'Equip'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-4 text-center">
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
