import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import type { GameMode } from '../../app/App';
import { TomePageBrowser } from '../../components/modals/TomePageBrowser';
import { TOME_PAGE_CATALOG } from '../../content/tomePages';
import type { GameSave } from '../../persistence/GameSave';
import { APP_VERSION } from '../../shared/version';

function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frameId: number;
    let time = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      const { width: w, height: h } = canvas;
      // Aged parchment gradient
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, '#1a120c');
      bg.addColorStop(0.4, '#2d1f17');
      bg.addColorStop(0.7, '#3a2820');
      bg.addColorStop(1, '#1f1611');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // Paper texture stains
      ctx.globalAlpha = 0.04;
      for (let i = 0; i < 60; i++) {
        const x = (Math.sin(i * 13.7) * 0.5 + 0.5) * w;
        const y = (Math.cos(i * 17.3) * 0.5 + 0.5) * h;
        const size = 40 + Math.random() * 100;
        const g = ctx.createRadialGradient(x, y, 0, x, y, size);
        g.addColorStop(0, '#6b5444');
        g.addColorStop(1, 'transparent');
        ctx.fillStyle = g;
        ctx.fillRect(x - size, y - size, size * 2, size * 2);
      }
      ctx.globalAlpha = 1;

      // Faint ruled lines
      ctx.globalAlpha = 0.06;
      ctx.strokeStyle = '#8b7355';
      for (let i = 0; i < h / 40; i++) {
        const y = i * 40 + ((time * 0.03) % 40);
        ctx.beginPath();
        ctx.moveTo(60, y);
        for (let x = 60; x < w - 30; x += 12) {
          ctx.lineTo(x, y + Math.sin(x * 0.015 + time * 0.001 + i * 0.5) * 1.2);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // Floating dust motes
      for (let i = 0; i < 30; i++) {
        const x = (Math.sin(time * 0.0003 + i * 0.7) * 0.4 + 0.5) * w;
        const y = ((time * 0.012 + i * 60) % (h + 80)) - 40;
        const size = Math.sin(time * 0.004 + i) * 1.5 + 2;
        ctx.globalAlpha = Math.sin(time * 0.003 + i * 1.3) * 0.2 + 0.25;
        ctx.fillStyle = i % 3 === 0 ? '#d4c5a0' : '#8b7355';
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Vignette
      const vig = ctx.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, h * 0.8);
      vig.addColorStop(0, 'transparent');
      vig.addColorStop(1, 'rgba(0,0,0,0.4)');
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, w, h);

      time++;
      frameId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(frameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 w-full h-full" />;
}

/** Format a timestamp as a short relative or absolute date */
function formatDate(ts: number): string {
  const now = Date.now();
  const diffMs = now - ts;
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(ts).toLocaleDateString();
}

type Panel = 'main' | 'new-game' | 'saves';

interface Props {
  onStartGame: (seed: string, mode: GameMode) => void;
  onContinueGame: (save: GameSave) => void;
  onDeleteGame: (id: number) => void;
  saves: GameSave[];
  /** Tome page ability IDs the player has unlocked. */
  unlockedPages?: string[];
}

export function MainMenuView({ onStartGame, onContinueGame, onDeleteGame, saves, unlockedPages = [] }: Props) {
  const [panel, setPanel] = useState<Panel>('main');
  const [showTome, setShowTome] = useState(false);
  const [seed, setSeed] = useState('Brave Dark Fox');
  const [selectedMode, setSelectedMode] = useState<'creative' | 'survival'>('survival');
  const prefersReducedMotion = useReducedMotion();
  const newGameButtonRef = useRef<HTMLButtonElement>(null);
  const backButtonRef = useRef<HTMLButtonElement>(null);

  // Focus management
  useEffect(() => {
    if (panel === 'new-game' || panel === 'saves') {
      backButtonRef.current?.focus();
    } else {
      newGameButtonRef.current?.focus();
    }
  }, [panel]);

  const handleBegin = () => {
    onStartGame(seed, selectedMode);
  };

  const randomSeed = () => {
    const adj = ['Brave', 'Dark', 'Swift', 'Ancient', 'Crystal', 'Shadow', 'Iron', 'Golden'];
    const noun = ['Fox', 'Wolf', 'Oak', 'Storm', 'Raven', 'Stone', 'Flame', 'Moon'];
    const a1 = adj[Math.floor(Math.random() * adj.length)];
    const a2 = adj[Math.floor(Math.random() * adj.length)];
    const n = noun[Math.floor(Math.random() * noun.length)];
    setSeed(`${a1} ${a2} ${n}`);
  };

  const menuItem = (i: number) => ({
    hidden: { opacity: 0, y: prefersReducedMotion ? 0 : 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        delay: prefersReducedMotion ? 0 : i * 0.1,
        duration: prefersReducedMotion ? 0 : 0.6,
        ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
      },
    },
  });

  const hasSaves = saves.length > 0;

  return (
    <section className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden" aria-label="Main menu">
      <AnimatedBackground />

      {/* Corner decorations */}
      {['top-4 left-4', 'top-4 right-4 rotate-90', 'bottom-4 left-4 -rotate-90', 'bottom-4 right-4 rotate-180'].map(
        (pos) => (
          <div key={pos} className={`fixed ${pos} opacity-30 pointer-events-none`}>
            <svg width="50" height="50" viewBox="0 0 60 60" fill="none">
              <title>Decorative corner flourish</title>
              <path
                d="M2 2 L2 25 Q2 2 25 2 L2 2 M5 5 L5 20 Q5 5 20 5 L5 5"
                stroke="#c4a572"
                strokeWidth="1.5"
                fill="none"
              />
            </svg>
          </div>
        ),
      )}

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-4 max-w-lg mx-auto w-full">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: prefersReducedMotion ? 0 : -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: prefersReducedMotion ? 0 : 1.2,
            ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
          }}
          className="text-center mb-12"
        >
          <h1
            className="text-7xl md:text-9xl font-bold mb-2 tracking-tight"
            style={{
              fontFamily: 'Cinzel, Georgia, serif',
              color: '#d4c5a0',
              textShadow: '3px 3px 6px rgba(0,0,0,0.7), 0 0 30px rgba(196,165,114,0.3)',
              letterSpacing: '0.05em',
            }}
          >
            BOK
          </h1>
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="h-px w-16 bg-gradient-to-r from-transparent to-[#8b7355]" />
            <span style={{ color: '#8b7355' }}>&#10022;</span>
            <div className="h-px w-16 bg-gradient-to-l from-transparent to-[#8b7355]" />
          </div>
          <p
            className="text-lg tracking-[0.3em] uppercase"
            style={{ fontFamily: 'Crimson Text, Georgia, serif', color: '#a89574' }}
          >
            The Builder's Tome
          </p>
          <p className="text-sm mt-3 italic" style={{ fontFamily: 'Crimson Text, Georgia, serif', color: '#6b5444' }}>
            A tale written in voxels, read through courage
          </p>
        </motion.div>

        {/* --- Main menu buttons --- */}
        {panel === 'main' && (
          <nav aria-label="Main menu" className="w-full space-y-3">
            {hasSaves && (
              <motion.button
                type="button"
                variants={menuItem(0)}
                initial="hidden"
                animate="visible"
                onClick={() => {
                  if (saves.length === 1) {
                    onContinueGame(saves[0]);
                  } else {
                    setPanel('saves');
                  }
                }}
                className="w-full h-14 text-lg rounded-lg border-2 transition-all duration-300 hover:shadow-[0_0_20px_rgba(196,165,114,0.5)] cursor-pointer focus-visible:ring-2 focus-visible:ring-[#c4a572] focus-visible:outline-none"
                style={{
                  fontFamily: 'Crimson Text, Georgia, serif',
                  color: '#fdf6e3',
                  background: 'rgba(74,55,40,0.9)',
                  borderColor: '#c4a572',
                  letterSpacing: '0.05em',
                }}
              >
                Continue
              </motion.button>
            )}
            <motion.button
              ref={newGameButtonRef}
              type="button"
              variants={menuItem(hasSaves ? 1 : 0)}
              initial="hidden"
              animate="visible"
              onClick={() => setPanel('new-game')}
              className="w-full h-14 text-lg rounded-lg border-2 transition-all duration-300 hover:shadow-[0_0_20px_rgba(139,115,85,0.4)] cursor-pointer focus-visible:ring-2 focus-visible:ring-[#c4a572] focus-visible:outline-none"
              style={{
                fontFamily: 'Crimson Text, Georgia, serif',
                color: '#d4c5a0',
                background: 'rgba(58,40,32,0.8)',
                borderColor: 'rgba(139,115,85,0.6)',
                letterSpacing: '0.05em',
              }}
            >
              New Game
            </motion.button>
            <motion.button
              type="button"
              variants={menuItem(hasSaves ? 2 : 1)}
              initial="hidden"
              animate="visible"
              onClick={() => setShowTome(true)}
              className="w-full h-14 text-lg rounded-lg border-2 transition-all duration-300 cursor-pointer focus-visible:ring-2 focus-visible:ring-[#c4a572] focus-visible:outline-none"
              style={{
                fontFamily: 'Crimson Text, Georgia, serif',
                color: '#a89574',
                background: 'rgba(45,31,23,0.5)',
                borderColor: 'rgba(139,115,85,0.4)',
                letterSpacing: '0.05em',
              }}
            >
              Inscriptions
            </motion.button>
          </nav>
        )}

        {/* --- New Game panel (seed + mode only) --- */}
        {panel === 'new-game' && (
          <motion.div
            initial={{ opacity: 0, scale: prefersReducedMotion ? 1 : 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: prefersReducedMotion ? 0 : undefined }}
            className="w-full space-y-4"
            role="region"
            aria-label="New game configuration"
          >
            <h2
              className="text-2xl text-center mb-4"
              style={{ fontFamily: 'Cinzel, Georgia, serif', color: '#c4a572' }}
            >
              Begin a New Tale
            </h2>

            {/* Seed input */}
            <div>
              <label
                htmlFor="bok-world-seed"
                className="text-sm block mb-1"
                style={{ fontFamily: 'Cinzel, Georgia, serif', color: '#c4a572' }}
              >
                World Seed
              </label>
              <div className="flex gap-2">
                <input
                  id="bok-world-seed"
                  value={seed}
                  onChange={(e) => setSeed(e.target.value)}
                  placeholder="Let fate decide..."
                  className="flex-1 px-3 py-2 rounded-md border text-sm"
                  style={{
                    background: 'rgba(26,18,12,0.7)',
                    borderColor: 'rgba(107,84,68,0.6)',
                    color: '#d4c5a0',
                    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
                  }}
                />
                <button
                  type="button"
                  onClick={randomSeed}
                  aria-label="Randomize world seed"
                  className="px-3 py-2 rounded-md border cursor-pointer focus-visible:ring-2 focus-visible:ring-[#c4a572] focus-visible:outline-none"
                  style={{ background: 'rgba(45,31,23,0.7)', borderColor: 'rgba(107,84,68,0.6)', color: '#c4a572' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path
                      d="M19.3 5.7l-1.4-1.4-5.3 5.3-5.3-5.3-1.4 1.4 5.3 5.3-5.3 5.3 1.4 1.4 5.3-5.3 5.3 5.3 1.4-1.4-5.3-5.3z"
                      opacity="0"
                    />
                    <rect x="2" y="2" width="8" height="8" rx="1.5" />
                    <circle cx="4.5" cy="4.5" r="1" fill="#1a120c" />
                    <circle cx="7.5" cy="7.5" r="1" fill="#1a120c" />
                    <rect x="14" y="14" width="8" height="8" rx="1.5" />
                    <circle cx="16" cy="16" r="1" fill="#1a120c" />
                    <circle cx="20" cy="20" r="1" fill="#1a120c" />
                    <circle cx="18" cy="18" r="1" fill="#1a120c" />
                  </svg>
                </button>
              </div>
              <p className="text-xs mt-1 italic" style={{ color: '#6b5444' }}>
                The seed shapes every island in your world
              </p>
            </div>

            {/* Game mode toggle */}
            <div>
              <p className="text-sm block mb-1" style={{ fontFamily: 'Cinzel, Georgia, serif', color: '#c4a572' }}>
                Mode
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedMode('survival')}
                  className={`flex-1 py-3 rounded-lg border-2 text-sm transition-all duration-200 cursor-pointer ${
                    selectedMode === 'survival' ? 'shadow-lg' : 'opacity-60'
                  }`}
                  style={{
                    fontFamily: 'Cinzel, Georgia, serif',
                    color: selectedMode === 'survival' ? '#fdf6e3' : '#a89574',
                    background: selectedMode === 'survival' ? 'rgba(139,26,26,0.7)' : 'rgba(45,31,23,0.5)',
                    borderColor: selectedMode === 'survival' ? '#c44a4a' : 'rgba(107,84,68,0.4)',
                  }}
                >
                  <div className="font-bold">Survival</div>
                  <div className="text-xs mt-0.5 opacity-70" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>
                    Goals, combat, progression
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedMode('creative')}
                  className={`flex-1 py-3 rounded-lg border-2 text-sm transition-all duration-200 cursor-pointer ${
                    selectedMode === 'creative' ? 'shadow-lg' : 'opacity-60'
                  }`}
                  style={{
                    fontFamily: 'Cinzel, Georgia, serif',
                    color: selectedMode === 'creative' ? '#fdf6e3' : '#a89574',
                    background: selectedMode === 'creative' ? 'rgba(39,100,57,0.7)' : 'rgba(45,31,23,0.5)',
                    borderColor: selectedMode === 'creative' ? '#4a9c60' : 'rgba(107,84,68,0.4)',
                  }}
                >
                  <div className="font-bold">Creative</div>
                  <div className="text-xs mt-0.5 opacity-70" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>
                    Build freely, all islands
                  </div>
                </button>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleBegin}
                aria-label="Begin - create the game and enter the hub"
                className="flex-1 h-12 text-lg rounded-lg transition-all duration-300 hover:shadow-[0_0_20px_rgba(139,115,85,0.5)] cursor-pointer focus-visible:ring-2 focus-visible:ring-[#c4a572] focus-visible:outline-none"
                style={{
                  fontFamily: 'Cinzel, Georgia, serif',
                  color: '#d4c5a0',
                  background: '#5a4738',
                  letterSpacing: '0.05em',
                }}
              >
                Begin
              </button>
              <button
                ref={backButtonRef}
                type="button"
                onClick={() => setPanel('main')}
                aria-label="Back to main menu"
                className="h-12 px-4 rounded-lg border cursor-pointer focus-visible:ring-2 focus-visible:ring-[#c4a572] focus-visible:outline-none"
                style={{ background: 'transparent', borderColor: 'rgba(107,84,68,0.6)', color: '#a89574' }}
              >
                &#10005;
              </button>
            </div>
          </motion.div>
        )}

        {/* --- Saved games list --- */}
        {panel === 'saves' && (
          <motion.div
            initial={{ opacity: 0, scale: prefersReducedMotion ? 1 : 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: prefersReducedMotion ? 0 : undefined }}
            className="w-full space-y-3"
            role="region"
            aria-label="Saved games"
          >
            <h2
              className="text-2xl text-center mb-4"
              style={{ fontFamily: 'Cinzel, Georgia, serif', color: '#c4a572' }}
            >
              Your Tales
            </h2>

            <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
              {saves.map((save) => (
                <div
                  key={save.id}
                  className="flex items-center gap-2 p-3 rounded-lg border-2 transition-all duration-200"
                  style={{
                    background: 'rgba(45,31,23,0.6)',
                    borderColor: 'rgba(107,84,68,0.5)',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => onContinueGame(save)}
                    className="flex-1 text-left cursor-pointer focus-visible:ring-2 focus-visible:ring-[#c4a572] focus-visible:outline-none rounded p-1"
                  >
                    <div
                      className="text-sm font-bold"
                      style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace', color: '#d4c5a0' }}
                    >
                      {save.seed}
                    </div>
                    <div className="flex gap-3 text-xs mt-1" style={{ color: '#8b7355' }}>
                      <span
                        className="uppercase tracking-wider"
                        style={{
                          fontFamily: 'Cinzel, Georgia, serif',
                          color: save.mode === 'survival' ? '#c44a4a' : '#4a9c60',
                        }}
                      >
                        {save.mode}
                      </span>
                      <span style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>
                        {formatDate(save.lastPlayedAt)}
                      </span>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteGame(save.id)}
                    aria-label={`Delete save: ${save.seed}`}
                    className="px-2 py-1 rounded text-xs cursor-pointer opacity-40 hover:opacity-100 transition-opacity focus-visible:ring-2 focus-visible:ring-[#c4a572] focus-visible:outline-none"
                    style={{ color: '#c44a4a' }}
                  >
                    &#10005;
                  </button>
                </div>
              ))}
            </div>

            <div className="pt-2">
              <button
                ref={backButtonRef}
                type="button"
                onClick={() => setPanel('main')}
                aria-label="Back to main menu"
                className="w-full h-10 rounded-lg border cursor-pointer focus-visible:ring-2 focus-visible:ring-[#c4a572] focus-visible:outline-none"
                style={{
                  fontFamily: 'Cinzel, Georgia, serif',
                  background: 'transparent',
                  borderColor: 'rgba(107,84,68,0.6)',
                  color: '#a89574',
                }}
              >
                Back
              </button>
            </div>
          </motion.div>
        )}

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: prefersReducedMotion ? 0 : 0.8 }}
          className="absolute bottom-6 text-center text-xs italic"
          style={{ color: '#6b5444' }}
        >
          Volume I &middot; Edition {APP_VERSION}
        </motion.div>
      </div>
      {showTome && (
        <TomePageBrowser
          pages={unlockedPages.map((id) => {
            const cat = TOME_PAGE_CATALOG[id];
            return { id, name: cat?.name ?? id, description: cat?.description ?? '', icon: cat?.icon ?? '', level: 1 };
          })}
          onClose={() => setShowTome(false)}
        />
      )}
    </section>
  );
}
