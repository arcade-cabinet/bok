/**
 * @module rendering/GhostPreview
 * @role Semi-transparent wireframe block preview at the placement position
 * @input Scene, placement position + shape from BlockInteractionSystem
 * @output Updates a wireframe mesh each frame; hides when no valid placement
 */
import * as THREE from 'three';

import type { PlaceableShape } from '../systems/block-interaction';

// ---------------------------------------------------------------------------
// Shape geometry generators
// ---------------------------------------------------------------------------

/**
 * Get the wireframe geometry for a given shape.
 * All shapes fit within a 1x1x1 unit cube centered at the origin.
 */
function getShapeGeometry(shape: PlaceableShape): THREE.BufferGeometry {
  switch (shape) {
    case 'cube':
      return new THREE.BoxGeometry(1, 1, 1);
    case 'slabBottom':
      // Half-height slab at the bottom
      return new THREE.BoxGeometry(1, 0.5, 1).translate(0, -0.25, 0);
    case 'slabTop':
      // Half-height slab at the top
      return new THREE.BoxGeometry(1, 0.5, 1).translate(0, 0.25, 0);
    case 'poleY':
      // Vertical pole (quarter width)
      return new THREE.BoxGeometry(0.25, 1, 0.25);
    case 'ramp': {
      // Triangular ramp — custom geometry
      const geo = new THREE.BufferGeometry();
      // Vertices for a ramp: flat bottom, sloped top surface
      const vertices = new Float32Array([
        // Bottom face (quad)
        -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, -0.5, 0.5, -0.5, -0.5, 0.5,
        // Top edge (two vertices at the high side)
        -0.5, 0.5, -0.5, 0.5, 0.5, -0.5,
      ]);
      // Edges as line segments for the wireframe
      const indices = [
        0,
        1,
        1,
        2,
        2,
        3,
        3,
        0, // bottom
        4,
        5, // top edge
        0,
        4,
        1,
        5, // verticals (back)
        3,
        4,
        2,
        5, // slope edges
      ];
      geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      geo.setIndex(indices);
      return geo;
    }
    case 'stair': {
      // Two-step stair
      const geo = new THREE.BufferGeometry();
      const vertices = new Float32Array([
        // Lower step (front half, half height)
        -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.0, 0.5, -0.5, 0.0, 0.5, -0.5, -0.5, 0.0, 0.5, -0.5, 0.0, 0.5, 0.0, 0.0,
        -0.5, 0.0, 0.0,
        // Upper step (back half, full height)
        -0.5, 0.0, 0.0, 0.5, 0.0, 0.0, 0.5, 0.5, 0.0, -0.5, 0.5, 0.0, -0.5, 0.0, -0.5, 0.5, 0.0, -0.5, 0.5, 0.5, -0.5,
        -0.5, 0.5, -0.5,
      ]);
      const indices = [
        // Lower step outline
        0, 1, 1, 2, 2, 3, 3, 0, 4, 5, 5, 6, 6, 7, 7, 4, 0, 4, 1, 5, 2, 6, 3, 7,
        // Upper step outline
        8, 9, 9, 10, 10, 11, 11, 8, 12, 13, 13, 14, 14, 15, 15, 12, 8, 12, 9, 13, 10, 14, 11, 15,
      ];
      geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      geo.setIndex(indices);
      return geo;
    }
    default:
      return new THREE.BoxGeometry(1, 1, 1);
  }
}

// ---------------------------------------------------------------------------
// Ghost Preview
// ---------------------------------------------------------------------------

export interface GhostPreviewSystem {
  /** Update the ghost position/shape. Pass null to hide. */
  update: (position: { x: number; y: number; z: number } | null, shape: PlaceableShape) => void;
  /** Update the target block highlight (red wireframe on the block being looked at). Pass null to hide. */
  updateTarget: (position: { x: number; y: number; z: number } | null) => void;
  /** Remove the ghost mesh from the scene and dispose resources */
  dispose: () => void;
}

/**
 * Create a ghost preview system that renders a semi-transparent wireframe
 * at the block placement position. The wireframe mesh is a child of the
 * provided scene and is updated each frame.
 */
export function createGhostPreview(scene: THREE.Scene): GhostPreviewSystem {
  let currentShape: PlaceableShape = 'cube';

  // --- Placement ghost (white wireframe) ---
  const material = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.5,
    depthTest: true,
    depthWrite: false,
  });

  let geometry: THREE.BufferGeometry = new THREE.EdgesGeometry(getShapeGeometry(currentShape));
  let mesh: THREE.LineSegments<THREE.BufferGeometry, THREE.LineBasicMaterial> = new THREE.LineSegments(
    geometry,
    material,
  );
  mesh.visible = false;
  mesh.renderOrder = 999; // Render on top
  scene.add(mesh);

  // --- Target block highlight (red wireframe on the block being looked at) ---
  const targetMaterial = new THREE.LineBasicMaterial({
    color: 0xff4444,
    transparent: true,
    opacity: 0.6,
    depthTest: true,
    depthWrite: false,
  });

  const targetGeometry: THREE.BufferGeometry = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.01, 1.01, 1.01));
  const targetMesh: THREE.LineSegments<THREE.BufferGeometry, THREE.LineBasicMaterial> = new THREE.LineSegments(
    targetGeometry,
    targetMaterial,
  );
  targetMesh.visible = false;
  targetMesh.renderOrder = 998;
  scene.add(targetMesh);

  function update(position: { x: number; y: number; z: number } | null, shape: PlaceableShape): void {
    if (!position) {
      mesh.visible = false;
      return;
    }

    // Rebuild geometry if shape changed
    if (shape !== currentShape) {
      currentShape = shape;
      geometry.dispose();

      // For ramp and stair we already have indexed line geometry — use directly
      if (shape === 'ramp' || shape === 'stair') {
        const lineGeo = getShapeGeometry(shape);
        scene.remove(mesh);
        mesh = new THREE.LineSegments(lineGeo, material);
        mesh.renderOrder = 999;
        scene.add(mesh);
        geometry = lineGeo;
      } else {
        geometry = new THREE.EdgesGeometry(getShapeGeometry(shape));
        scene.remove(mesh);
        mesh = new THREE.LineSegments(geometry, material);
        mesh.renderOrder = 999;
        scene.add(mesh);
      }
    }

    mesh.position.set(position.x, position.y, position.z);
    mesh.visible = true;
  }

  function updateTarget(position: { x: number; y: number; z: number } | null): void {
    if (!position) {
      targetMesh.visible = false;
      return;
    }
    targetMesh.position.set(position.x, position.y, position.z);
    targetMesh.visible = true;
  }

  function dispose(): void {
    scene.remove(mesh);
    geometry.dispose();
    material.dispose();

    scene.remove(targetMesh);
    targetGeometry.dispose();
    targetMaterial.dispose();
  }

  return { update, updateTarget, dispose };
}
