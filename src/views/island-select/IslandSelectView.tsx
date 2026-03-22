import { motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { ContentRegistry } from '../../content/registry.ts';
import type { BiomeConfig } from '../../content/types.ts';

/** Set to true during development to unlock all biomes without progression. */
const DEV_UNLOCK_ALL = import.meta.env.DEV && (import.meta.env.VITE_UNLOCK_ALL_BIOMES === 'true');

/** The starter biome — always available. */
const STARTER_BIOME = 'forest';

/** Biome unlock order — which boss/biome unlocks the next one. */
const BIOME_UNLOCK_ORDER: Record<string, string> = {
  forest: 'desert',      // Defeating Ancient Treant unlocks Desert
  desert: 'tundra',      // Defeating Pharaoh Construct unlocks Tundra
  tundra: 'volcanic',    // Defeating Frost Wyrm unlocks Volcanic
  volcanic: 'swamp',     // Defeating Magma King unlocks Swamp
  swamp: 'crystal-caves', // Defeating Mire Hag unlocks Crystal Caves
  'crystal-caves': 'sky-ruins', // Defeating Crystal Hydra unlocks Sky Ruins
  'sky-ruins': 'deep-ocean',   // Defeating Storm Titan unlocks Deep Ocean
};

interface Props {
  onSelectBiome: (biomeId: string) => void;
  onCancel: () => void;
  maxChoices?: number;
  /** Biome IDs the player has unlocked via boss kills. Forest is always unlocked. */
  unlockedBiomes?: string[];
}

/** Difficulty tier derived from the biome's enemy difficulty requirements and terrain complexity. */
function getBiomeDifficulty(biome: BiomeConfig): number {
  const maxMinDifficulty = Math.max(...biome.enemies.map((e) => e.minDifficulty));
  const terrainComplexity = biome.terrain.noiseAmplitude / 10;
  return Math.min(5, Math.max(1, Math.round(maxMinDifficulty + terrainComplexity)));
}

/** Map biome fog/sky colors to a representative terrain preview color. */
const BIOME_PREVIEW_COLORS: Record<string, string> = {
  forest: '#2d5a27',
  desert: '#C2A355',
  tundra: '#8BA5C7',
  volcanic: '#8B2500',
  swamp: '#3B4A1C',
  'crystal-caves': '#4B0082',
  'sky-ruins': '#B0D4F1',
  'deep-ocean': '#0D2137',
};

/** Difficulty tier labels. */
const DIFFICULTY_LABELS: Record<number, string> = {
  1: 'Easy',
  2: 'Medium',
  3: 'Hard',
  4: 'Very Hard',
  5: 'Extreme',
};

/** Difficulty badge color classes. */
const DIFFICULTY_COLORS: Record<number, string> = {
  1: 'badge-success',
  2: 'badge-info',
  3: 'badge-warning',
  4: 'badge-error',
  5: 'badge-error',
};

/**
 * Compute which biomes the player has access to based on progression.
 * Forest is always unlocked. Each defeated boss unlocks the next biome in sequence.
 */
export function getUnlockedBiomeIds(defeatedBiomes: string[]): string[] {
  const unlocked = new Set<string>([STARTER_BIOME]);

  for (const biomeId of defeatedBiomes) {
    unlocked.add(biomeId);
    const nextBiome = BIOME_UNLOCK_ORDER[biomeId];
    if (nextBiome) unlocked.add(nextBiome);
  }

  return [...unlocked];
}

/**
 * IslandSelectView — full-screen overlay shown between the hub dock departure
 * and the sailing transition. The player chooses which island biome to visit.
 *
 * Biomes are locked by default. Forest is always available.
 * Defeating a boss in a biome unlocks the next one in the progression chain.
 *
 * Set `VITE_UNLOCK_ALL_BIOMES=true` in `.env` to unlock everything for dev testing.
 */
export function IslandSelectView({ onSelectBiome, onCancel, maxChoices, unlockedBiomes = [] }: Props) {
  const [selectedBiome, setSelectedBiome] = useState<string | null>(null);

  const { available, locked } = useMemo(() => {
    const registry = new ContentRegistry();
    const all = registry.getAllBiomes();

    if (DEV_UNLOCK_ALL) {
      // Dev mode: everything unlocked
      const limited = maxChoices !== undefined && maxChoices < all.length
        ? [...all].sort((a, b) => a.id.localeCompare(b.id)).slice(0, maxChoices)
        : all;
      return { available: limited, locked: [] as BiomeConfig[] };
    }

    // Compute unlocked set from progression
    const unlockedSet = new Set(getUnlockedBiomeIds(unlockedBiomes));

    const availableBiomes = all.filter((b) => unlockedSet.has(b.id));
    const lockedBiomes = all.filter((b) => !unlockedSet.has(b.id));

    // Apply maxChoices limit to available biomes only
    const limited = maxChoices !== undefined && maxChoices < availableBiomes.length
      ? [...availableBiomes].sort((a, b) => a.id.localeCompare(b.id)).slice(0, maxChoices)
      : availableBiomes;

    return { available: limited, locked: lockedBiomes };
  }, [maxChoices, unlockedBiomes]);

  const handleSetSail = () => {
    if (selectedBiome) onSelectBiome(selectedBiome);
  };

  return (
    <div
      className="fixed inset-0 z-[1000] flex flex-col items-center overflow-y-auto"
      style={{
        background: 'linear-gradient(180deg, #0a1929 0%, #1a6fa0 40%, #0d3b66 100%)',
      }}
    >
      {/* Header */}
      <motion.div
        className="text-center pt-8 sm:pt-12 pb-4 sm:pb-6"
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <h1
          className="text-3xl sm:text-4xl tracking-wider mb-2"
          style={{
            fontFamily: 'Cinzel, Georgia, serif',
            color: '#fdf6e3',
            textShadow: '0 2px 8px rgba(0,0,0,0.5)',
          }}
        >
          Choose Your Destination
        </h1>
        <p
          className="text-sm sm:text-base italic"
          style={{
            fontFamily: 'Crimson Text, Georgia, serif',
            color: '#c4a572',
            textShadow: '0 1px 4px rgba(0,0,0,0.5)',
          }}
        >
          The winds await your command, Captain.
        </p>
      </motion.div>

      {/* Biome grid — unlocked */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 px-4 sm:px-8 max-w-6xl w-full">
        {available.map((biome, idx) => {
          const difficulty = getBiomeDifficulty(biome);
          const isSelected = selectedBiome === biome.id;
          const previewColor = BIOME_PREVIEW_COLORS[biome.id] ?? biome.fogColor;

          return (
            <motion.button
              key={biome.id}
              type="button"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: idx * 0.06, duration: 0.4 }}
              className={`card bg-base-100/90 border-2 text-left cursor-pointer transition-all duration-200 hover:shadow-xl hover:scale-[1.02] ${
                isSelected ? 'border-[#c4a572] shadow-[0_0_16px_rgba(196,165,114,0.4)]' : 'border-secondary/50'
              }`}
              onClick={() => setSelectedBiome(biome.id)}
              data-testid={`biome-card-${biome.id}`}
            >
              {/* Terrain preview strip */}
              <div
                className="h-16 rounded-t-lg"
                style={{
                  background: `linear-gradient(135deg, ${previewColor} 0%, ${biome.skyColor} 100%)`,
                }}
              />

              <div className="card-body p-4 gap-2">
                <div className="flex items-start justify-between gap-2">
                  <h3
                    className="card-title text-base text-base-content"
                    style={{ fontFamily: 'Cinzel, Georgia, serif' }}
                  >
                    {biome.name}
                  </h3>
                  <span className={`badge badge-sm ${DIFFICULTY_COLORS[difficulty] ?? 'badge-info'}`}>
                    {DIFFICULTY_LABELS[difficulty] ?? `Tier ${difficulty}`}
                  </span>
                </div>

                <p
                  className="text-xs leading-relaxed text-base-content/70"
                  style={{ fontFamily: 'Crimson Text, Georgia, serif' }}
                >
                  {biome.description}
                </p>
              </div>
            </motion.button>
          );
        })}

        {/* Locked biomes — greyed out */}
        {locked.map((biome, idx) => (
          <motion.div
            key={biome.id}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 0.4 }}
            transition={{ delay: (available.length + idx) * 0.06, duration: 0.4 }}
            className="card bg-base-100/30 border-2 border-secondary/20 text-left"
            data-testid={`biome-card-${biome.id}-locked`}
          >
            <div
              className="h-16 rounded-t-lg"
              style={{
                background: '#333',
                filter: 'grayscale(1)',
              }}
            />
            <div className="card-body p-4 gap-2">
              <div className="flex items-start justify-between gap-2">
                <h3
                  className="card-title text-base text-base-content/40"
                  style={{ fontFamily: 'Cinzel, Georgia, serif' }}
                >
                  ???
                </h3>
                <span className="badge badge-sm badge-ghost">Locked</span>
              </div>
              <p
                className="text-xs leading-relaxed text-base-content/30 italic"
                style={{ fontFamily: 'Crimson Text, Georgia, serif' }}
              >
                Defeat the previous island's boss to unlock
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Bottom action bar */}
      <div
        className="fixed bottom-0 left-0 right-0 z-[1001] flex items-center justify-center gap-4 py-4 px-4"
        style={{
          background: 'linear-gradient(0deg, rgba(10,25,41,0.95) 0%, rgba(10,25,41,0) 100%)',
        }}
      >
        <button
          type="button"
          className="btn btn-ghost border border-secondary/50"
          style={{ fontFamily: 'Cinzel, Georgia, serif', color: '#fdf6e3' }}
          onClick={onCancel}
        >
          Back to Hub
        </button>

        <button
          type="button"
          className={`btn px-8 ${selectedBiome ? 'btn-primary shadow-lg' : 'btn-disabled'}`}
          style={{ fontFamily: 'Cinzel, Georgia, serif' }}
          onClick={handleSetSail}
          tabIndex={selectedBiome ? 0 : -1}
          data-testid="set-sail-btn"
        >
          Set Sail
        </button>
      </div>
    </div>
  );
}
