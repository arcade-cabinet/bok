import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { BuildingInteraction } from '../../components/hud/BuildingInteraction';
import { NPCDialogue } from '../../components/hud/NPCDialogue';
import { TouchControls } from '../../components/ui/TouchControls';
import { ContentRegistry } from '../../content/index';
import type { CameraResult } from '../../engine/camera';
import { type BuildingEffects, computeBuildingEffects } from '../../hooks/useBuildingEffects';
import { useHubBuildings } from '../../hooks/useHubBuildings';
import { useHubCamera } from '../../hooks/useHubCamera';
import { useHubEngine } from '../../hooks/useHubEngine';
import { useNPCProximity } from '../../hooks/useNPCProximity';
import { usePlayerInventory } from '../../hooks/usePlayerInventory';

interface Props {
  onNavigate: (view: 'menu' | 'game') => void;
  onBuildingEffectsChange?: (effects: BuildingEffects) => void;
}

/** Accessible hub pause modal with focus trap and Escape key support. */
function HubPauseModal({ onResume, onQuit }: { onResume: () => void; onQuit: () => void }) {
  const resumeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    resumeRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onResume();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onResume]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      role="dialog"
      aria-modal="true"
      aria-labelledby="hub-pause-title"
    >
      <div className="bg-[#fdf6e3] border-3 border-[#8b5a2b] rounded-xl p-9 text-center">
        <h2 id="hub-pause-title" className="text-3xl mb-6" style={{ fontFamily: 'Georgia, serif', color: '#2c1e16' }}>
          PAUSED
        </h2>
        <button
          ref={resumeRef}
          type="button"
          onClick={onResume}
          className="block w-full mb-2 py-2.5 rounded-md border-2 border-[#8b5a2b] bg-[#2c1e16] text-[#fdf6e3] cursor-pointer text-base focus-visible:ring-2 focus-visible:ring-[#c4a572] focus-visible:outline-none"
          style={{ fontFamily: 'Georgia, serif' }}
        >
          Resume
        </button>
        <button
          type="button"
          onClick={onQuit}
          className="block w-full py-2.5 rounded-md border-2 border-[#8b5a2b] bg-[#fef9ef] text-[#2c1e16] cursor-pointer text-base focus-visible:ring-2 focus-visible:ring-[#c4a572] focus-visible:outline-none"
          style={{ fontFamily: 'Georgia, serif' }}
        >
          Quit to Menu
        </button>
      </div>
    </div>
  );
}

/** Lazily-constructed content registry for crafting recipes + biome destinations. */
let _registry: ContentRegistry | null = null;
function getRegistry(): ContentRegistry {
  if (!_registry) _registry = new ContentRegistry();
  return _registry;
}

/** NPC floating label projection config. */
const NPC_LABEL_DISTANCE = 12;

/** Hub island: walk between buildings, upgrade, interact with NPCs, set sail. */
export function HubView({ onNavigate, onBuildingEffectsChange }: Props) {
  const [showPause, setShowPause] = useState(false);
  const [npcDialogueOpen, setNpcDialogueOpen] = useState(true);
  const [upgradeFeedback, setUpgradeFeedback] = useState<{ message: string; success: boolean } | null>(null);

  // Shared ref for per-frame callback: useHubCamera writes, useHubEngine reads
  const onFrameRef = useRef<((cam: CameraResult) => void) | null>(null);

  // Player inventory (shared resource pool for NPC transactions and building upgrades)
  const playerInventory = usePlayerInventory();

  // Building upgrade system — uses player inventory for resource management
  const hubBuildings = useHubBuildings(undefined, playerInventory);
  const buildingProximityRef = useRef(hubBuildings.updatePlayerPosition);
  buildingProximityRef.current = hubBuildings.updatePlayerPosition;

  // Compute building effects from current levels
  const buildingEffects = useMemo(
    () => computeBuildingEffects(hubBuildings.buildingLevels),
    [hubBuildings.buildingLevels],
  );

  // Notify parent of building effects changes
  useEffect(() => {
    onBuildingEffectsChange?.(buildingEffects);
  }, [buildingEffects, onBuildingEffectsChange]);

  // NPC proximity system
  const npcProximityHook = useNPCProximity([]);
  const npcProximityRef = useRef(npcProximityHook.updatePlayerPosition);
  npcProximityRef.current = npcProximityHook.updatePlayerPosition;

  const { canvasRef, isMobile, handleTouchOutput, hubRef, npcEntities } = useHubEngine(
    onFrameRef,
    buildingProximityRef,
    npcProximityRef,
  );

  // Re-initialize NPC proximity when entities are ready
  const npcProximity = useNPCProximity(npcEntities);
  npcProximityRef.current = npcProximity.updatePlayerPosition;

  const { labels, nearDocks } = useHubCamera(canvasRef, hubRef, onFrameRef);

  // NPC floating labels
  const [npcLabels, setNpcLabels] = useState<{ name: string; screenX: number; screenY: number; visible: boolean }[]>(
    [],
  );

  const originalOnFrame = onFrameRef.current;
  onFrameRef.current = (cam: CameraResult) => {
    originalOnFrame?.(cam);

    if (npcEntities.length === 0) return;

    const camera = cam.camera;
    const playerPos = cam.getPosition();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const cw = canvas.clientWidth;
    const ch = canvas.clientHeight;
    const hw = cw / 2;
    const hh = ch / 2;

    const projected = npcEntities.map((npc) => {
      const labelPos = new THREE.Vector3(npc.worldPos.x, npc.worldPos.y + 2.4, npc.worldPos.z);
      const dist = playerPos.distanceTo(labelPos);
      if (dist > NPC_LABEL_DISTANCE) return { name: npc.name, screenX: 0, screenY: 0, visible: false };

      const p = labelPos.clone().project(camera);
      return {
        name: npc.name,
        screenX: p.x * hw + hw,
        screenY: -p.y * hh + hh,
        visible: p.z < 1,
      };
    });
    setNpcLabels(projected);
  };

  const handleSetSail = useCallback(() => onNavigate('game'), [onNavigate]);

  // Content data for NPC panels — filter crafting recipes by forge tier
  const { craftingRecipes, biomeDestinations } = useMemo(() => {
    const reg = getRegistry();
    const allRecipes = reg.getAllCraftingRecipes();
    const filteredRecipes = allRecipes.filter((r) => r.tier <= buildingEffects.maxCraftingTier);
    return {
      craftingRecipes: filteredRecipes,
      biomeDestinations: reg.getAllBiomes().map((b) => ({ id: b.id, name: b.name })),
    };
  }, [buildingEffects.maxCraftingTier]);

  // NPC interaction callbacks
  const handleBuy = useCallback((_itemId: string) => {
    // Transaction is handled by MerchantPanel via playerInventory
  }, []);

  const handleCraft = useCallback((_recipeId: string) => {
    // Transaction is handled by CrafterPanel via playerInventory
  }, []);

  const handleSelectDestination = useCallback(
    (biomeId: string) => {
      console.log('[Hub] Navigate to:', biomeId);
      onNavigate('game');
    },
    [onNavigate],
  );

  const handleCloseDialogue = useCallback(() => {
    setNpcDialogueOpen(false);
  }, []);

  // Building upgrade with feedback
  const handleUpgrade = useCallback(
    (buildingId: string) => {
      const success = hubBuildings.upgradeBuilding(buildingId);
      if (success) {
        setUpgradeFeedback({ message: 'Upgrade successful!', success: true });
      } else {
        setUpgradeFeedback({ message: 'Not enough resources!', success: false });
      }
      setTimeout(() => setUpgradeFeedback(null), 2000);
    },
    [hubBuildings.upgradeBuilding],
  );

  // Re-open dialogue when a new NPC comes into range
  const nearbyNPC = npcProximity.nearbyNPC;
  const prevNpcIdRef = useRef<string | null>(null);
  if (nearbyNPC && nearbyNPC.id !== prevNpcIdRef.current) {
    prevNpcIdRef.current = nearbyNPC.id;
    setNpcDialogueOpen(true);
  } else if (!nearbyNPC && prevNpcIdRef.current !== null) {
    prevNpcIdRef.current = null;
  }

  return (
    <div className="fixed inset-0" role="application" aria-label="Hub island - walk between buildings and set sail">
      <canvas
        ref={canvasRef}
        id="hub-canvas"
        tabIndex={-1}
        className="w-full h-full block outline-none"
        style={{ touchAction: 'none' }}
        aria-label="Hub island 3D view"
      />

      {/* Floating building labels */}
      <div className="fixed inset-0 pointer-events-none z-10">
        {labels
          .filter((l) => l.visible)
          .map((l) => (
            <div
              key={l.name}
              className="absolute text-center -translate-x-1/2"
              style={{
                left: l.screenX,
                top: l.screenY,
                fontFamily: 'Cinzel, Georgia, serif',
                color: '#fdf6e3',
                textShadow: '0 1px 4px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.5)',
                fontSize: '14px',
                letterSpacing: '0.05em',
              }}
            >
              {l.name}
            </div>
          ))}
      </div>

      {/* Floating NPC name labels */}
      <div className="fixed inset-0 pointer-events-none z-10">
        {npcLabels
          .filter((l) => l.visible)
          .map((l) => (
            <div
              key={l.name}
              className="absolute text-center -translate-x-1/2"
              style={{
                left: l.screenX,
                top: l.screenY,
                fontFamily: 'Cinzel, Georgia, serif',
                color: '#ffe8b8',
                textShadow: '0 1px 4px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.5)',
                fontSize: '13px',
                letterSpacing: '0.04em',
              }}
            >
              {l.name}
            </div>
          ))}
      </div>

      {/* Set Sail prompt near docks */}
      {nearDocks && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-20">
          <button
            type="button"
            onClick={handleSetSail}
            aria-label="Set sail to explore a new island"
            className="px-8 py-3 rounded-lg border-2 cursor-pointer transition-all duration-300 hover:shadow-[0_0_20px_rgba(139,115,85,0.5)] focus-visible:ring-2 focus-visible:ring-[#c4a572] focus-visible:outline-none"
            style={{
              fontFamily: 'Cinzel, Georgia, serif',
              color: '#d4c5a0',
              background: 'rgba(58,40,32,0.9)',
              borderColor: '#c4a572',
              fontSize: '18px',
              letterSpacing: '0.05em',
            }}
          >
            Set Sail
          </button>
        </div>
      )}

      {hubBuildings.nearbyBuilding && (
        <>
          <BuildingInteraction
            nearby={hubBuildings.nearbyBuilding}
            resources={playerInventory.resources}
            onUpgrade={handleUpgrade}
          />
          {upgradeFeedback && (
            <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-30" role="status">
              <span className={`badge badge-lg ${upgradeFeedback.success ? 'badge-success' : 'badge-error'}`}>
                {upgradeFeedback.message}
              </span>
            </div>
          )}
        </>
      )}

      {/* NPC dialogue panel */}
      {nearbyNPC && npcDialogueOpen && (
        <NPCDialogue
          npc={nearbyNPC}
          craftingRecipes={craftingRecipes}
          unlockedPages={[]}
          biomeDestinations={biomeDestinations}
          playerInventory={playerInventory}
          onBuy={handleBuy}
          onCraft={handleCraft}
          onSelectDestination={handleSelectDestination}
          onClose={handleCloseDialogue}
        />
      )}

      {/* Hub indicator + resources */}
      <div
        className="fixed top-4 left-4 z-10 bg-[#fdf6e3]/85 border-2 border-[#8b5a2b] rounded-md px-3 py-2"
        style={{ fontFamily: 'Georgia, serif', color: '#2c1e16' }}
        role="status"
        aria-label="Hub status and resources"
      >
        <div className="text-sm font-bold">Hub Island</div>
        <div className="text-xs italic" style={{ color: '#8b5a2b' }}>
          Visit the Docks to set sail
        </div>
        <div className="flex gap-2 mt-1 text-xs">
          <span>Wood: {playerInventory.resources.wood ?? 0}</span>
          <span>Stone: {playerInventory.resources.stone ?? 0}</span>
        </div>
      </div>

      <div className="fixed top-4 right-4 z-10">
        <button
          type="button"
          onClick={() => setShowPause(true)}
          aria-label="Open pause menu"
          className="bg-[#fdf6e3]/85 border-2 border-[#8b5a2b] rounded-md px-3 py-2 cursor-pointer text-xs focus-visible:ring-2 focus-visible:ring-[#c4a572] focus-visible:outline-none min-w-[44px] min-h-[44px]"
          style={{ fontFamily: 'Georgia, serif', color: '#2c1e16' }}
        >
          Menu
        </button>
      </div>

      {showPause && <HubPauseModal onResume={() => setShowPause(false)} onQuit={() => onNavigate('menu')} />}

      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 bg-white rounded-full shadow-[0_0_4px_rgba(0,0,0,0.5)] z-10 pointer-events-none" />
      <TouchControls onOutput={handleTouchOutput} enabled={isMobile} />
    </div>
  );
}
