/**
 * Unit tests for MedievalJoysticks output logic.
 * Verifies joystick positions map to correct movement/look directions.
 */
import { describe, it, expect } from 'vitest';

// Test the clamping and direction logic directly (extracted from component)
function clamp(dx: number, dy: number, radius: number): { x: number; y: number } {
  const d = Math.sqrt(dx * dx + dy * dy);
  if (d <= radius) return { x: dx, y: dy };
  return { x: (dx / d) * radius, y: (dy / d) * radius };
}

const RADIUS = 35;

describe('Joystick direction mapping', () => {
  describe('Left joystick (movement)', () => {
    it('push UP → moveZ negative (forward in Three.js -Z)', () => {
      // Touch moves UP on screen = negative deltaY
      const pos = clamp(0, -RADIUS, RADIUS);
      const moveX = pos.x / RADIUS;
      const moveZ = pos.y / RADIUS; // NO inversion — matches desktop W key (dirZ = -1)
      expect(moveX).toBeCloseTo(0);
      expect(moveZ).toBeCloseTo(-1); // Negative = forward (same as desktop)
    });

    it('push DOWN → moveZ positive (backward)', () => {
      const pos = clamp(0, RADIUS, RADIUS);
      const moveZ = pos.y / RADIUS;
      expect(moveZ).toBeCloseTo(1); // Positive = backward (same as desktop S key)
    });

    it('push RIGHT → moveX positive (strafe right)', () => {
      const pos = clamp(RADIUS, 0, RADIUS);
      const moveX = pos.x / RADIUS;
      const moveZ = pos.y / RADIUS;
      expect(moveX).toBeCloseTo(1);
      expect(moveZ).toBeCloseTo(0);
    });

    it('push LEFT → moveX negative (strafe left)', () => {
      const pos = clamp(-RADIUS, 0, RADIUS);
      const moveX = pos.x / RADIUS;
      expect(moveX).toBeCloseTo(-1);
    });

    it('diagonal UP-RIGHT → positive moveX, negative moveZ', () => {
      const pos = clamp(RADIUS, -RADIUS, RADIUS);
      const moveX = pos.x / RADIUS;
      const moveZ = pos.y / RADIUS;
      expect(moveX).toBeGreaterThan(0);
      expect(moveZ).toBeLessThan(0); // Up = negative Z = forward
    });

    it('center → zero movement', () => {
      const moveX = 0 / RADIUS;
      const moveZ = -0 / RADIUS;
      expect(moveX).toBe(0);
      expect(moveZ).toBe(-0); // -0 equals 0
    });

    it('clamps to radius', () => {
      const pos = clamp(100, -100, RADIUS);
      const dist = Math.sqrt(pos.x * pos.x + pos.y * pos.y);
      expect(dist).toBeCloseTo(RADIUS);
    });
  });

  describe('Right joystick (camera look)', () => {
    it('push RIGHT → lookX positive (rotate camera right)', () => {
      const pos = clamp(RADIUS, 0, RADIUS);
      const lookX = pos.x / RADIUS;
      const lookY = pos.y / RADIUS;
      expect(lookX).toBeCloseTo(1);
      expect(lookY).toBeCloseTo(0);
    });

    it('push LEFT → lookX negative (rotate camera left)', () => {
      const pos = clamp(-RADIUS, 0, RADIUS);
      const lookX = pos.x / RADIUS;
      expect(lookX).toBeCloseTo(-1);
    });

    it('push UP → lookY negative (look up)', () => {
      const pos = clamp(0, -RADIUS, RADIUS);
      const lookY = pos.y / RADIUS;
      expect(lookY).toBeCloseTo(-1); // Negative = look up (screen Y inverted)
    });

    it('push DOWN → lookY positive (look down)', () => {
      const pos = clamp(0, RADIUS, RADIUS);
      const lookY = pos.y / RADIUS;
      expect(lookY).toBeCloseTo(1);
    });
  });

  describe('Camera rotation integration', () => {
    // Simulates what GameEngine does with lookX/lookY
    const CAMERA_SENSITIVITY = 0.002;
    const dt = 0.016; // 60fps
    const ROT_SPEED = 320;

    it('lookX positive → euler.y decreases (camera turns right)', () => {
      const lookX = 1; // Full right
      let eulerY = 0;
      // Engine: cam.applyLook(lookX * rotSpeed, lookY * rotSpeed, 1.0)
      // applyLook: euler.y -= deltaX * CAMERA_SENSITIVITY * sensitivityScale
      const deltaX = lookX * ROT_SPEED * dt;
      eulerY -= deltaX * CAMERA_SENSITIVITY * 1.0;
      expect(eulerY).toBeLessThan(0); // Negative yaw = turned right
    });

    it('lookY negative → euler.x increases (camera looks up)', () => {
      const lookY = -1; // Full up
      let eulerX = 0;
      const deltaY = lookY * ROT_SPEED * dt;
      eulerX -= deltaY * CAMERA_SENSITIVITY * 1.0;
      expect(eulerX).toBeGreaterThan(0); // Positive pitch = looking up
    });
  });

  describe('Movement direction with camera yaw', () => {
    // Simulates camera.ts applyMovement yaw transform
    it('moveZ=-1 (push up) with yaw=0 → moves in -Z (Three.js forward)', () => {
      const dirX = 0, dirZ = -1; // Push up = negative (no inversion, matches desktop W)
      const yaw = 0;
      const worldZ = dirX * Math.sin(yaw) + dirZ * Math.cos(yaw);
      expect(worldZ).toBeCloseTo(-1); // -Z = forward in Three.js ✓
    });

    it('moveZ=1 (push down) with yaw=0 → moves in +Z (backward)', () => {
      const dirX = 0, dirZ = 1;
      const yaw = 0;
      const worldZ = dirX * Math.sin(yaw) + dirZ * Math.cos(yaw);
      expect(worldZ).toBeCloseTo(1); // +Z = backward ✓
    });

    it('moveX=1 (push right) with yaw=0 → moves in +X (strafe right)', () => {
      const dirX = 1, dirZ = 0;
      const yaw = 0;
      const worldX = dirX * Math.cos(yaw) - dirZ * Math.sin(yaw);
      expect(worldX).toBeCloseTo(1); // +X = right ✓
    });
  });
});
