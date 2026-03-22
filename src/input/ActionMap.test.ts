import { describe, expect, it } from 'vitest';
import { ActionMap } from './index';

describe('ActionMap', () => {
  it('maps keyboard key to action', () => {
    const map = new ActionMap();
    map.bindKey('KeyW', 'moveForward');
    expect(map.getAction('KeyW')).toBe('moveForward');
  });

  it('returns undefined for unbound keys', () => {
    const map = new ActionMap();
    expect(map.getAction('KeyZ')).toBeUndefined();
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

  it('reset clears all active keys', () => {
    const map = new ActionMap();
    map.bindKey('KeyW', 'moveForward');
    map.bindKey('KeyS', 'moveBack');
    map.setKeyDown('KeyW');
    map.setKeyDown('KeyS');
    expect(map.isActive('moveForward')).toBe(true);
    expect(map.isActive('moveBack')).toBe(true);

    map.reset();
    expect(map.isActive('moveForward')).toBe(false);
    expect(map.isActive('moveBack')).toBe(false);
  });

  it('rebinding a key overwrites the previous action', () => {
    const map = new ActionMap();
    map.bindKey('KeyW', 'moveForward');
    map.bindKey('KeyW', 'jump');
    expect(map.getAction('KeyW')).toBe('jump');
  });

  it('provides default desktop bindings for all movement actions', () => {
    const map = ActionMap.desktopDefaults();
    expect(map.getAction('KeyW')).toBe('moveForward');
    expect(map.getAction('KeyS')).toBe('moveBack');
    expect(map.getAction('KeyA')).toBe('moveLeft');
    expect(map.getAction('KeyD')).toBe('moveRight');
  });

  it('provides default desktop bindings for combat actions', () => {
    const map = ActionMap.desktopDefaults();
    expect(map.getAction('KeyQ')).toBe('dodge');
    expect(map.getAction('Space')).toBe('jump');
    expect(map.getAction('ShiftLeft')).toBe('sprint');
  });

  it('provides default desktop bindings for interaction actions', () => {
    const map = ActionMap.desktopDefaults();
    expect(map.getAction('KeyE')).toBe('interact');
    expect(map.getAction('Tab')).toBe('tome');
    expect(map.getAction('Escape')).toBe('pause');
  });

  it('provides default desktop bindings for hotbar slots', () => {
    const map = ActionMap.desktopDefaults();
    expect(map.getAction('Digit1')).toBe('hotbar1');
    expect(map.getAction('Digit2')).toBe('hotbar2');
    expect(map.getAction('Digit3')).toBe('hotbar3');
    expect(map.getAction('Digit4')).toBe('hotbar4');
    expect(map.getAction('Digit5')).toBe('hotbar5');
  });

  it('desktopDefaults covers all 15 bound keys', () => {
    const map = ActionMap.desktopDefaults();
    const expectedBindings: Array<[string, string]> = [
      ['KeyW', 'moveForward'],
      ['KeyS', 'moveBack'],
      ['KeyA', 'moveLeft'],
      ['KeyD', 'moveRight'],
      ['Space', 'jump'],
      ['KeyQ', 'dodge'],
      ['ShiftLeft', 'sprint'],
      ['KeyE', 'interact'],
      ['Tab', 'tome'],
      ['Escape', 'pause'],
      ['Digit1', 'hotbar1'],
      ['Digit2', 'hotbar2'],
      ['Digit3', 'hotbar3'],
      ['Digit4', 'hotbar4'],
      ['Digit5', 'hotbar5'],
    ];
    for (const [key, action] of expectedBindings) {
      expect(map.getAction(key)).toBe(action);
    }
  });

  it('multiple keys can be down simultaneously', () => {
    const map = ActionMap.desktopDefaults();
    map.setKeyDown('KeyW');
    map.setKeyDown('KeyA');
    map.setKeyDown('ShiftLeft');
    expect(map.isActive('moveForward')).toBe(true);
    expect(map.isActive('moveLeft')).toBe(true);
    expect(map.isActive('sprint')).toBe(true);
    expect(map.isActive('moveRight')).toBe(false);
  });
});
