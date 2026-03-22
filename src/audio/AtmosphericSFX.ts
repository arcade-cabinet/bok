/**
 * @module audio/AtmosphericSFX
 * @role Play random atmospheric sound effects for immersion
 * @input Start/stop, context (combat, explore)
 */
import * as Tone from 'tone';

const SFX_POOL = [
  '/assets/audio/sfx/stalker.ogg',
  '/assets/audio/sfx/shadow.ogg',
  '/assets/audio/sfx/phantom.ogg',
  '/assets/audio/sfx/presence-behind.ogg',
  '/assets/audio/sfx/alien-remarks-1.ogg',
  '/assets/audio/sfx/alien-remarks-2.ogg',
  '/assets/audio/sfx/alien-remarks-3.ogg',
];

const UNDERWATER_SFX = '/assets/audio/sfx/underwater-world.ogg';

let intervalId: ReturnType<typeof setInterval> | null = null;
let sfxGain: Tone.Gain | null = null;

/**
 * Start playing random atmospheric SFX at intervals.
 * Plays a random eerie sound every 15-40 seconds.
 */
export function startAtmosphericSFX(): void {
  if (intervalId) return;

  sfxGain = new Tone.Gain(0.08).toDestination();

  const playRandom = () => {
    const url = SFX_POOL[Math.floor(Math.random() * SFX_POOL.length)];
    const player = new Tone.Player({
      url,
      autostart: false,
      onload: () => {
        if (sfxGain) {
          player.connect(sfxGain);
          player.start();
          // Cleanup after playback
          player.onstop = () => {
            player.dispose();
          };
        }
      },
    });
  };

  // First play after 10-20 seconds
  setTimeout(playRandom, 10000 + Math.random() * 10000);

  // Then every 15-40 seconds
  intervalId = setInterval(
    () => {
      playRandom();
    },
    15000 + Math.random() * 25000,
  );
}

/**
 * Stop atmospheric SFX.
 */
export function stopAtmosphericSFX(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  if (sfxGain) {
    sfxGain.gain.rampTo(0, 0.5);
    setTimeout(() => {
      sfxGain?.dispose();
      sfxGain = null;
    }, 600);
  }
}

/**
 * Play the underwater ambient effect (for ocean biome).
 */
export function playUnderwaterAmbient(): Tone.Player | null {
  const gain = new Tone.Gain(0.1).toDestination();
  const player = new Tone.Player({
    url: UNDERWATER_SFX,
    loop: true,
    autostart: false,
    onload: () => {
      player.connect(gain);
      player.start();
    },
  });
  return player;
}
