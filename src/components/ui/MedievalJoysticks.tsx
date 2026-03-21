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

      {/* RIGHT: Quarter-moon housing — 4 distinct segment panels + joystick at curve */}
      <div className="absolute bottom-0 right-0 pointer-events-auto" style={{ touchAction: 'none', width: 280, height: 280 }}>
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 280 280">
          <defs>
            <linearGradient id="seg-rest-1" x1="100%" y1="0%" x2="50%" y2="100%">
              <stop offset="0%" stopColor="#8b6914" /><stop offset="100%" stopColor="#5c3d10" />
            </linearGradient>
            <linearGradient id="seg-rest-2" x1="80%" y1="0%" x2="20%" y2="100%">
              <stop offset="0%" stopColor="#7a5c12" /><stop offset="100%" stopColor="#4a3010" />
            </linearGradient>
            <linearGradient id="seg-rest-3" x1="50%" y1="0%" x2="100%" y2="80%">
              <stop offset="0%" stopColor="#6b4e14" /><stop offset="100%" stopColor="#3d2808" />
            </linearGradient>
            <linearGradient id="seg-rest-4" x1="0%" y1="50%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#7a5818" /><stop offset="100%" stopColor="#4a3510" />
            </linearGradient>
            <linearGradient id="seg-pressed" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3d2206" /><stop offset="100%" stopColor="#2a1804" />
            </linearGradient>
            <filter id="pressed-shadow">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.6" />
            </filter>
          </defs>

          {/* Corner point = 280,280. Arc from (280,80) to (80,280). */}
          {/* 4 segments split by two lines: corner→arc-midpoint and the two edges */}

          {/* 4 segments splitting the quarter-circle into equal wedges.
              Corner = 280,280. Arc radius 200. Arc from 270° (top) to 180° (left).
              Quarter-points on arc at 270°, 247.5°, 225°, 202.5°, 180°.
              Segment edges radiate from corner (280,280) to these arc points. */}

          {/* Arc quarter-points (angles measured from center at 280,280): */}
          {/* 270° = (280, 80)  — top */}
          {/* 247.5° = (280 + cos(247.5°)*200, 280 + sin(247.5°)*200) = (280-76.5, 280-184.8) = (203.5, 95.2) */}
          {/* 225° = (280 + cos(225°)*200, 280 + sin(225°)*200) = (280-141.4, 280-141.4) = (138.6, 138.6) — diagonal */}
          {/* 202.5° = (280 + cos(202.5°)*200, 280 + sin(202.5°)*200) = (280-184.8, 280-76.5) = (95.2, 203.5) */}
          {/* 180° = (80, 280) — left */}

          {/* Segment 1: JUMP — top wedge */}
          <path d="M 280 280 L 280 80 A 200 200 0 0 0 203.5 95.2 Z"
            fill={activeAction === 'jump' ? 'url(#seg-pressed)' : 'url(#seg-rest-1)'}
            stroke="#c4a572" strokeWidth="1.2" opacity="0.9"
            filter={activeAction === 'jump' ? 'url(#pressed-shadow)' : undefined}
            style={{ pointerEvents: 'auto', cursor: 'pointer', touchAction: 'none' }}
            onTouchStart={(e: any) => onActionTap('jump', e)} />

          {/* Segment 2: ATTACK — upper-middle wedge */}
          <path d="M 280 280 L 203.5 95.2 A 200 200 0 0 0 138.6 138.6 Z"
            fill={activeAction === 'attack' ? 'url(#seg-pressed)' : 'url(#seg-rest-2)'}
            stroke="#c4a572" strokeWidth="1.2" opacity="0.9"
            filter={activeAction === 'attack' ? 'url(#pressed-shadow)' : undefined}
            style={{ pointerEvents: 'auto', cursor: 'pointer', touchAction: 'none' }}
            onTouchStart={(e: any) => onActionTap('attack', e)} />

          {/* Segment 3: DEFEND — lower-middle wedge */}
          <path d="M 280 280 L 138.6 138.6 A 200 200 0 0 0 95.2 203.5 Z"
            fill={activeAction === 'defend' ? 'url(#seg-pressed)' : 'url(#seg-rest-3)'}
            stroke="#c4a572" strokeWidth="1.2" opacity="0.9"
            filter={activeAction === 'defend' ? 'url(#pressed-shadow)' : undefined}
            style={{ pointerEvents: 'auto', cursor: 'pointer', touchAction: 'none' }}
            onTouchStart={(e: any) => onActionTap('defend', e)} />

          {/* Segment 4: CROUCH — bottom wedge */}
          <path d="M 280 280 L 95.2 203.5 A 200 200 0 0 0 80 280 Z"
            fill={activeAction === 'crouch' ? 'url(#seg-pressed)' : 'url(#seg-rest-4)'}
            stroke="#c4a572" strokeWidth="1.2" opacity="0.9"
            filter={activeAction === 'crouch' ? 'url(#pressed-shadow)' : undefined}
            style={{ pointerEvents: 'auto', cursor: 'pointer', touchAction: 'none' }}
            onTouchStart={(e: any) => onActionTap('crouch', e)} />

          {/* Gold filigree divider lines from corner to each arc quarter-point */}
          <line x1="280" y1="280" x2="203.5" y2="95.2" stroke="#c4a572" strokeWidth="1.5" opacity="0.6" />
          <line x1="280" y1="280" x2="138.6" y2="138.6" stroke="#c4a572" strokeWidth="2" opacity="0.7" />
          <line x1="280" y1="280" x2="95.2" y2="203.5" stroke="#c4a572" strokeWidth="1.5" opacity="0.6" />

          {/* Gold outer arc */}
          <path d="M 280 80 A 200 200 0 0 0 80 280" fill="none" stroke="#c4a572" strokeWidth="2.5" opacity="0.7" />
          {/* Inner filigree arc */}
          <path d="M 270 120 A 170 170 0 0 0 120 270" fill="none" stroke="#c4a572" strokeWidth="0.8" opacity="0.3" />

          {/* Corner ornament */}
          <circle cx="268" cy="268" r="10" fill="none" stroke="#c4a572" strokeWidth="1.8" opacity="0.5" />
          <circle cx="268" cy="268" r="5" fill="#c4a572" opacity="0.15" />
          <circle cx="268" cy="268" r="3" fill="none" stroke="#c4a572" strokeWidth="0.8" opacity="0.4" />

          {/* Scroll flourishes along edges */}
          <path d="M 275 130 Q 272 150 275 170" stroke="#c4a572" strokeWidth="1" fill="none" opacity="0.4" />
          <path d="M 130 275 Q 150 272 170 275" stroke="#c4a572" strokeWidth="1" fill="none" opacity="0.4" />

          {/* Iron rivets */}
          <circle cx="272" cy="100" r="3.5" fill="#4a3728" stroke="#2c1e16" strokeWidth="1.2" />
          <circle cx="272" cy="190" r="3.5" fill="#4a3728" stroke="#2c1e16" strokeWidth="1.2" />
          <circle cx="100" cy="272" r="3.5" fill="#4a3728" stroke="#2c1e16" strokeWidth="1.2" />
          <circle cx="190" cy="272" r="3.5" fill="#4a3728" stroke="#2c1e16" strokeWidth="1.2" />

          {/* Tiny filigree dots along the arc */}
          <circle cx="240" cy="107" r="2" fill="#c4a572" opacity="0.3" />
          <circle cx="200" cy="95" r="2" fill="#c4a572" opacity="0.3" />
          <circle cx="107" cy="240" r="2" fill="#c4a572" opacity="0.3" />
          <circle cx="95" cy="200" r="2" fill="#c4a572" opacity="0.3" />
        </svg>

        {/* Icon overlays — centered in each wedge, pointer-events-none */}
        {/* Jump — top wedge */}
        <div className="absolute flex items-center justify-center pointer-events-none"
          style={{ right: 10, bottom: 195, width: 30, height: 30 }}>
          <ArrowUp className={`w-4 h-4 transition-colors duration-100 ${activeAction === 'jump' ? 'text-amber-100' : 'text-amber-400/40'}`}
            style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.9))' }} />
        </div>
        {/* Attack — upper-mid wedge */}
        <div className="absolute flex items-center justify-center pointer-events-none"
          style={{ right: 65, bottom: 180, width: 30, height: 30 }}>
          <Sword className={`w-4 h-4 transition-colors duration-100 ${activeAction === 'attack' ? 'text-amber-100' : 'text-amber-400/40'}`}
            style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.9))' }} />
        </div>
        {/* Defend — lower-mid wedge */}
        <div className="absolute flex items-center justify-center pointer-events-none"
          style={{ right: 150, bottom: 100, width: 30, height: 30 }}>
          <Shield className={`w-4 h-4 transition-colors duration-100 ${activeAction === 'defend' ? 'text-amber-100' : 'text-amber-400/40'}`}
            style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.9))' }} />
        </div>
        {/* Crouch — bottom wedge */}
        <div className="absolute flex items-center justify-center pointer-events-none"
          style={{ right: 155, bottom: 15, width: 30, height: 30 }}>
          <ArrowDown className={`w-4 h-4 transition-colors duration-100 ${activeAction === 'crouch' ? 'text-amber-100' : 'text-amber-400/40'}`}
            style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.9))' }} />
        </div>

        {/* Camera joystick — at the curved edge */}
        <div ref={rightRef} onTouchStart={onRightStart} onTouchMove={onRightMove} onTouchEnd={onRightEnd}
          className="absolute" style={{ right: 55, bottom: 55, zIndex: 10 }}>
          <JoystickBase>
            <JoystickKnob position={rightStick.position} active={rightStick.active} />
          </JoystickBase>
        </div>
      </div>
    </div>
  );
}
