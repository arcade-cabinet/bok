import { describe, expect, it } from 'vitest';
import { APP_NAME, APP_VERSION } from './version';

describe('version', () => {
  it('APP_VERSION matches semver pattern', () => {
    expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('APP_NAME is defined and non-empty', () => {
    expect(APP_NAME).toBeTruthy();
    expect(typeof APP_NAME).toBe('string');
    expect(APP_NAME.length).toBeGreaterThan(0);
  });

  it('APP_VERSION matches package.json version', () => {
    // Ensures the constant stays in sync with the package
    expect(APP_VERSION).toBe('0.2.0');
  });
});
