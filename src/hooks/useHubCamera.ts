/**
 * @module hooks/useHubCamera
 * @role Building + dock label screen projection and per-dock proximity detection
 * @input Camera result ref, hub result ref (from useHubEngine), canvas ref, onFrame ref to write to
 * @output Building labels array, dock labels array, nearby dock info
 */
import { useCallback, useRef, useState } from 'react';
import * as THREE from 'three';
import type { CameraResult } from '../engine/camera';
import {
  type BuildingDef,
  type DockDef,
  type DockProximity,
  findNearbyDock,
  getDockEndPosition,
  type HubResult,
} from '../engine/hub';

export interface BuildingLabel {
  name: string;
  screenX: number;
  screenY: number;
  visible: boolean;
}

export interface DockLabel {
  biomeId: string;
  name: string;
  color: number;
  screenX: number;
  screenY: number;
  visible: boolean;
}

export interface HubCameraResult {
  labels: BuildingLabel[];
  dockLabels: DockLabel[];
  nearbyDock: DockProximity | null;
}

const LABEL_DISTANCE = 15;
const DOCK_LABEL_DISTANCE = 18;

/**
 * Manages per-frame building/dock label projection and dock proximity detection.
 *
 * Writes its per-frame callback into the provided `onFrameRef`, which `useHubEngine`
 * calls each frame. Precomputes building centers lazily on first invocation.
 */
export function useHubCamera(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  hubRef: React.RefObject<HubResult | null>,
  onFrameRef: React.MutableRefObject<((cam: CameraResult) => void) | null>,
): HubCameraResult {
  const [labels, setLabels] = useState<BuildingLabel[]>([]);
  const [dockLabels, setDockLabels] = useState<DockLabel[]>([]);
  const [nearbyDock, setNearbyDock] = useState<DockProximity | null>(null);

  // Precomputed building centers (lazily initialized on first frame)
  const buildingCentersRef = useRef<{ name: string; pos: THREE.Vector3 }[] | null>(null);
  const dockSignpostPositionsRef = useRef<
    { biomeId: string; name: string; color: number; pos: THREE.Vector3 }[] | null
  >(null);

  const onFrame = useCallback(
    (cam: CameraResult) => {
      const hub = hubRef.current;
      if (!hub) return;

      // Lazily precompute building centers on first frame
      if (!buildingCentersRef.current) {
        buildingCentersRef.current = hub.buildings.map((b: BuildingDef) => ({
          name: b.name,
          pos: new THREE.Vector3(b.x + b.width / 2, hub.getSurfaceY(b.x, b.z) + b.height + 1, b.z + b.depth / 2),
        }));
      }

      // Lazily precompute dock signpost screen positions
      if (!dockSignpostPositionsRef.current) {
        dockSignpostPositionsRef.current = hub.docks.map((dock: DockDef) => {
          const endPos = getDockEndPosition(dock);
          return {
            biomeId: dock.biomeId,
            name: dock.name,
            color: dock.color,
            // Label floats above the signpost (dock surface Y + signpost height + offset)
            pos: new THREE.Vector3(endPos.x, 8, endPos.z),
          };
        });
      }

      const camera = cam.camera;
      const playerPos = cam.getPosition();
      const cw = canvasRef.current?.clientWidth ?? 0;
      const ch = canvasRef.current?.clientHeight ?? 0;
      const hw = cw / 2;
      const hh = ch / 2;

      // Project building labels
      const newLabels: BuildingLabel[] = buildingCentersRef.current.map((bc) => {
        const dist = playerPos.distanceTo(bc.pos);
        if (dist > LABEL_DISTANCE) return { name: bc.name, screenX: 0, screenY: 0, visible: false };

        const projected = bc.pos.clone().project(camera);
        return {
          name: bc.name,
          screenX: projected.x * hw + hw,
          screenY: -projected.y * hh + hh,
          visible: projected.z < 1,
        };
      });
      setLabels(newLabels);

      // Project dock signpost labels
      const newDockLabels: DockLabel[] = dockSignpostPositionsRef.current.map((dp) => {
        const dist = playerPos.distanceTo(dp.pos);
        if (dist > DOCK_LABEL_DISTANCE)
          return { biomeId: dp.biomeId, name: dp.name, color: dp.color, screenX: 0, screenY: 0, visible: false };

        const projected = dp.pos.clone().project(camera);
        return {
          biomeId: dp.biomeId,
          name: dp.name,
          color: dp.color,
          screenX: projected.x * hw + hw,
          screenY: -projected.y * hh + hh,
          visible: projected.z < 1,
        };
      });
      setDockLabels(newDockLabels);

      // Check proximity to docks
      setNearbyDock(findNearbyDock(playerPos.x, playerPos.z, hub.docks));
    },
    [canvasRef, hubRef],
  );

  // Write callback into the shared ref each render — useHubEngine reads this ref each frame
  onFrameRef.current = onFrame;

  return { labels, dockLabels, nearbyDock };
}
