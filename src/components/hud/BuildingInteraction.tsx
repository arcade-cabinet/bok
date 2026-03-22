/**
 * @module components/hud/BuildingInteraction
 * @role HUD overlay showing building info and upgrade button when player is near a hub building
 * @input NearbyBuilding data from useHubBuildings hook, player resources
 * @output Interactive card with building name, level, effect, and upgrade controls
 */
import type { NearbyBuilding } from '../../hooks/useHubBuildings';

interface Props {
  nearby: NearbyBuilding;
  resources: Record<string, number>;
  onUpgrade: (buildingId: string) => void;
}

/**
 * BuildingInteraction — floating HUD card shown when the player approaches a hub building.
 * Displays building name, current level/effect, next upgrade cost, and an upgrade button.
 * Uses daisyUI card, btn, and badge components with the parchment theme.
 */
export function BuildingInteraction({ nearby, resources, onUpgrade }: Props) {
  const { building, currentLevel, currentEffect, nextLevel, isMaxLevel, canAfford } = nearby;

  return (
    <section
      className="fixed bottom-32 left-1/2 -translate-x-1/2 z-20 pointer-events-auto"
      aria-label={`${building.name} building interaction`}
    >
      <div className="card bg-base-100/95 border-2 border-secondary shadow-xl w-72 sm:w-80">
        <div className="card-body p-4 gap-2">
          {/* Header: name + level badge */}
          <div className="flex items-center justify-between">
            <h3 className="card-title text-lg text-base-content" style={{ fontFamily: 'Cinzel, Georgia, serif' }}>
              {building.name}
            </h3>
            <span className="badge badge-secondary badge-lg">
              Lv {currentLevel}/{building.maxLevel}
            </span>
          </div>

          {/* Description */}
          <p className="text-sm text-base-content/70" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>
            {building.description}
          </p>

          {/* Current effect */}
          <div className="text-sm text-base-content/90">
            <span className="font-semibold">Current:</span> {currentEffect}
          </div>

          {/* Next level info or max level indicator */}
          {isMaxLevel ? (
            <div className="badge badge-accent badge-outline w-full py-3">MAX LEVEL</div>
          ) : nextLevel ? (
            <>
              {/* Next effect */}
              <div className="text-sm text-accent">
                <span className="font-semibold">Next:</span> {nextLevel.effect}
              </div>

              {/* Resource costs */}
              <div className="flex gap-2 flex-wrap">
                {Object.entries(nextLevel.cost).map(([resource, amount]) => {
                  const have = resources[resource] ?? 0;
                  const enough = have >= amount;
                  return (
                    <span
                      key={resource}
                      className={`badge badge-outline gap-1 ${enough ? 'badge-success' : 'badge-error'}`}
                    >
                      {resource}: {have}/{amount}
                    </span>
                  );
                })}
              </div>

              {/* Upgrade button */}
              <div className="card-actions mt-1">
                <button
                  type="button"
                  className={`btn w-full focus-visible:ring-2 focus-visible:ring-[#c4a572] focus-visible:outline-none ${canAfford ? 'btn-primary' : 'btn-disabled'}`}
                  onClick={() => canAfford && onUpgrade(building.id)}
                  disabled={!canAfford}
                  aria-label={
                    canAfford
                      ? `Upgrade ${building.name} to level ${(currentLevel ?? 0) + 1}`
                      : `Cannot upgrade ${building.name}: not enough resources`
                  }
                >
                  {canAfford ? 'Upgrade' : 'Not Enough Resources'}
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}
