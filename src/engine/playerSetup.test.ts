import { describe, expect, it } from 'vitest';
import { createPlayer } from './playerSetup';

describe('playerSetup module', () => {
  it('exports createPlayer as async function', () => {
    expect(typeof createPlayer).toBe('function');
  });
});
