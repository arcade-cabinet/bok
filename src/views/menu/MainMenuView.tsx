import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import type { GameConfig } from '../../app/App';

const BIOMES = [
  { id: 'forest', name: 'Whispering Woods', desc: 'Dense canopy of ancient trees', icon: '🌲', sky: '#87CEEB' },
  { id: 'desert', name: 'Sunscorched Dunes', desc: 'Endless sands hiding forgotten ruins', icon: '🏜️', sky: '#F4D03F' },
  { id: 'tundra', name: 'Frostbite Expanse', desc: 'Treacherous heights of ice and stone', icon: '❄️', sky: '#B3CDE0' },
  {
    id: 'volcanic',
    name: 'Cinderpeak Caldera',
    desc: 'Rivers of lava through obsidian fields',
    icon: '🌋',
    sky: '#CC4125',
  },
  { id: 'swamp', name: 'Rothollow Marsh', desc: 'Murky waters and poisonous fog', icon: '🌿', sky: '#6B8E5E' },
  {
    id: 'crystal',
    name: 'Prismatic Depths',
    desc: 'Crystalline caverns of refracted light',
    icon: '💎',
    sky: '#9B59B6',
  },
  { id: 'sky', name: 'Stormspire Remnants', desc: 'Floating platforms above the clouds', icon: '⛅', sky: '#AED6F1' },
  { id: 'ocean', name: 'Abyssal Trench', desc: 'Coral kingdoms in eternal dark', icon: '🌊', sky: '#1A5276' },
];

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

interface Props {
  onStartGame: (config: GameConfig) => void;
  /** Most recent run — used by Resume Chapter */
  onResumeGame?: () => void;
  hasRunHistory?: boolean;
}

export function MainMenuView({ onStartGame, onResumeGame, hasRunHistory = false }: Props) {
  const [showNewGame, setShowNewGame] = useState(false);
  const [selectedBiome, setSelectedBiome] = useState('forest');
  const [seed, setSeed] = useState('Brave Dark Fox');
  const prefersReducedMotion = useReducedMotion();
  const newGameButtonRef = useRef<HTMLButtonElement>(null);
  const backButtonRef = useRef<HTMLButtonElement>(null);

  // Focus management: when new game panel opens, focus back button; when closed, focus new game button
  useEffect(() => {
    if (showNewGame) {
      backButtonRef.current?.focus();
    } else {
      newGameButtonRef.current?.focus();
    }
  }, [showNewGame]);

  const handleStart = () => {
    onStartGame({ biome: selectedBiome, seed });
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
            <span style={{ color: '#8b7355' }}>✦</span>
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

        {/* Menu buttons */}
        {!showNewGame ? (
          <nav aria-label="Main menu" className="w-full space-y-3">
            <motion.button
              ref={newGameButtonRef}
              type="button"
              variants={menuItem(0)}
              initial="hidden"
              animate="visible"
              onClick={() => setShowNewGame(true)}
              className="w-full h-14 text-lg rounded-lg border-2 transition-all duration-300 hover:shadow-[0_0_20px_rgba(139,115,85,0.4)] cursor-pointer focus-visible:ring-2 focus-visible:ring-[#c4a572] focus-visible:outline-none"
              style={{
                fontFamily: 'Crimson Text, Georgia, serif',
                color: '#d4c5a0',
                background: 'rgba(58,40,32,0.8)',
                borderColor: 'rgba(139,115,85,0.6)',
                letterSpacing: '0.05em',
              }}
            >
              ✒ Pen New Tale
            </motion.button>
            <motion.button
              type="button"
              variants={menuItem(1)}
              initial="hidden"
              animate="visible"
              onClick={() => hasRunHistory && onResumeGame?.()}
              aria-disabled={!hasRunHistory}
              className={`w-full h-14 text-lg rounded-lg border-2 transition-all duration-300 cursor-pointer focus-visible:ring-2 focus-visible:ring-[#c4a572] focus-visible:outline-none ${hasRunHistory ? 'hover:shadow-[0_0_20px_rgba(139,115,85,0.4)]' : 'opacity-40'}`}
              style={{
                fontFamily: 'Crimson Text, Georgia, serif',
                color: hasRunHistory ? '#d4c5a0' : '#a89574',
                background: hasRunHistory ? 'rgba(58,40,32,0.8)' : 'rgba(45,31,23,0.6)',
                borderColor: hasRunHistory ? 'rgba(139,115,85,0.6)' : 'rgba(139,115,85,0.3)',
                letterSpacing: '0.05em',
              }}
              disabled={!hasRunHistory}
            >
              📖 Resume Chapter
            </motion.button>
            <motion.button
              type="button"
              variants={menuItem(2)}
              initial="hidden"
              animate="visible"
              className="w-full h-14 text-lg rounded-lg border-2 transition-all duration-300 cursor-pointer focus-visible:ring-2 focus-visible:ring-[#c4a572] focus-visible:outline-none"
              style={{
                fontFamily: 'Crimson Text, Georgia, serif',
                color: '#a89574',
                background: 'rgba(45,31,23,0.5)',
                borderColor: 'rgba(139,115,85,0.4)',
                letterSpacing: '0.05em',
              }}
            >
              ⚙ Inscriptions
            </motion.button>
          </nav>
        ) : (
          /* New Game panel */
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
              Choose Your Chapter
            </h2>

            {/* Biome grid */}
            <div
              className="grid grid-cols-2 gap-2 max-h-[40vh] overflow-y-auto pr-1"
              role="radiogroup"
              aria-label="Select biome"
            >
              {BIOMES.map((b) => (
                <button
                  type="button"
                  key={b.id}
                  role="radio"
                  aria-checked={selectedBiome === b.id}
                  aria-label={`${b.name}: ${b.desc}`}
                  onClick={() => setSelectedBiome(b.id)}
                  className={`p-3 rounded-lg border-2 text-left transition-all duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-[#c4a572] focus-visible:outline-none ${selectedBiome === b.id ? 'shadow-lg' : 'hover:bg-[#3a2820]/60'}`}
                  style={{
                    background: selectedBiome === b.id ? 'rgba(74,55,40,0.7)' : 'rgba(45,31,23,0.5)',
                    borderColor: selectedBiome === b.id ? '#c4a572' : 'rgba(107,84,68,0.5)',
                  }}
                >
                  <div className="text-2xl mb-1" aria-hidden="true">
                    {b.icon}
                  </div>
                  <div className="text-sm font-bold" style={{ fontFamily: 'Cinzel, Georgia, serif', color: '#d4c5a0' }}>
                    {b.name}
                  </div>
                  <div className="text-xs italic" style={{ color: '#8b7355' }}>
                    {b.desc}
                  </div>
                </button>
              ))}
            </div>

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
                  <span aria-hidden="true">🎲</span>
                </button>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleStart}
                aria-label="Begin Writing - start the game"
                className="flex-1 h-12 text-lg rounded-lg transition-all duration-300 hover:shadow-[0_0_20px_rgba(139,115,85,0.5)] cursor-pointer focus-visible:ring-2 focus-visible:ring-[#c4a572] focus-visible:outline-none"
                style={{
                  fontFamily: 'Cinzel, Georgia, serif',
                  color: '#d4c5a0',
                  background: '#5a4738',
                  letterSpacing: '0.05em',
                }}
              >
                ✒ Begin Writing
              </button>
              <button
                ref={backButtonRef}
                type="button"
                onClick={() => setShowNewGame(false)}
                aria-label="Back to main menu"
                className="h-12 px-4 rounded-lg border cursor-pointer focus-visible:ring-2 focus-visible:ring-[#c4a572] focus-visible:outline-none"
                style={{ background: 'transparent', borderColor: 'rgba(107,84,68,0.6)', color: '#a89574' }}
              >
                ✕
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
          Volume I · Edition 0.1.0
        </motion.div>
      </div>
    </section>
  );
}
