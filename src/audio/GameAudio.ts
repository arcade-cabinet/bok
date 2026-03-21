/**
 * Procedural game audio via Tone.js.
 * No external audio files — generates tones/noise for SFX.
 * Tone.start() must be called on a user gesture before any audio plays.
 */

import * as Tone from 'tone';

const masterVolume = new Tone.Volume(-10).toDestination();

/** Sword swing — noise burst with short envelope + bandpass filter */
export function playSwordSwing(): void {
  const filter = new Tone.Filter({
    type: 'bandpass',
    frequency: 600,
    Q: 2,
  }).connect(masterVolume);

  const synth = new Tone.NoiseSynth({
    noise: { type: 'white' },
    envelope: {
      attack: 0.005,
      decay: 0.1,
      sustain: 0,
      release: 0.01,
    },
  }).connect(filter);

  synth.triggerAttackRelease('0.1');

  // Cleanup after sound finishes
  setTimeout(() => {
    synth.dispose();
    filter.dispose();
  }, 300);
}

/** Enemy hit impact — low membrane thud */
export function playHitImpact(): void {
  const synth = new Tone.MembraneSynth({
    pitchDecay: 0.05,
    octaves: 4,
    envelope: {
      attack: 0.001,
      decay: 0.1,
      sustain: 0,
      release: 0.05,
    },
  }).connect(masterVolume);

  synth.triggerAttackRelease('C1', '0.1');

  setTimeout(() => {
    synth.dispose();
  }, 300);
}

/** Player takes damage — pitch bend down */
export function playPlayerHurt(): void {
  const synth = new Tone.Synth({
    oscillator: { type: 'sine' },
    envelope: {
      attack: 0.01,
      decay: 0.2,
      sustain: 0,
      release: 0.05,
    },
  }).connect(masterVolume);

  synth.triggerAttackRelease('E3', '0.25');
  synth.frequency.rampTo('C2', 0.2);

  setTimeout(() => {
    synth.dispose();
  }, 500);
}

/** Enemy death — ascending burst */
export function playEnemyDeath(): void {
  const synth = new Tone.Synth({
    oscillator: { type: 'triangle' },
    envelope: {
      attack: 0.01,
      decay: 0.15,
      sustain: 0,
      release: 0.05,
    },
  }).connect(masterVolume);

  synth.triggerAttackRelease('G4', '0.2');
  synth.frequency.rampTo('G6', 0.15);

  setTimeout(() => {
    synth.dispose();
  }, 400);
}

/** Boss phase transition — deep FM rumble + rising tone */
export function playBossPhase(): void {
  const synth = new Tone.FMSynth({
    harmonicity: 1.5,
    modulationIndex: 10,
    oscillator: { type: 'sine' },
    modulation: { type: 'sine' },
    envelope: {
      attack: 0.01,
      decay: 0.4,
      sustain: 0,
      release: 0.1,
    },
    modulationEnvelope: {
      attack: 0.01,
      decay: 0.3,
      sustain: 0,
      release: 0.1,
    },
  }).connect(masterVolume);

  synth.triggerAttackRelease('C1', '0.5');
  synth.frequency.rampTo('C4', 0.4);

  setTimeout(() => {
    synth.dispose();
  }, 700);
}

/** Victory fanfare — major chord arpeggio C5-E5-G5-C6 */
export function playVictory(): void {
  const synth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'triangle' },
    envelope: {
      attack: 0.02,
      decay: 0.3,
      sustain: 0,
      release: 0.1,
    },
  }).connect(masterVolume);

  const now = Tone.now();
  synth.triggerAttackRelease('C5', '0.4', now);
  synth.triggerAttackRelease('E5', '0.4', now + 0.12);
  synth.triggerAttackRelease('G5', '0.4', now + 0.24);
  synth.triggerAttackRelease('C6', '0.4', now + 0.36);

  setTimeout(() => {
    synth.dispose();
  }, 1200);
}

/** Ambient wind — noise through auto-filter, looped */
let ambientNoise: Tone.Noise | null = null;
let ambientFilter: Tone.AutoFilter | null = null;
let ambientGain: Tone.Gain | null = null;

export function startAmbient(): void {
  if (ambientNoise) return;

  ambientGain = new Tone.Gain(0.06).connect(masterVolume);

  ambientFilter = new Tone.AutoFilter({
    frequency: 0.2,
    baseFrequency: 200,
    octaves: 2.5,
    type: 'sine',
  })
    .connect(ambientGain)
    .start();

  ambientNoise = new Tone.Noise('pink').connect(ambientFilter);
  ambientNoise.start();
}

export function stopAmbient(): void {
  if (ambientNoise) {
    ambientNoise.stop();
    ambientNoise.dispose();
    ambientNoise = null;
  }
  if (ambientFilter) {
    ambientFilter.stop();
    ambientFilter.dispose();
    ambientFilter = null;
  }
  if (ambientGain) {
    ambientGain.dispose();
    ambientGain = null;
  }
}
