import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Shared listener mock so updateListenerPosition test can inspect values
const listenerMock = {
  positionX: { value: 0 },
  positionY: { value: 0 },
  positionZ: { value: 0 },
  forwardX: { value: 0 },
  forwardY: { value: 0 },
  forwardZ: { value: -1 },
};

// Mock Tone.js before importing the module under test
vi.mock('tone', () => {
  class MockPanner3D {
    positionX = { value: 0 };
    positionY = { value: 0 };
    positionZ = { value: 0 };
    toDestination() {
      return this;
    }
    dispose() {}
  }

  class MockPlayer {
    onstop: (() => void) | null = null;
    connect() {}
    start() {}
    stop() {}
    dispose() {}
  }

  return {
    Panner3D: MockPanner3D,
    Player: MockPlayer,
    getListener: () => listenerMock,
  };
});

import {
  getActiveSpatialSoundCount,
  playSpatialSound,
  stopAllSpatialSounds,
  stopSpatialSound,
  updateListenerPosition,
  updateSoundPosition,
} from './SpatialAudio.ts';

describe('SpatialAudio', () => {
  beforeEach(() => {
    stopAllSpatialSounds();
    // Reset listener mock between tests
    listenerMock.positionX.value = 0;
    listenerMock.positionY.value = 0;
    listenerMock.positionZ.value = 0;
    listenerMock.forwardX.value = 0;
    listenerMock.forwardY.value = 0;
    listenerMock.forwardZ.value = -1;
  });

  afterEach(() => {
    stopAllSpatialSounds();
  });

  describe('playSpatialSound', () => {
    it('adds a sound to the active sounds map', () => {
      playSpatialSound('test-1', '/audio/test.ogg', 5, 0, 10);
      expect(getActiveSpatialSoundCount()).toBe(1);
    });

    it('replaces existing sound with the same ID', () => {
      playSpatialSound('test-1', '/audio/test.ogg', 5, 0, 10);
      playSpatialSound('test-1', '/audio/test2.ogg', 2, 0, 3);
      expect(getActiveSpatialSoundCount()).toBe(1);
    });

    it('supports multiple concurrent sounds with different IDs', () => {
      playSpatialSound('a', '/audio/a.ogg', 0, 0, 0);
      playSpatialSound('b', '/audio/b.ogg', 1, 0, 1);
      playSpatialSound('c', '/audio/c.ogg', 2, 0, 2);
      expect(getActiveSpatialSoundCount()).toBe(3);
    });
  });

  describe('stopSpatialSound', () => {
    it('removes a sound from active sounds', () => {
      playSpatialSound('test-1', '/audio/test.ogg', 0, 0, 0);
      expect(getActiveSpatialSoundCount()).toBe(1);
      stopSpatialSound('test-1');
      expect(getActiveSpatialSoundCount()).toBe(0);
    });

    it('is a no-op for unknown IDs', () => {
      playSpatialSound('test-1', '/audio/test.ogg', 0, 0, 0);
      stopSpatialSound('nonexistent');
      expect(getActiveSpatialSoundCount()).toBe(1);
    });
  });

  describe('stopAllSpatialSounds', () => {
    it('clears all active sounds', () => {
      playSpatialSound('a', '/audio/a.ogg', 0, 0, 0);
      playSpatialSound('b', '/audio/b.ogg', 1, 0, 1);
      playSpatialSound('c', '/audio/c.ogg', 2, 0, 2);
      expect(getActiveSpatialSoundCount()).toBe(3);
      stopAllSpatialSounds();
      expect(getActiveSpatialSoundCount()).toBe(0);
    });

    it('is safe to call when no sounds are active', () => {
      stopAllSpatialSounds();
      expect(getActiveSpatialSoundCount()).toBe(0);
    });
  });

  describe('getActiveSpatialSoundCount', () => {
    it('returns 0 when no sounds are active', () => {
      expect(getActiveSpatialSoundCount()).toBe(0);
    });

    it('returns correct count after adding and removing sounds', () => {
      playSpatialSound('a', '/audio/a.ogg', 0, 0, 0);
      playSpatialSound('b', '/audio/b.ogg', 1, 0, 1);
      expect(getActiveSpatialSoundCount()).toBe(2);
      stopSpatialSound('a');
      expect(getActiveSpatialSoundCount()).toBe(1);
      stopSpatialSound('b');
      expect(getActiveSpatialSoundCount()).toBe(0);
    });
  });

  describe('updateSoundPosition', () => {
    it('does not throw for unknown IDs', () => {
      expect(() => updateSoundPosition('nonexistent', 1, 2, 3)).not.toThrow();
    });

    it('updates panner position values for an active sound', () => {
      playSpatialSound('mov', '/audio/mov.ogg', 0, 0, 0);
      // Calling updateSoundPosition should not throw
      updateSoundPosition('mov', 5, 10, 15);
    });
  });

  describe('updateListenerPosition', () => {
    it('sets listener position and forward direction', () => {
      updateListenerPosition(10, 5, 20, 0.7, 0.7);
      expect(listenerMock.positionX.value).toBe(10);
      expect(listenerMock.positionY.value).toBe(5);
      expect(listenerMock.positionZ.value).toBe(20);
      expect(listenerMock.forwardX.value).toBe(0.7);
      expect(listenerMock.forwardY.value).toBe(0);
      expect(listenerMock.forwardZ.value).toBe(0.7);
    });
  });
});
