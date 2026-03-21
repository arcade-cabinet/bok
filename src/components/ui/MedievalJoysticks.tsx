/**
 * Medieval dual-joystick mobile controller.
 * Left: FPS movement. Right: camera + segmented action buttons.
 * Both anchored in quarter-moon SVG housings in bottom corners.
 */
import { useRef, useState, useCallback, type TouchEvent } from 'react';
import { Sword, Shield, ArrowUp, ArrowDown } from 'lucide-react';

interface Position { x: number; y: number; }

interface JoystickState {
  active: boolean;
  position: Position;
  identifier: number | null;
}

export interface MedievalJoystickOutput {
  moveX: number;       // -1 to 1 (absolute stick position)
  moveZ: number;       // -1 to 1 (absolute stick position)
  lookX: number;       // -1 to 1 (absolute stick position — continuous rotation rate)
  lookY: number;       // -1 to 1 (absolute stick position — continuous rotation rate)
  action: 'attack' | 'defend' | 'jump' | 'crouch' | null;
}

const MAX_DISTANCE = 40;
const JOYSTICK_SIZE = 144; // px
const KNOB_SIZE = 80;

function clampToRadius(dx: number, dy: number, max: number): Position {
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist <= max) return { x: dx, y: dy };
  const angle = Math.atan2(dy, dx);
  return { x: Math.cos(angle) * max, y: Math.sin(angle) * max };
}

// Shared joystick knob visual
function JoystickKnob({ position, active }: { position: Position; active: boolean }) {
  return (
    <div
      className="absolute rounded-full"
      style={{
        width: KNOB_SIZE,
        height: KNOB_SIZE,
        left: '50%',
        top: '50%',
        marginLeft: -KNOB_SIZE / 2,
        marginTop: -KNOB_SIZE / 2,
        transform: `translate(${position.x}px, ${position.y}px)`,
        transition: active ? 'none' : 'transform 0.15s ease-out',
        background: 'radial-gradient(circle at 38% 38%, #d97706, #92400e)',
        boxShadow: active
          ? 'inset 0 3px 8px rgba(0,0,0,0.7), 0 2px 6px rgba(0,0,0,0.6)'
          : 'inset 0 -2px 5px rgba(0,0,0,0.4), 0 4px 12px rgba(0,0,0,0.5), 0 1px 3px rgba(255,200,100,0.2)',
        border: '1.5px solid #78350f',
      }}
    >
      {/* Grip rings */}
      <div className="absolute inset-2 rounded-full border border-amber-600/30" />
      <div className="absolute inset-4 rounded-full border border-amber-500/40" />
      <div className="absolute inset-6 rounded-full border border-amber-600/30" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-4 h-4 rounded-full bg-amber-950/80 border border-amber-700" />
      </div>
    </div>
  );
}

// Shared joystick base visual
function JoystickBase({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative rounded-full flex items-center justify-center"
      style={{
        width: JOYSTICK_SIZE,
        height: JOYSTICK_SIZE,
        background: 'radial-gradient(circle at 35% 35%, #92400e, #451a03)',
        boxShadow: 'inset 0 6px 14px rgba(0,0,0,0.6), inset 0 -2px 6px rgba(255,200,100,0.1), 0 6px 20px rgba(0,0,0,0.5)',
        border: '2px solid #78350f',
      }}
    >
      <div className="absolute inset-3 rounded-full border-2 border-amber-700/40" />
      {/* Directional markers */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 w-1 h-3 bg-amber-800 rounded-full opacity-50" />
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-1 h-3 bg-amber-800 rounded-full opacity-50" />
      <div className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-1 bg-amber-800 rounded-full opacity-50" />
      <div className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-1 bg-amber-800 rounded-full opacity-50" />
      {children}
    </div>
  );
}

// Quarter-moon corner housing SVG
function CornerHousing({ side }: { side: 'left' | 'right' }) {
  const flip = side === 'right';
  return (
    <svg
      className="absolute pointer-events-none"
      style={{
        width: 200,
        height: 200,
        [side]: -30,
        bottom: -30,
        transform: flip ? 'scaleX(-1)' : undefined,
      }}
      viewBox="0 0 200 200"
    >
      <defs>
        <linearGradient id={`housing-${side}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#78350f" />
          <stop offset="50%" stopColor="#92400e" />
          <stop offset="100%" stopColor="#451a03" />
        </linearGradient>
      </defs>
      {/* Quarter circle anchored to bottom-left corner */}
      <path
        d="M 0 200 L 0 60 A 140 140 0 0 1 140 200 Z"
        fill={`url(#housing-${side})`}
        stroke="#451a03"
        strokeWidth="2"
        opacity="0.92"
      />
      {/* Wood grain lines */}
      <path d="M 10 180 Q 40 175 80 178 T 130 195" stroke="#5c3310" strokeWidth="0.8" fill="none" opacity="0.3" />
      <path d="M 10 160 Q 50 155 90 158 T 120 190" stroke="#5c3310" strokeWidth="0.6" fill="none" opacity="0.25" />
      {/* Corner filigree */}
      <circle cx="15" cy="185" r="6" fill="none" stroke="#d97706" strokeWidth="1.2" opacity="0.6" />
      <circle cx="15" cy="185" r="3" fill="none" stroke="#d97706" strokeWidth="1" opacity="0.4" />
      {/* Iron rivets */}
      <circle cx="8" cy="170" r="3" fill="#4a3728" stroke="#2c1e16" strokeWidth="1" opacity="0.7" />
      <circle cx="25" cy="195" r="3" fill="#4a3728" stroke="#2c1e16" strokeWidth="1" opacity="0.7" />
      <circle cx="50" cy="195" r="3" fill="#4a3728" stroke="#2c1e16" strokeWidth="1" opacity="0.7" />
    </svg>
  );
}

interface ActionSegment {
  id: 'attack' | 'defend' | 'jump' | 'crouch';
  icon: React.ReactNode;
  angle: number; // degrees from top, clockwise
}

const ACTIONS: ActionSegment[] = [
  { id: 'jump', icon: <ArrowUp className="w-4 h-4" />, angle: 0 },
  { id: 'attack', icon: <Sword className="w-4 h-4" />, angle: 90 },
  { id: 'crouch', icon: <ArrowDown className="w-4 h-4" />, angle: 180 },
  { id: 'defend', icon: <Shield className="w-4 h-4" />, angle: 270 },
];

interface Props {
  onOutput: (output: MedievalJoystickOutput) => void;
  visible: boolean;
}

export function MedievalJoysticks({ onOutput, visible }: Props) {
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const outputRef = useRef<MedievalJoystickOutput>({ moveX: 0, moveZ: 0, lookX: 0, lookY: 0, action: null });

  const [leftStick, setLeftStick] = useState<JoystickState>({ active: false, position: { x: 0, y: 0 }, identifier: null });
  const [rightStick, setRightStick] = useState<JoystickState>({ active: false, position: { x: 0, y: 0 }, identifier: null });
  const [activeAction, setActiveAction] = useState<string | null>(null);

  // Right joystick outputs absolute position (not deltas) for continuous rotation

  const getCenter = (el: HTMLDivElement) => {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  };

  // Left joystick handlers
  const onLeftStart = useCallback((e: TouchEvent) => {
    e.preventDefault();
    const t = e.changedTouches[0];
    if (!leftRef.current) return;
    const c = getCenter(leftRef.current);
    const pos = clampToRadius(t.clientX - c.x, t.clientY - c.y, MAX_DISTANCE);
    setLeftStick({ active: true, position: pos, identifier: t.identifier });
    outputRef.current.moveX = pos.x / MAX_DISTANCE;
    outputRef.current.moveZ = -pos.y / MAX_DISTANCE;
    onOutput({ ...outputRef.current });
  }, [onOutput]);

  const onLeftMove = useCallback((e: TouchEvent) => {
    e.preventDefault();
    if (!leftRef.current) return;
    for (const t of Array.from(e.changedTouches)) {
      if (t.identifier === leftStick.identifier) {
        const c = getCenter(leftRef.current);
        const pos = clampToRadius(t.clientX - c.x, t.clientY - c.y, MAX_DISTANCE);
        setLeftStick(prev => ({ ...prev, position: pos }));
        outputRef.current.moveX = pos.x / MAX_DISTANCE;
        outputRef.current.moveZ = -pos.y / MAX_DISTANCE;
        onOutput({ ...outputRef.current });
      }
    }
  }, [leftStick.identifier, onOutput]);

  const onLeftEnd = useCallback((e: TouchEvent) => {
    e.preventDefault();
    for (const t of Array.from(e.changedTouches)) {
      if (t.identifier === leftStick.identifier) {
        setLeftStick({ active: false, position: { x: 0, y: 0 }, identifier: null });
        outputRef.current.moveX = 0;
        outputRef.current.moveZ = 0;
        onOutput({ ...outputRef.current });
      }
    }
  }, [leftStick.identifier, onOutput]);

  // Right joystick handlers — POSITION-BASED (stick position = rotation rate)
  const onRightStart = useCallback((e: TouchEvent) => {
    e.preventDefault();
    const t = e.changedTouches[0];
    if (!rightRef.current) return;
    const c = getCenter(rightRef.current);
    const pos = clampToRadius(t.clientX - c.x, t.clientY - c.y, MAX_DISTANCE);
    setRightStick({ active: true, position: pos, identifier: t.identifier });
    outputRef.current.lookX = pos.x / MAX_DISTANCE;
    outputRef.current.lookY = pos.y / MAX_DISTANCE;
    onOutput({ ...outputRef.current });
  }, [onOutput]);

  const onRightMove = useCallback((e: TouchEvent) => {
    e.preventDefault();
    if (!rightRef.current) return;
    for (const t of Array.from(e.changedTouches)) {
      if (t.identifier === rightStick.identifier) {
        const c = getCenter(rightRef.current);
        const pos = clampToRadius(t.clientX - c.x, t.clientY - c.y, MAX_DISTANCE);
        setRightStick(prev => ({ ...prev, position: pos }));
        // Absolute position: -1 to 1. Engine multiplies by rotation speed each frame.
        outputRef.current.lookX = pos.x / MAX_DISTANCE;
        outputRef.current.lookY = pos.y / MAX_DISTANCE;
        onOutput({ ...outputRef.current });
      }
    }
  }, [rightStick.identifier, onOutput]);

  const onRightEnd = useCallback((e: TouchEvent) => {
    e.preventDefault();
    for (const t of Array.from(e.changedTouches)) {
      if (t.identifier === rightStick.identifier) {
        setRightStick({ active: false, position: { x: 0, y: 0 }, identifier: null });
        outputRef.current.lookX = 0;
        outputRef.current.lookY = 0;
        onOutput({ ...outputRef.current });
      }
    }
  }, [rightStick.identifier, onOutput]);

  const onActionTap = useCallback((id: 'attack' | 'defend' | 'jump' | 'crouch', e: TouchEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveAction(id);
    outputRef.current.action = id;
    onOutput({ ...outputRef.current });
    outputRef.current.action = null;
    setTimeout(() => setActiveAction(null), 150);
  }, [onOutput]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-20" style={{ touchAction: 'none' }}>
      {/* LEFT: Movement joystick + quarter-moon housing */}
      <div className="absolute bottom-4 left-4 pointer-events-auto" style={{ touchAction: 'none' }}>
        <CornerHousing side="left" />
        <div className="relative z-10">
          <div className="text-center mb-1">
            <span className="text-[9px] font-bold text-amber-200/60 tracking-wider uppercase" style={{ fontFamily: 'serif' }}>
              Move
            </span>
          </div>
          <div
            ref={leftRef}
            onTouchStart={onLeftStart}
            onTouchMove={onLeftMove}
            onTouchEnd={onLeftEnd}
          >
            <JoystickBase>
              <JoystickKnob position={leftStick.position} active={leftStick.active} />
            </JoystickBase>
          </div>
        </div>
      </div>

      {/* RIGHT: Quarter-moon housing with segmented action zones + joystick at curved edge */}
      <div className="absolute bottom-0 right-0 pointer-events-auto" style={{ touchAction: 'none', width: 280, height: 280 }}>
        {/* Quarter-moon housing SVG — anchored to bottom-right corner */}
        {/* The housing body is segmented into 4 action zones */}
        {/* Joystick sits at the curved outer edge */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 280 280" style={{ pointerEvents: 'none' }}>
          <defs>
            <linearGradient id="housing-bg" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#92400e" />
              <stop offset="40%" stopColor="#78350f" />
              <stop offset="100%" stopColor="#451a03" />
            </linearGradient>
            <linearGradient id="seg-glow" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#b91c1c" />
              <stop offset="100%" stopColor="#7f1d1d" />
            </linearGradient>
          </defs>

          {/* Main quarter-circle housing — fills bottom-right corner */}
          <path d="M 280 280 L 280 80 A 200 200 0 0 0 80 280 Z"
            fill="url(#housing-bg)" stroke="#5c3310" strokeWidth="2" opacity="0.92" />

          {/* Divider lines splitting housing into 4 segments */}
          {/* Diagonal from corner to arc midpoint */}
          <line x1="280" y1="280" x2="139" y2="139" stroke="#c4a572" strokeWidth="1.5" opacity="0.5" />
          {/* Horizontal from corner to arc */}
          <line x1="280" y1="280" x2="80" y2="280" stroke="#c4a572" strokeWidth="1" opacity="0.3" />
          {/* Vertical from corner to arc */}
          <line x1="280" y1="280" x2="280" y2="80" stroke="#c4a572" strokeWidth="1" opacity="0.3" />

          {/* Gold filigree arc along the curved edge */}
          <path d="M 280 80 A 200 200 0 0 0 80 280"
            fill="none" stroke="#c4a572" strokeWidth="2" opacity="0.6" />
          <path d="M 275 100 A 180 180 0 0 0 100 275"
            fill="none" stroke="#c4a572" strokeWidth="0.8" opacity="0.35" />

          {/* Corner filigree */}
          <circle cx="265" cy="265" r="8" fill="none" stroke="#c4a572" strokeWidth="1.5" opacity="0.5" />
          <circle cx="265" cy="265" r="4" fill="none" stroke="#c4a572" strokeWidth="1" opacity="0.35" />

          {/* Iron rivets along edges */}
          <circle cx="270" cy="140" r="3" fill="#4a3728" stroke="#2c1e16" strokeWidth="1" opacity="0.6" />
          <circle cx="270" cy="200" r="3" fill="#4a3728" stroke="#2c1e16" strokeWidth="1" opacity="0.6" />
          <circle cx="140" cy="270" r="3" fill="#4a3728" stroke="#2c1e16" strokeWidth="1" opacity="0.6" />
          <circle cx="200" cy="270" r="3" fill="#4a3728" stroke="#2c1e16" strokeWidth="1" opacity="0.6" />

          {/* Wood grain */}
          <path d="M 260 260 Q 220 250 200 270" stroke="#5c3310" strokeWidth="0.6" fill="none" opacity="0.2" />
          <path d="M 270 230 Q 240 220 220 245" stroke="#5c3310" strokeWidth="0.5" fill="none" opacity="0.15" />

          {/* Active segment highlight overlays */}
          {activeAction === 'attack' && (
            <path d="M 280 280 L 280 180 A 100 100 0 0 0 210 250 Z" fill="url(#seg-glow)" opacity="0.3" />
          )}
          {activeAction === 'jump' && (
            <path d="M 280 280 L 210 210 A 100 100 0 0 0 280 180 Z" fill="url(#seg-glow)" opacity="0.3" />
          )}
          {activeAction === 'defend' && (
            <path d="M 280 280 L 180 280 A 100 100 0 0 0 210 210 Z" fill="url(#seg-glow)" opacity="0.3" />
          )}
          {activeAction === 'crouch' && (
            <path d="M 280 280 L 210 250 A 100 100 0 0 0 180 280 Z" fill="url(#seg-glow)" opacity="0.3" />
          )}
        </svg>

        {/* Touchable action zones on the housing body */}
        {/* Attack — right edge zone (between joystick and right screen edge) */}
        <button onTouchStart={(e) => onActionTap('attack', e)}
          className="absolute flex items-center justify-center"
          style={{ right: 4, bottom: 100, width: 50, height: 70, background: 'transparent', border: 'none', touchAction: 'none', pointerEvents: 'auto', zIndex: 5 }}>
          <Sword className="w-5 h-5 text-amber-300/60" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))' }} />
        </button>

        {/* Jump — top-right zone */}
        <button onTouchStart={(e) => onActionTap('jump', e)}
          className="absolute flex items-center justify-center"
          style={{ right: 60, bottom: 160, width: 60, height: 50, background: 'transparent', border: 'none', touchAction: 'none', pointerEvents: 'auto', zIndex: 5 }}>
          <ArrowUp className="w-5 h-5 text-amber-300/60" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))' }} />
        </button>

        {/* Defend — bottom-left zone */}
        <button onTouchStart={(e) => onActionTap('defend', e)}
          className="absolute flex items-center justify-center"
          style={{ right: 140, bottom: 20, width: 60, height: 50, background: 'transparent', border: 'none', touchAction: 'none', pointerEvents: 'auto', zIndex: 5 }}>
          <Shield className="w-5 h-5 text-amber-300/60" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))' }} />
        </button>

        {/* Crouch — bottom edge zone */}
        <button onTouchStart={(e) => onActionTap('crouch', e)}
          className="absolute flex items-center justify-center"
          style={{ right: 60, bottom: 10, width: 60, height: 50, background: 'transparent', border: 'none', touchAction: 'none', pointerEvents: 'auto', zIndex: 5 }}>
          <ArrowDown className="w-5 h-5 text-amber-300/60" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))' }} />
        </button>

        {/* Camera joystick — positioned at the curved edge of the quarter moon */}
        <div
          ref={rightRef}
          onTouchStart={onRightStart}
          onTouchMove={onRightMove}
          onTouchEnd={onRightEnd}
          className="absolute"
          style={{ right: 70, bottom: 70, zIndex: 10 }}
        >
          <JoystickBase>
            <JoystickKnob position={rightStick.position} active={rightStick.active} />
          </JoystickBase>
        </div>
      </div>
    </div>
  );
}
