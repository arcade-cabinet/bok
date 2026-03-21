import { describe, expect, it } from 'vitest';
import { PRNG } from './noise';

describe('PRNG', () => {
  it('produces deterministic sequence from same seed', () => {
    const a = new PRNG('test-seed');
    const b = new PRNG('test-seed');
    const seqA = Array.from({ length: 100 }, () => a.next());
    const seqB = Array.from({ length: 100 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('produces different sequences from different seeds', () => {
    const a = new PRNG('seed-alpha');
    const b = new PRNG('seed-beta');
    const seqA = Array.from({ length: 20 }, () => a.next());
    const seqB = Array.from({ length: 20 }, () => b.next());
    expect(seqA).not.toEqual(seqB);
  });

  it('returns values in [0, 1) range', () => {
    const rng = new PRNG('range-check');
    for (let i = 0; i < 1000; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('fork produces independent but deterministic sub-PRNGs', () => {
    const master1 = new PRNG('master');
    const master2 = new PRNG('master');
    const fork1a = master1.fork('terrain');
    const fork2a = master2.fork('terrain');
    const seq1 = Array.from({ length: 50 }, () => fork1a.next());
    const seq2 = Array.from({ length: 50 }, () => fork2a.next());
    expect(seq1).toEqual(seq2);

    // Different fork name produces different sequence
    const fork1b = new PRNG('master').fork('enemies');
    expect(Array.from({ length: 20 }, () => fork1b.next())).not.toEqual(
      Array.from({ length: 20 }, () => new PRNG('master').fork('terrain').next()),
    );
  });

  it('nextInt returns integers in [min, max] range', () => {
    const rng = new PRNG('int-test');
    for (let i = 0; i < 500; i++) {
      const v = rng.nextInt(3, 10);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(10);
      expect(Number.isInteger(v)).toBe(true);
    }
  });

  it('nextFloat returns floats in [min, max) range', () => {
    const rng = new PRNG('float-test');
    for (let i = 0; i < 500; i++) {
      const v = rng.nextFloat(2.0, 5.0);
      expect(v).toBeGreaterThanOrEqual(2.0);
      expect(v).toBeLessThan(5.0);
    }
  });
});
