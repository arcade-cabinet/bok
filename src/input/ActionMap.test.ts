import { describe, it, expect } from 'vitest';
import { ActionMap, type GameAction } from './index';

describe('ActionMap', () => {
  it('maps keyboard key to action', () => {
    const map = new ActionMap();
    map.bindKey('KeyW', 'moveForward');
    expect(map.getAction('KeyW')).toBe('moveForward');
  });

  it('reports active actions from pressed keys', () => {
    const map = new ActionMap();
    map.bindKey('KeyW', 'moveForward');
    map.bindKey('ShiftLeft', 'sprint');
    map.setKeyDown('KeyW');
    map.setKeyDown('ShiftLeft');
    expect(map.isActive('moveForward')).toBe(true);
    expect(map.isActive('sprint')).toBe(true);
    expect(map.isActive('dodge')).toBe(false);
  });

  it('clears key state on key up', () => {
    const map = new ActionMap();
    map.bindKey('KeyW', 'moveForward');
    map.setKeyDown('KeyW');
    expect(map.isActive('moveForward')).toBe(true);
    map.setKeyUp('KeyW');
    expect(map.isActive('moveForward')).toBe(false);
  });

  it('provides default desktop bindings', () => {
    const map = ActionMap.desktopDefaults();
    expect(map.getAction('KeyW')).toBe('moveForward');
    expect(map.getAction('Space')).toBe('dodge');
    expect(map.getAction('KeyE')).toBe('interact');
  });
});
