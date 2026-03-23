import { describe, expect, it } from 'vitest';
import { hitToVoxelCoord, placementFromHit } from './block-interaction';

describe('hitToVoxelCoord', () => {
  it('converts a hit on the +Y face of a block at (3, 5, 2) to the correct voxel', () => {
    // Hit the top of voxel at (3, 5, 2): hit point is (3.3, 6.0, 2.7), normal is (0, 1, 0)
    const result = hitToVoxelCoord(3.3, 6.0, 2.7, 0, 1, 0);
    expect(result).toEqual({ x: 3, y: 6, z: 3 });
  });

  it('converts a hit on the +X face to the correct voxel', () => {
    // Hit the +X face of voxel at (5, 3, 2). Voxel centers are at integers,
    // so the +X face of voxel 5 is at x=5.5. Stepping into the block by eps
    // gives 5.49, which rounds to voxel 5.
    const result = hitToVoxelCoord(5.5, 3.5, 2.5, 1, 0, 0);
    expect(result).toEqual({ x: 5, y: 4, z: 3 });
  });

  it('converts a hit on the -Z face to the correct voxel', () => {
    // Hit the front face of voxel at (2, 3, 4): hit at (2.5, 3.5, 3.5), normal (0, 0, -1)
    const result = hitToVoxelCoord(2.5, 3.5, 3.5, 0, 0, -1);
    // z: floor(3.5 - (-1)*0.01 + 0.5) = floor(3.5 + 0.01 + 0.5) = floor(4.01) = 4
    expect(result).toEqual({ x: 3, y: 4, z: 4 });
  });

  it('handles negative coordinates', () => {
    const result = hitToVoxelCoord(-3.5, 2.0, -1.5, 0, 1, 0);
    // y: floor(2.0 - 0.01 + 0.5) = floor(2.49) = 2
    // x: floor(-3.5 + 0.5) = floor(-3.0) = -3
    // z: floor(-1.5 + 0.5) = floor(-1.0) = -1
    expect(result).toEqual({ x: -3, y: 2, z: -1 });
  });
});

describe('placementFromHit', () => {
  it('places on top of a block (+Y normal)', () => {
    const result = placementFromHit(5, 3, 2, 0, 1, 0);
    expect(result).toEqual({ x: 5, y: 4, z: 2 });
  });

  it('places to the right of a block (+X normal)', () => {
    const result = placementFromHit(5, 3, 2, 1, 0, 0);
    expect(result).toEqual({ x: 6, y: 3, z: 2 });
  });

  it('places to the left of a block (-X normal)', () => {
    const result = placementFromHit(5, 3, 2, -1, 0, 0);
    expect(result).toEqual({ x: 4, y: 3, z: 2 });
  });

  it('places below a block (-Y normal)', () => {
    const result = placementFromHit(5, 3, 2, 0, -1, 0);
    expect(result).toEqual({ x: 5, y: 2, z: 2 });
  });

  it('places behind a block (+Z normal)', () => {
    const result = placementFromHit(5, 3, 2, 0, 0, 1);
    expect(result).toEqual({ x: 5, y: 3, z: 3 });
  });

  it('places in front of a block (-Z normal)', () => {
    const result = placementFromHit(5, 3, 2, 0, 0, -1);
    expect(result).toEqual({ x: 5, y: 3, z: 1 });
  });

  it('handles negative voxel coordinates', () => {
    const result = placementFromHit(-3, 0, -5, 0, 1, 0);
    expect(result).toEqual({ x: -3, y: 1, z: -5 });
  });
});
