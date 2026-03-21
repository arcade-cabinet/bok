/**
 * Medieval dual-joystick mobile controller.
 *
 * Layout (landscape mobile):
 * ┌─────────────────────────────────────────┐
 * │                                         │
 * │                                         │
 * │  [LEFT JOYSTICK]          [RIGHT STICK]  │
 * │  ╔═══╗                    ┌──┬──┐       │
 * │  ║ ● ║                    │⬆│⚔│       │
 * │  ╚═══╝                    ├──┼──┤       │
 * │  ┗━housing━┛              │🛡│⬇│ ● ●   │
 * │                           └──┴──┘       │
 * └─────────────────────────────────────────┘
 *
 * Left: Simple joystick with quarter-moon housing behind it
 * Right: 2x2 action grid housing + joystick beside it (not overlapping)
 */
import { useRef, useState, useCallback, type TouchEvent as ReactTouchEvent } from 'react';
import { Sword, Shield, ArrowUp, ArrowDown } from 'lucide-react';

export interface MedievalJoystickOutput {
  moveX: number;
  moveZ: number;
  lookX: number;
  lookY: number;
  action: 'attack' | 'defend' | 'jump' | 'crouch' | null;
}

interface Position { x: number; y: number }
interface StickState { active: boolean; pos: Position; id: number | null }

const RADIUS = 35;
const STICK_SIZE = 110;
const KNOB_SIZE = 56;

function clamp(dx: number, dy: number): Position {
  const d = Math.sqrt(dx * dx + dy * dy);
  if (d <= RADIUS) return { x: dx, y: dy };
  return { x: (dx / d) * RADIUS, y: (dy / d) * RADIUS };
}

function Knob({ pos, active }: { pos: Position; active: boolean }) {
  return (
    <div style={{
      position: 'absolute', width: KNOB_SIZE, height: KNOB_SIZE,
      left: '50%', top: '50%',
      marginLeft: -KNOB_SIZE / 2, marginTop: -KNOB_SIZE / 2,
      transform: `translate(${pos.x}px, ${pos.y}px)`,
      transition: active ? 'none' : 'transform 0.12s ease-out',
      borderRadius: '50%',
      background: 'radial-gradient(circle at 35% 35%, #d4a44c, #8b6914)',
      boxShadow: active
        ? 'inset 0 2px 6px rgba(0,0,0,0.7), 0 1px 4px rgba(0,0,0,0.5)'
        : 'inset 0 -2px 4px rgba(0,0,0,0.3), 0 3px 8px rgba(0,0,0,0.4), 0 1px 2px rgba(200,170,100,0.2)',
      border: '1.5px solid #6b4e14',
    }}>
      <div style={{ position: 'absolute', inset: 4, borderRadius: '50%', border: '1px solid rgba(196,165,114,0.3)' }} />
      <div style={{ position: 'absolute', inset: 10, borderRadius: '50%', border: '1px solid rgba(196,165,114,0.4)' }} />
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#3d2808', border: '1px solid #6b4e14' }} />
      </div>
    </div>
  );
}

function StickBase({ children, size = STICK_SIZE }: { children: React.ReactNode; size?: number }) {
  return (
    <div style={{
      position: 'relative', width: size, height: size, borderRadius: '50%',
      background: 'radial-gradient(circle at 35% 35%, #6b4e14, #2a1804)',
      boxShadow: 'inset 0 4px 10px rgba(0,0,0,0.6), 0 4px 12px rgba(0,0,0,0.4)',
      border: '2px solid #5c3310',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{ position: 'absolute', inset: 5, borderRadius: '50%', border: '1.5px solid rgba(139,105,20,0.3)' }} />
      {children}
    </div>
  );
}

interface ActionDef { id: 'jump' | 'attack' | 'defend' | 'crouch'; icon: React.ReactNode; label: string }
const ACTIONS: ActionDef[] = [
  { id: 'jump', icon: <ArrowUp className="w-4 h-4" />, label: 'Jump' },
  { id: 'attack', icon: <Sword className="w-4 h-4" />, label: 'Atk' },
  { id: 'defend', icon: <Shield className="w-4 h-4" />, label: 'Def' },
  { id: 'crouch', icon: <ArrowDown className="w-4 h-4" />, label: 'Down' },
];

interface Props {
  onOutput: (o: MedievalJoystickOutput) => void;
  visible: boolean;
}

export function MedievalJoysticks({ onOutput, visible }: Props) {
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const out = useRef<MedievalJoystickOutput>({ moveX: 0, moveZ: 0, lookX: 0, lookY: 0, action: null });
  const [left, setLeft] = useState<StickState>({ active: false, pos: { x: 0, y: 0 }, id: null });
  const [right, setRight] = useState<StickState>({ active: false, pos: { x: 0, y: 0 }, id: null });
  const [pressed, setPressed] = useState<string | null>(null);

  const center = (el: HTMLDivElement) => {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  };

  const emit = useCallback(() => onOutput({ ...out.current }), [onOutput]);

  // Left stick
  const lStart = useCallback((e: ReactTouchEvent) => {
    e.preventDefault();
    if (!leftRef.current) return;
    const t = e.changedTouches[0];
    const c = center(leftRef.current);
    const p = clamp(t.clientX - c.x, t.clientY - c.y);
    setLeft({ active: true, pos: p, id: t.identifier });
    out.current.moveX = p.x / RADIUS;
    out.current.moveZ = p.y / RADIUS; // No inversion: negative Y (push up) = negative dirZ = forward in Three.js
    emit();
  }, [emit]);

  const lMove = useCallback((e: ReactTouchEvent) => {
    e.preventDefault();
    if (!leftRef.current) return;
    for (const t of Array.from(e.changedTouches)) {
      if (t.identifier === left.id) {
        const c = center(leftRef.current);
        const p = clamp(t.clientX - c.x, t.clientY - c.y);
        setLeft(s => ({ ...s, pos: p }));
        out.current.moveX = p.x / RADIUS;
        out.current.moveZ = p.y / RADIUS; // No inversion: negative Y (push up) = negative dirZ = forward in Three.js
        emit();
      }
    }
  }, [left.id, emit]);

  const lEnd = useCallback((e: ReactTouchEvent) => {
    e.preventDefault();
    for (const t of Array.from(e.changedTouches)) {
      if (t.identifier === left.id) {
        setLeft({ active: false, pos: { x: 0, y: 0 }, id: null });
        out.current.moveX = 0; out.current.moveZ = 0; emit();
      }
    }
  }, [left.id, emit]);

  // Right stick
  const rStart = useCallback((e: ReactTouchEvent) => {
    e.preventDefault();
    if (!rightRef.current) return;
    const t = e.changedTouches[0];
    const c = center(rightRef.current);
    const p = clamp(t.clientX - c.x, t.clientY - c.y);
    setRight({ active: true, pos: p, id: t.identifier });
    out.current.lookX = p.x / RADIUS;
    out.current.lookY = p.y / RADIUS;
    emit();
  }, [emit]);

  const rMove = useCallback((e: ReactTouchEvent) => {
    e.preventDefault();
    if (!rightRef.current) return;
    for (const t of Array.from(e.changedTouches)) {
      if (t.identifier === right.id) {
        const c = center(rightRef.current);
        const p = clamp(t.clientX - c.x, t.clientY - c.y);
        setRight(s => ({ ...s, pos: p }));
        out.current.lookX = p.x / RADIUS;
        out.current.lookY = p.y / RADIUS;
        emit();
      }
    }
  }, [right.id, emit]);

  const rEnd = useCallback((e: ReactTouchEvent) => {
    e.preventDefault();
    for (const t of Array.from(e.changedTouches)) {
      if (t.identifier === right.id) {
        setRight({ active: false, pos: { x: 0, y: 0 }, id: null });
        out.current.lookX = 0; out.current.lookY = 0; emit();
      }
    }
  }, [right.id, emit]);

  const tap = useCallback((id: 'attack' | 'defend' | 'jump' | 'crouch', e: ReactTouchEvent<HTMLButtonElement>) => {
    e.preventDefault(); e.stopPropagation();
    setPressed(id);
    out.current.action = id; emit(); out.current.action = null;
    setTimeout(() => setPressed(null), 200);
  }, [emit]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-20" style={{ touchAction: 'none' }}>

      {/* ─── LEFT: Movement joystick with housing ─── */}
      <div className="absolute pointer-events-auto" style={{ left: 16, bottom: 16, touchAction: 'none' }}>
        {/* Quarter-moon housing background */}
        <svg width="140" height="140" viewBox="0 0 140 140" className="absolute" style={{ left: -15, bottom: -15, pointerEvents: 'none' }}>
          <path d="M 0 140 L 0 30 A 110 110 0 0 1 110 140 Z"
            fill="url(#lh)" stroke="#5c3310" strokeWidth="1.5" opacity="0.85" />
          <defs>
            <linearGradient id="lh" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#78350f" /><stop offset="100%" stopColor="#3d2206" />
            </linearGradient>
          </defs>
          <path d="M 0 30 A 110 110 0 0 1 110 140" fill="none" stroke="#c4a572" strokeWidth="1.5" opacity="0.5" />
          <circle cx="8" cy="132" r="5" fill="none" stroke="#c4a572" strokeWidth="1" opacity="0.4" />
          <circle cx="8" cy="132" r="2.5" fill="#c4a572" opacity="0.15" />
        </svg>
        <div ref={leftRef}
          onTouchStart={lStart} onTouchMove={lMove} onTouchEnd={lEnd}
          onMouseDown={(e) => { const t = { clientX: e.clientX, clientY: e.clientY, identifier: 0 }; lStart({ preventDefault: () => {}, changedTouches: [t] } as any); }}
          onMouseMove={(e) => { if (left.active) lMove({ preventDefault: () => {}, changedTouches: [{ clientX: e.clientX, clientY: e.clientY, identifier: 0 }] } as any); }}
          onMouseUp={(e) => { lEnd({ preventDefault: () => {}, changedTouches: [{ clientX: e.clientX, clientY: e.clientY, identifier: 0 }] } as any); }}
          style={{ position: 'relative', zIndex: 2 }}>
          <StickBase><Knob pos={left.pos} active={left.active} /></StickBase>
        </div>
      </div>

      {/* ─── RIGHT: 2x2 action grid + camera joystick ─── */}
      <div className="absolute pointer-events-auto" style={{ right: 16, bottom: 16, touchAction: 'none', display: 'flex', alignItems: 'flex-end', gap: 8 }}>

        {/* Action panel: 2x2 grid of buttons */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3,
          background: 'linear-gradient(135deg, #78350f, #3d2206)',
          border: '2px solid #5c3310', borderRadius: 10, padding: 4,
          boxShadow: 'inset 0 1px 0 rgba(196,165,114,0.15), 0 4px 12px rgba(0,0,0,0.5)',
        }}>
          {/* Gold filigree border effect via outline */}
          {ACTIONS.map(a => (
            <button key={a.id}
              onTouchStart={(e) => tap(a.id, e)}
              onClick={() => { setPressed(a.id); out.current.action = a.id; emit(); out.current.action = null; setTimeout(() => setPressed(null), 200); }}
              style={{
                width: 48, height: 48, borderRadius: 6,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
                border: `1.5px solid ${pressed === a.id ? '#c4a572' : '#5c3310'}`,
                background: pressed === a.id
                  ? 'linear-gradient(180deg, #2a1804, #1a1004)'
                  : 'linear-gradient(180deg, #6b4e14, #4a3510)',
                boxShadow: pressed === a.id
                  ? 'inset 0 2px 6px rgba(0,0,0,0.8)'
                  : 'inset 0 -1px 2px rgba(0,0,0,0.3), 0 1px 3px rgba(0,0,0,0.3)',
                color: pressed === a.id ? '#fdf6e3' : '#c4a572',
                touchAction: 'none', pointerEvents: 'auto', cursor: 'pointer',
                transition: 'all 0.1s ease',
                fontFamily: 'Georgia, serif', fontSize: 8, letterSpacing: '0.05em',
              }}
            >
              <div style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.7))' }}>{a.icon}</div>
              <span style={{ opacity: 0.7 }}>{a.label}</span>
            </button>
          ))}
        </div>

        {/* Camera joystick */}
        <div style={{ position: 'relative' }}>
          {/* Quarter-moon housing background */}
          <svg width="140" height="140" viewBox="0 0 140 140" className="absolute" style={{ right: -15, bottom: -15, pointerEvents: 'none' }}>
            <path d="M 140 140 L 140 30 A 110 110 0 0 0 30 140 Z"
              fill="url(#rh)" stroke="#5c3310" strokeWidth="1.5" opacity="0.85" />
            <defs>
              <linearGradient id="rh" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#78350f" /><stop offset="100%" stopColor="#3d2206" />
              </linearGradient>
            </defs>
            <path d="M 140 30 A 110 110 0 0 0 30 140" fill="none" stroke="#c4a572" strokeWidth="1.5" opacity="0.5" />
            <circle cx="132" cy="132" r="5" fill="none" stroke="#c4a572" strokeWidth="1" opacity="0.4" />
            <circle cx="132" cy="132" r="2.5" fill="#c4a572" opacity="0.15" />
          </svg>
          <div ref={rightRef}
            onTouchStart={rStart} onTouchMove={rMove} onTouchEnd={rEnd}
            onMouseDown={(e) => { const t = { clientX: e.clientX, clientY: e.clientY, identifier: 1 }; rStart({ preventDefault: () => {}, changedTouches: [t] } as any); }}
            onMouseMove={(e) => { if (right.active) rMove({ preventDefault: () => {}, changedTouches: [{ clientX: e.clientX, clientY: e.clientY, identifier: 1 }] } as any); }}
            onMouseUp={(e) => { rEnd({ preventDefault: () => {}, changedTouches: [{ clientX: e.clientX, clientY: e.clientY, identifier: 1 }] } as any); }}
            style={{ position: 'relative', zIndex: 2 }}>
            <StickBase><Knob pos={right.pos} active={right.active} /></StickBase>
          </div>
        </div>
      </div>
    </div>
  );
}
