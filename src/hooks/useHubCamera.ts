/**
 * @module hooks/useHubCamera
 * @role Building label screen projection and dock proximity detection
 * @input Camera result ref, hub result ref (from useHubEngine), canvas ref, onFrame ref to write to
 * @output Building labels array, nearDocks flag
 */
import { useCallback, useRef, useState } from 'react';
import * as THREE from 'three';
import type { CameraResult } from '../engine/camera';
import type { BuildingDef, HubResult } from '../engine/hub';

export interface BuildingLabel {
  name: string;
  screenX: number;
  screenY: number;
  visible: boolean;
}

export interface HubCameraResult {
  labels: BuildingLabel[];
  nearDocks: boolean;
}

const LABEL_DISTANCE = 15;
const DOCK_DISTANCE = 8;

/**
 * Manages per-frame building label projection and dock proximity detection.
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
  const [nearDocks, setNearDocks] = useState(false);

  // Precomputed building centers (lazily initialized on first frame)
  const buildingCentersRef = useRef<{ name: string; pos: THREE.Vector3 }[] | null>(null);
  const dockCenterRef = useRef<THREE.Vector3 | null>(null);

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

        const dockBuilding = hub.buildings.find((b) => b.name === 'Docks');
        if (dockBuilding) {
          dockCenterRef.current = new THREE.Vector3(
            dockBuilding.x + dockBuilding.width / 2,
            0,
            dockBuilding.z + dockBuilding.depth / 2,
          );
        }
      }

      const camera = cam.camera;
      const playerPos = cam.getPosition();
      const cw = canvasRef.current?.clientWidth ?? 0;
      const ch = canvasRef.current?.clientHeight ?? 0;
      const hw = cw / 2;
      const hh = ch / 2;

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

      // Check proximity to docks
      const dc = dockCenterRef.current;
      if (dc) {
        const dockDist = Math.sqrt((playerPos.x - dc.x) ** 2 + (playerPos.z - dc.z) ** 2);
        setNearDocks(dockDist < DOCK_DISTANCE);
      }
    },
    [canvasRef, hubRef],
  );

  // Write callback into the shared ref each render — useHubEngine reads this ref each frame
  onFrameRef.current = onFrame;

  return { labels, nearDocks };
}
