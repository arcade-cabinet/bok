/**
 * Mobile touch controls — joystick (left), camera look (right), jump + craft buttons.
 * Ported from box.html's mobile control system.
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { kootaWorld } from "../../engine/game.ts";
import { PlayerTag, MoveInput, Rotation, ToolSwing, MiningState } from "../../ecs/traits/index.ts";

interface MobileControlsProps {
  onCraftToggle: () => void;
}

export function MobileControls({ onCraftToggle }: MobileControlsProps) {
  const [joyVisible, setJoyVisible] = useState(false);
  const [joyPos, setJoyPos] = useState({ x: 0, y: 0 });
  const [nubOffset, setNubOffset] = useState({ x: 0, y: 0 });

  const joyStartRef = useRef({ x: 0, y: 0 });
  const lastTouchRef = useRef({ x: 0, y: 0 });

  // Joystick - left side
  const onLeftTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.changedTouches[0];
    joyStartRef.current = { x: t.clientX, y: t.clientY };
    setJoyPos({ x: t.clientX - 60, y: t.clientY - 60 });
    setNubOffset({ x: 0, y: 0 });
    setJoyVisible(true);
  }, []);

  const onLeftTouchMove = useCallback((e: React.TouchEvent) => {
    const t = e.changedTouches[0];
    let dx = t.clientX - joyStartRef.current.x;
    let dy = t.clientY - joyStartRef.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 40) {
      dx = (dx / dist) * 40;
      dy = (dy / dist) * 40;
    }
    setNubOffset({ x: dx, y: dy });

    kootaWorld.query(PlayerTag, MoveInput).updateEach(([input]) => {
      input.forward = dy / 40 < -0.2;
      input.backward = dy / 40 > 0.2;
      input.left = dx / 40 < -0.2;
      input.right = dx / 40 > 0.2;
    });
  }, []);

  const onLeftTouchEnd = useCallback(() => {
    setJoyVisible(false);
    kootaWorld.query(PlayerTag, MoveInput).updateEach(([input]) => {
      input.forward = false;
      input.backward = false;
      input.left = false;
      input.right = false;
    });
  }, []);

  // Camera look - right side
  const onRightTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.changedTouches[0];
    lastTouchRef.current = { x: t.clientX, y: t.clientY };
    kootaWorld.query(PlayerTag, MiningState).updateEach(([mining]) => {
      mining.active = true;
    });
  }, []);

  const onRightTouchMove = useCallback((e: React.TouchEvent) => {
    const t = e.changedTouches[0];
    const dx = t.clientX - lastTouchRef.current.x;
    const dy = t.clientY - lastTouchRef.current.y;

    kootaWorld.query(PlayerTag, Rotation, ToolSwing).updateEach(([rot, toolSwing]) => {
      rot.yaw -= dx * 0.005;
      rot.pitch -= dy * 0.005;
      rot.pitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, rot.pitch));

      toolSwing.targetSwayY -= dx * 0.001;
      toolSwing.targetSwayX -= dy * 0.001;
      toolSwing.targetSwayX = Math.max(-0.1, Math.min(0.1, toolSwing.targetSwayX));
      toolSwing.targetSwayY = Math.max(-0.1, Math.min(0.1, toolSwing.targetSwayY));
    });

    lastTouchRef.current = { x: t.clientX, y: t.clientY };
  }, []);

  const onRightTouchEnd = useCallback(() => {
    kootaWorld.query(PlayerTag, MiningState).updateEach(([mining]) => {
      mining.active = false;
    });
  }, []);

  // Jump button
  const onJumpStart = useCallback(() => {
    kootaWorld.query(PlayerTag, MoveInput).updateEach(([input]) => {
      input.jump = true;
    });
  }, []);

  const onJumpEnd = useCallback(() => {
    kootaWorld.query(PlayerTag, MoveInput).updateEach(([input]) => {
      input.jump = false;
    });
  }, []);

  return (
    <div className="absolute inset-0 z-[5] pointer-events-none" style={{ display: isMobile() ? "block" : "none" }}>
      {/* Left touch zone - joystick */}
      <div
        className="absolute top-0 left-0 h-full w-1/2 pointer-events-auto"
        onTouchStart={onLeftTouchStart}
        onTouchMove={onLeftTouchMove}
        onTouchEnd={onLeftTouchEnd}
      />

      {/* Right touch zone - camera look */}
      <div
        className="absolute top-0 right-0 h-full w-1/2 pointer-events-auto"
        onTouchStart={onRightTouchStart}
        onTouchMove={onRightTouchMove}
        onTouchEnd={onRightTouchEnd}
      />

      {/* Joystick visual */}
      {joyVisible && (
        <div
          className="absolute w-[120px] h-[120px] rounded-full border-2 border-white/20 pointer-events-none"
          style={{
            left: joyPos.x,
            top: joyPos.y,
            background: "rgba(255,255,255,0.05)",
          }}
        >
          <div
            className="absolute w-[60px] h-[60px] rounded-full bg-white/80"
            style={{
              left: 30 + nubOffset.x,
              top: 30 + nubOffset.y,
              boxShadow: "0 4px 10px rgba(0,0,0,0.5)",
            }}
          />
        </div>
      )}

      {/* Action buttons */}
      <div className="absolute bottom-[120px] right-5 flex flex-col gap-4 pointer-events-auto">
        <button
          className="w-[65px] h-[65px] rounded-full bg-black/60 border-2 border-white/30 text-white text-sm font-bold flex items-center justify-center"
          style={{ boxShadow: "0 4px 10px rgba(0,0,0,0.5)" }}
          onTouchStart={onJumpStart}
          onTouchEnd={onJumpEnd}
        >
          JUMP
        </button>
        <button
          className="w-[65px] h-[65px] rounded-full bg-black/60 border-2 border-white/30 text-white text-sm font-bold flex items-center justify-center"
          style={{ boxShadow: "0 4px 10px rgba(0,0,0,0.5)" }}
          onTouchStart={onCraftToggle}
        >
          INV
        </button>
      </div>
    </div>
  );
}

function isMobile(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}
