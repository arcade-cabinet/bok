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
    outputRef.current.moveZ = pos.y / MAX_DISTANCE;
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
        outputRef.current.moveZ = pos.y / MAX_DISTANCE;
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

      {/* RIGHT: Camera joystick with segmented outer ring housing */}
      <div className="absolute bottom-0 right-0 pointer-events-auto" style={{ touchAction: 'none' }}>
        <CornerHousing side="right" />
        <div className="relative z-10" style={{ width: 220, height: 220, marginRight: 8, marginBottom: 8 }}>
          {/* Segmented outer ring — 4 quarter-arc touch zones */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 220 220" style={{ pointerEvents: 'none' }}>
            <defs>
              <linearGradient id="seg-idle" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#78350f" />
                <stop offset="100%" stopColor="#451a03" />
              </linearGradient>
              <linearGradient id="seg-active" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#991b1b" />
                <stop offset="100%" stopColor="#7f1d1d" />
              </linearGradient>
            </defs>
            {/* Outer ring arcs — each is a quarter of the donut */}
            {ACTIONS.map((action) => {
              const startAngle = (action.angle - 45) * (Math.PI / 180);
              const endAngle = (action.angle + 45) * (Math.PI / 180);
              const outerR = 105;
              const innerR = 78;
              const cx = 110, cy = 110;
              const x1o = cx + Math.cos(startAngle) * outerR;
              const y1o = cy + Math.sin(startAngle) * outerR;
              const x2o = cx + Math.cos(endAngle) * outerR;
              const y2o = cy + Math.sin(endAngle) * outerR;
              const x2i = cx + Math.cos(endAngle) * innerR;
              const y2i = cy + Math.sin(endAngle) * innerR;
              const x1i = cx + Math.cos(startAngle) * innerR;
              const y1i = cy + Math.sin(startAngle) * innerR;
              const isActive = activeAction === action.id;
              return (
                <path
                  key={action.id}
                  d={`M${x1o},${y1o} A${outerR},${outerR} 0 0,1 ${x2o},${y2o} L${x2i},${y2i} A${innerR},${innerR} 0 0,0 ${x1i},${y1i} Z`}
                  fill={isActive ? 'url(#seg-active)' : 'url(#seg-idle)'}
                  stroke="#c4a572"
                  strokeWidth="1"
                  opacity="0.85"
                />
              );
            })}
            {/* Gold filigree divider lines between segments */}
            {[0, 90, 180, 270].map(angle => {
              const rad = angle * (Math.PI / 180);
              return (
                <line key={angle}
                  x1={110 + Math.cos(rad) * 78} y1={110 + Math.sin(rad) * 78}
                  x2={110 + Math.cos(rad) * 105} y2={110 + Math.sin(rad) * 105}
                  stroke="#c4a572" strokeWidth="1.5" opacity="0.6"
                />
              );
            })}
          </svg>

          {/* Touch zones for each segment (invisible, on top of SVG) */}
          {ACTIONS.map((action) => {
            const midAngle = action.angle * (Math.PI / 180);
            const iconR = 91;
            const iconX = 110 + Math.cos(midAngle) * iconR;
            const iconY = 110 + Math.sin(midAngle) * iconR;
            const touchR = 92;
            const touchX = 110 + Math.cos(midAngle) * touchR;
            const touchY = 110 + Math.sin(midAngle) * touchR;
            return (
              <button
                key={action.id}
                onTouchStart={(e) => onActionTap(action.id, e)}
                className="absolute flex items-center justify-center"
                style={{
                  width: 44, height: 44,
                  left: touchX - 22, top: touchY - 22,
                  borderRadius: '50%',
                  background: 'transparent',
                  border: 'none',
                  touchAction: 'none',
                  pointerEvents: 'auto',
                  zIndex: 5,
                }}
              >
                <div className="text-amber-200/70" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))', position: 'absolute', left: iconX - touchX + 22 - 8, top: iconY - touchY + 22 - 8 }}>
                  {action.icon}
                </div>
              </button>
            );
          })}

          {/* Center camera joystick (inside the ring) */}
          <div
            ref={rightRef}
            onTouchStart={onRightStart}
            onTouchMove={onRightMove}
            onTouchEnd={onRightEnd}
            className="absolute"
            style={{ left: 110 - JOYSTICK_SIZE / 2, top: 110 - JOYSTICK_SIZE / 2 }}
          >
            <JoystickBase>
              <JoystickKnob position={rightStick.position} active={rightStick.active} />
            </JoystickBase>
          </div>
        </div>
      </div>
    </div>
  );
}
