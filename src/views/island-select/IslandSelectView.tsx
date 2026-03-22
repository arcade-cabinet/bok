import { motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { ContentRegistry } from '../../content/registry.ts';
import type { BiomeConfig } from '../../content/types.ts';

interface Props {
  onSelectBiome: (biomeId: string) => void;
  onCancel: () => void;
  maxChoices?: number;
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
 * IslandSelectView — full-screen overlay shown between the hub dock departure
 * and the sailing transition. The player chooses which island biome to visit.
 * Displays a grid of biome cards with difficulty, description, and terrain preview.
 */
export function IslandSelectView({ onSelectBiome, onCancel, maxChoices }: Props) {
  const [selectedBiome, setSelectedBiome] = useState<string | null>(null);

  const biomes = useMemo(() => {
    const registry = new ContentRegistry();
    const all = registry.getAllBiomes();
    if (maxChoices !== undefined && maxChoices < all.length) {
      // Shuffle deterministically based on current session and take maxChoices
      const shuffled = [...all].sort((a, b) => a.id.localeCompare(b.id));
      return shuffled.slice(0, maxChoices);
    }
    return all;
  }, [maxChoices]);

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

      {/* Biome grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 px-4 sm:px-8 pb-28 max-w-6xl w-full">
        {biomes.map((biome, idx) => {
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
