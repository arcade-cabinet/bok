import { useCallback, useRef, useState } from 'react';
import { BuildingInteraction } from '../../components/hud/BuildingInteraction';
import { TouchControls } from '../../components/ui/TouchControls';
import type { CameraResult } from '../../engine/camera';
import { useHubBuildings } from '../../hooks/useHubBuildings';
import { useHubCamera } from '../../hooks/useHubCamera';
import { useHubEngine } from '../../hooks/useHubEngine';

interface Props {
  onNavigate: (view: 'menu' | 'game') => void;
}

/** Hub island: walk between buildings, upgrade, set sail to game islands. */
export function HubView({ onNavigate }: Props) {
  const [showPause, setShowPause] = useState(false);

  // Shared ref for per-frame callback: useHubCamera writes, useHubEngine reads
  const onFrameRef = useRef<((cam: CameraResult) => void) | null>(null);

  // Building upgrade system
  const hubBuildings = useHubBuildings();
  const buildingProximityRef = useRef(hubBuildings.updatePlayerPosition);
  buildingProximityRef.current = hubBuildings.updatePlayerPosition;

  const { canvasRef, isMobile, handleTouchOutput, hubRef } = useHubEngine(onFrameRef, buildingProximityRef);
  const { labels, nearDocks } = useHubCamera(canvasRef, hubRef, onFrameRef);

  const handleSetSail = useCallback(() => onNavigate('game'), [onNavigate]);

  return (
    <div className="fixed inset-0">
      <canvas
        ref={canvasRef}
        id="hub-canvas"
        tabIndex={-1}
        className="w-full h-full block outline-none"
        style={{ touchAction: 'none' }}
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

      {/* Set Sail prompt near docks */}
      {nearDocks && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-20">
          <button
            type="button"
            onClick={handleSetSail}
            className="px-8 py-3 rounded-lg border-2 cursor-pointer transition-all duration-300 hover:shadow-[0_0_20px_rgba(139,115,85,0.5)]"
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
        <BuildingInteraction
          nearby={hubBuildings.nearbyBuilding}
          resources={hubBuildings.resources}
          onUpgrade={hubBuildings.upgradeBuilding}
        />
      )}

      {/* Hub indicator + resources */}
      <div
        className="fixed top-4 left-4 z-10 bg-[#fdf6e3]/85 border-2 border-[#8b5a2b] rounded-md px-3 py-2"
        style={{ fontFamily: 'Georgia, serif', color: '#2c1e16' }}
      >
        <div className="text-sm font-bold">Hub Island</div>
        <div className="text-xs italic" style={{ color: '#8b5a2b' }}>
          Visit the Docks to set sail
        </div>
        <div className="flex gap-2 mt-1 text-xs">
          <span>Wood: {hubBuildings.resources.wood ?? 0}</span>
          <span>Stone: {hubBuildings.resources.stone ?? 0}</span>
        </div>
      </div>

      <div className="fixed top-4 right-4 z-10">
        <button
          type="button"
          onClick={() => setShowPause(true)}
          className="bg-[#fdf6e3]/85 border-2 border-[#8b5a2b] rounded-md px-3 py-2 cursor-pointer text-xs"
          style={{ fontFamily: 'Georgia, serif', color: '#2c1e16' }}
        >
          Menu
        </button>
      </div>

      {showPause && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-[#fdf6e3] border-3 border-[#8b5a2b] rounded-xl p-9 text-center">
            <h2 className="text-3xl mb-6" style={{ fontFamily: 'Georgia, serif', color: '#2c1e16' }}>
              PAUSED
            </h2>
            <button
              type="button"
              onClick={() => setShowPause(false)}
              className="block w-full mb-2 py-2.5 rounded-md border-2 border-[#8b5a2b] bg-[#2c1e16] text-[#fdf6e3] cursor-pointer text-base"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              Resume
            </button>
            <button
              type="button"
              onClick={() => onNavigate('menu')}
              className="block w-full py-2.5 rounded-md border-2 border-[#8b5a2b] bg-[#fef9ef] text-[#2c1e16] cursor-pointer text-base"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              Quit to Menu
            </button>
          </div>
        </div>
      )}

      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 bg-white rounded-full shadow-[0_0_4px_rgba(0,0,0,0.5)] z-10 pointer-events-none" />
      <TouchControls onOutput={handleTouchOutput} enabled={isMobile} />
    </div>
  );
}
