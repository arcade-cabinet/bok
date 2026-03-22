import { describe, expect, it } from 'vitest';

/**
 * ScreenReaderAnnouncer uses React hooks (useState, useEffect, useRef, useCallback)
 * so it cannot be invoked directly as a function in Node tests.
 *
 * These tests verify the module's contract: exports, types, and structure.
 * Full rendering/interaction tests belong in browser tests.
 */
describe('ScreenReaderAnnouncer', () => {
  it('exports a named function component', async () => {
    const mod = await import('./ScreenReaderAnnouncer');
    expect(typeof mod.ScreenReaderAnnouncer).toBe('function');
    expect(mod.ScreenReaderAnnouncer.name).toBe('ScreenReaderAnnouncer');
  });

  it('function accepts engineState and onSubscribe props', async () => {
    const mod = await import('./ScreenReaderAnnouncer');
    // Function signature: (props: Props) => JSX.Element
    // Props has engineState: EngineState | null and onSubscribe?: (handler) => void
    expect(mod.ScreenReaderAnnouncer.length).toBe(1); // single props arg
  });

  it('module does not export default (named export only)', async () => {
    const mod = await import('./ScreenReaderAnnouncer');
    expect((mod as Record<string, unknown>).default).toBeUndefined();
    expect(mod.ScreenReaderAnnouncer).toBeDefined();
  });

  it('component is not a class component', async () => {
    const mod = await import('./ScreenReaderAnnouncer');
    // Function components don't have a prototype with render()
    expect(mod.ScreenReaderAnnouncer.prototype?.render).toBeUndefined();
  });
});
