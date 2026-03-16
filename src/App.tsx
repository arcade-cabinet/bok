import { useState, useEffect, useCallback, useRef } from "react";

import { kootaWorld, initGame } from "./engine/game.ts";
import { setupInputHandlers } from "./engine/input-handler.ts";
import {
  PlayerTag,
  Health,
  Hunger,
  Stamina,
  Inventory,
  Hotbar,
  MiningState,
  QuestProgress,
  PlayerState,
  PhysicsBody,
  WorldTime,
  Position,
} from "./ecs/traits/index.ts";
import { RECIPES } from "./world/blocks.ts";

import { TitleScreen } from "./ui/screens/TitleScreen.tsx";
import { DeathScreen } from "./ui/screens/DeathScreen.tsx";
import { VitalsBar } from "./ui/hud/VitalsBar.tsx";
import { HotbarDisplay } from "./ui/hud/HotbarDisplay.tsx";
import { QuestTracker } from "./ui/hud/QuestTracker.tsx";
import { Crosshair } from "./ui/hud/Crosshair.tsx";
import { TimeDisplay } from "./ui/hud/TimeDisplay.tsx";
import { DamageVignette } from "./ui/hud/DamageVignette.tsx";
import { UnderwaterOverlay } from "./ui/hud/UnderwaterOverlay.tsx";
import { CraftingMenu } from "./ui/components/CraftingMenu.tsx";
import { MobileControls } from "./ui/hud/MobileControls.tsx";

const IS_MOBILE = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

type GamePhase = "title" | "playing" | "dead";

export default function App() {
  const [phase, setPhase] = useState<GamePhase>("title");
  const [craftingOpen, setCraftingOpen] = useState(false);
  const cleanupRef = useRef<(() => void) | null>(null);

  // Poll ECS state for HUD (runs on animationFrame)
  const [hudState, setHudState] = useState({
    health: 100,
    hunger: 100,
    stamina: 100,
    inventory: { wood: 0, stone: 0, dirt: 0, grass: 0, sand: 0, glass: 0, stonebricks: 0, planks: 0, torches: 0 },
    hotbarSlots: [null, null, null, null, null] as (null | { id: number; type: "block" | "item" })[],
    activeSlot: 0,
    miningActive: false,
    miningProgress: 0,
    questStep: 0,
    questProgress: 0,
    damageFlash: 0,
    isSwimming: false,
    timeOfDay: 0.25,
    dayCount: 1,
    isDead: false,
  });

  // HUD polling loop — single setHudState per frame
  useEffect(() => {
    if (phase !== "playing") return;

    let raf: number;
    const poll = () => {
      let playerUpdate: Partial<typeof hudState> = {};
      let timeUpdate: Partial<typeof hudState> = {};

      kootaWorld
        .query(PlayerTag, Health, Hunger, Stamina, Inventory, Hotbar, MiningState, QuestProgress, PlayerState, PhysicsBody)
        .readEach(([health, hunger, stamina, inv, hotbar, mining, quest, state, body]) => {
          playerUpdate = {
            health: health.current,
            hunger: hunger.current,
            stamina: stamina.current,
            inventory: { ...inv },
            hotbarSlots: [...hotbar.slots],
            activeSlot: hotbar.activeSlot,
            miningActive: mining.active,
            miningProgress: mining.progress,
            questStep: quest.step,
            questProgress: quest.progress,
            damageFlash: state.damageFlash,
            isSwimming: body.isSwimming,
            isDead: state.isDead,
          };

          // Check death from fresh ECS state (no stale closure)
          if (state.isDead) {
            setPhase("dead");
          }
        });

      kootaWorld.query(WorldTime).readEach(([time]) => {
        timeUpdate = {
          timeOfDay: time.timeOfDay,
          dayCount: time.dayCount,
        };
      });

      setHudState((prev) => ({
        ...prev,
        ...playerUpdate,
        ...timeUpdate,
      }));

      raf = requestAnimationFrame(poll);
    };
    raf = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  // Cleanup input handlers when leaving playing phase or unmounting
  useEffect(() => {
    if (phase !== "playing") {
      cleanupRef.current?.();
      cleanupRef.current = null;
    }
    return () => {
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, [phase]);

  // Keyboard listener for crafting toggle
  useEffect(() => {
    if (phase !== "playing") return;

    const onKey = (e: KeyboardEvent) => {
      if (e.code === "KeyE") {
        setCraftingOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [phase]);

  const handleStartGame = useCallback(async (seed: string) => {
    const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
    if (!canvas) return;

    try {
      await initGame(canvas, seed);
      cleanupRef.current?.();
      cleanupRef.current = setupInputHandlers(canvas);
      setPhase("playing");
    } catch (err) {
      console.error("Failed to start game:", err);
    }
  }, []);

  const handleRespawn = useCallback(() => {
    kootaWorld
      .query(PlayerTag, Health, Hunger, Position, PlayerState)
      .updateEach(([health, hunger, pos, state]) => {
        health.current = 100;
        hunger.current = 100;
        pos.x = 8.5;
        pos.y = 30;
        pos.z = 8.5;
        state.isDead = false;
        state.isRunning = true;
        state.damageFlash = 0;
      });
    setPhase("playing");
  }, []);

  const handleCraft = useCallback((recipeId: string) => {
    const recipe = RECIPES.find((r) => r.id === recipeId);
    if (!recipe) return;

    kootaWorld
      .query(PlayerTag, Inventory, Hotbar)
      .updateEach(([inv, hotbar]) => {
        // Check cost
        const invAny = inv as unknown as Record<string, number>;
        const canAfford = Object.entries(recipe.cost).every(
          ([res, amount]) => (invAny[res] || 0) >= amount
        );
        if (!canAfford) return;

        for (const [res, amount] of Object.entries(recipe.cost)) {
          invAny[res] -= amount;
        }

        if (recipe.result.type === "block") {
          const invKey = getInventoryKeyForBlock(recipe.id);
          if (invKey) {
            invAny[invKey] = (invAny[invKey] || 0) + recipe.result.qty;
          }
        }

        // Add to hotbar
        const emptySlot = hotbar.slots.findIndex((s) => s === null);
        if (emptySlot >= 0) {
          hotbar.slots[emptySlot] = { id: recipe.result.id, type: recipe.result.type };
        } else {
          hotbar.slots[hotbar.activeSlot] = { id: recipe.result.id, type: recipe.result.type };
        }
      });
  }, []);

  const handleSlotClick = useCallback((index: number) => {
    kootaWorld.query(PlayerTag, Hotbar).updateEach(([hotbar]) => {
      hotbar.activeSlot = index;
    });
  }, []);

  return (
    <>
      {/* Overlays */}
      {phase === "playing" && (
        <>
          <DamageVignette health={hudState.health} damageFlash={hudState.damageFlash} />
          <UnderwaterOverlay isUnderwater={hudState.isSwimming} />
        </>
      )}

      {/* UI Layer */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        {phase === "title" && <TitleScreen onStartGame={handleStartGame} />}
        {phase === "dead" && <DeathScreen onRespawn={handleRespawn} />}

        {phase === "playing" && (
          <>
            {/* Crosshair (hidden on mobile) */}
            {!IS_MOBILE && (
              <Crosshair
                isMining={hudState.miningActive}
                miningProgress={hudState.miningProgress}
              />
            )}

            {/* Mobile Controls */}
            {IS_MOBILE && (
              <MobileControls onCraftToggle={() => setCraftingOpen((prev) => !prev)} />
            )}

            {/* Top HUD */}
            <div className="absolute top-4 left-4 right-4 flex justify-between items-start"
              style={{ textShadow: "1px 1px 2px #000, 0 0 4px #000" }}
            >
              <TimeDisplay timeOfDay={hudState.timeOfDay} dayCount={hudState.dayCount} />
              <QuestTracker step={hudState.questStep} progress={hudState.questProgress} />
            </div>

            {/* Bottom HUD */}
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-auto">
              <VitalsBar
                health={hudState.health}
                hunger={hudState.hunger}
                stamina={hudState.stamina}
              />
              <HotbarDisplay
                slots={hudState.hotbarSlots}
                activeSlot={hudState.activeSlot}
                inventory={hudState.inventory}
                onSlotClick={handleSlotClick}
              />
            </div>

            {/* Crafting Menu */}
            <CraftingMenu
              isOpen={craftingOpen}
              inventory={hudState.inventory}
              onCraft={handleCraft}
              onClose={() => setCraftingOpen(false)}
            />
          </>
        )}
      </div>
    </>
  );
}

function getInventoryKeyForBlock(recipeId: string): string | null {
  switch (recipeId) {
    case "planks": return "planks";
    case "torch": return "torches";
    case "bricks": return "stonebricks";
    case "glass": return "glass";
    default: return null;
  }
}
