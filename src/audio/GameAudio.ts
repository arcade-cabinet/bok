/**
 * Procedural game audio via Web Audio API.
 * No external audio files — generates tones/noise for SFX.
 */

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;

function ensureCtx(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.3;
    masterGain.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function getMaster(): GainNode {
  ensureCtx();
  return masterGain!;
}

/** Short attack swing sound — descending pitch whoosh */
export function playSwordSwing(): void {
  const c = ensureCtx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(400, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(150, c.currentTime + 0.1);
  gain.gain.setValueAtTime(0.15, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.12);
  osc.connect(gain);
  gain.connect(getMaster());
  osc.start(c.currentTime);
  osc.stop(c.currentTime + 0.12);
}

/** Enemy hit impact — short thud */
export function playHitImpact(): void {
  const c = ensureCtx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(120, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(60, c.currentTime + 0.08);
  gain.gain.setValueAtTime(0.2, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.1);
  osc.connect(gain);
  gain.connect(getMaster());
  osc.start(c.currentTime);
  osc.stop(c.currentTime + 0.1);
}

/** Player takes damage — low rumble */
export function playPlayerHurt(): void {
  const c = ensureCtx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(80, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(40, c.currentTime + 0.2);
  gain.gain.setValueAtTime(0.25, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.25);
  osc.connect(gain);
  gain.connect(getMaster());
  osc.start(c.currentTime);
  osc.stop(c.currentTime + 0.25);
}

/** Enemy death — ascending burst */
export function playEnemyDeath(): void {
  const c = ensureCtx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(200, c.currentTime);
  osc.frequency.exponentialRampToValueAtTime(800, c.currentTime + 0.15);
  gain.gain.setValueAtTime(0.2, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.2);
  osc.connect(gain);
  gain.connect(getMaster());
  osc.start(c.currentTime);
  osc.stop(c.currentTime + 0.2);
}

/** Boss phase transition — deep rumble + rising tone */
export function playBossPhase(): void {
  const c = ensureCtx();
  // Rumble
  const osc1 = c.createOscillator();
  const gain1 = c.createGain();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(50, c.currentTime);
  gain1.gain.setValueAtTime(0.3, c.currentTime);
  gain1.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.5);
  osc1.connect(gain1);
  gain1.connect(getMaster());
  osc1.start(c.currentTime);
  osc1.stop(c.currentTime + 0.5);
  // Rising tone
  const osc2 = c.createOscillator();
  const gain2 = c.createGain();
  osc2.type = 'sawtooth';
  osc2.frequency.setValueAtTime(100, c.currentTime);
  osc2.frequency.exponentialRampToValueAtTime(600, c.currentTime + 0.4);
  gain2.gain.setValueAtTime(0.1, c.currentTime);
  gain2.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.45);
  osc2.connect(gain2);
  gain2.connect(getMaster());
  osc2.start(c.currentTime);
  osc2.stop(c.currentTime + 0.45);
}

/** Victory fanfare — major chord arpeggio */
export function playVictory(): void {
  const c = ensureCtx();
  const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
  notes.forEach((freq, i) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    const startTime = c.currentTime + i * 0.12;
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.15, startTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);
    osc.connect(gain);
    gain.connect(getMaster());
    osc.start(startTime);
    osc.stop(startTime + 0.4);
  });
}

/** Ambient forest loop — white noise filtered to sound like wind */
let ambientNode: AudioBufferSourceNode | null = null;

export function startAmbient(): void {
  const c = ensureCtx();
  if (ambientNode) return;

  // Generate white noise buffer
  const bufferSize = c.sampleRate * 2; // 2 seconds, looped
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.3;
  }

  ambientNode = c.createBufferSource();
  ambientNode.buffer = buffer;
  ambientNode.loop = true;

  // Bandpass filter to make it sound like wind
  const filter = c.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 400;
  filter.Q.value = 0.5;

  const gain = c.createGain();
  gain.gain.value = 0.04; // Very quiet background

  ambientNode.connect(filter);
  filter.connect(gain);
  gain.connect(getMaster());
  ambientNode.start();
}

export function stopAmbient(): void {
  if (ambientNode) {
    ambientNode.stop();
    ambientNode = null;
  }
}
