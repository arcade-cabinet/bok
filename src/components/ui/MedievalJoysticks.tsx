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
  moveX: number;       // -1 to 1
  moveZ: number;       // -1 to 1
  lookDX: number;      // delta this frame
  lookDY: number;      // delta this frame
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
  const outputRef = useRef<MedievalJoystickOutput>({ moveX: 0, moveZ: 0, lookDX: 0, lookDY: 0, action: null });

  const [leftStick, setLeftStick] = useState<JoystickState>({ active: false, position: { x: 0, y: 0 }, identifier: null });
  const [rightStick, setRightStick] = useState<JoystickState>({ active: false, position: { x: 0, y: 0 }, identifier: null });
  const [activeAction, setActiveAction] = useState<string | null>(null);

  const rightLastPos = useRef<Position>({ x: 0, y: 0 });

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

  // Right joystick handlers (camera look via delta)
  const onRightStart = useCallback((e: TouchEvent) => {
    e.preventDefault();
    const t = e.changedTouches[0];
    if (!rightRef.current) return;
    const c = getCenter(rightRef.current);
    const pos = clampToRadius(t.clientX - c.x, t.clientY - c.y, MAX_DISTANCE);
    setRightStick({ active: true, position: pos, identifier: t.identifier });
    rightLastPos.current = { x: t.clientX, y: t.clientY };
  }, []);

  const onRightMove = useCallback((e: TouchEvent) => {
    e.preventDefault();
    if (!rightRef.current) return;
    for (const t of Array.from(e.changedTouches)) {
      if (t.identifier === rightStick.identifier) {
        const c = getCenter(rightRef.current);
        const pos = clampToRadius(t.clientX - c.x, t.clientY - c.y, MAX_DISTANCE);
        setRightStick(prev => ({ ...prev, position: pos }));
        outputRef.current.lookDX = t.clientX - rightLastPos.current.x;
        outputRef.current.lookDY = t.clientY - rightLastPos.current.y;
        rightLastPos.current = { x: t.clientX, y: t.clientY };
        onOutput({ ...outputRef.current });
        // Reset delta after emit
        outputRef.current.lookDX = 0;
        outputRef.current.lookDY = 0;
      }
    }
  }, [rightStick.identifier, onOutput]);

  const onRightEnd = useCallback((e: TouchEvent) => {
    e.preventDefault();
    for (const t of Array.from(e.changedTouches)) {
      if (t.identifier === rightStick.identifier) {
        setRightStick({ active: false, position: { x: 0, y: 0 }, identifier: null });
      }
    }
  }, [rightStick.identifier]);

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

      {/* RIGHT: Camera joystick + action segment ring + quarter-moon housing */}
      <div className="absolute bottom-4 right-4 pointer-events-auto" style={{ touchAction: 'none' }}>
        <CornerHousing side="right" />
        <div className="relative z-10">
          <div className="text-center mb-1">
            <span className="text-[9px] font-bold text-amber-200/60 tracking-wider uppercase" style={{ fontFamily: 'serif' }}>
              Look
            </span>
          </div>
          <div className="relative" style={{ width: JOYSTICK_SIZE + 64, height: JOYSTICK_SIZE + 64 }}>
            {/* Action segment buttons around the joystick */}
            {ACTIONS.map(action => {
              const rad = (action.angle - 90) * (Math.PI / 180);
              const ringRadius = (JOYSTICK_SIZE + 64) / 2 - 20;
              const cx = (JOYSTICK_SIZE + 64) / 2 + Math.cos(rad) * ringRadius;
              const cy = (JOYSTICK_SIZE + 64) / 2 + Math.sin(rad) * ringRadius;
              const isActive = activeAction === action.id;

              return (
                <button
                  key={action.id}
                  onTouchStart={(e) => onActionTap(action.id, e)}
                  className="absolute rounded-full flex items-center justify-center pointer-events-auto"
                  style={{
                    width: 40,
                    height: 40,
                    left: cx - 20,
                    top: cy - 20,
                    touchAction: 'none',
                    background: isActive
                      ? 'radial-gradient(circle, #dc2626, #991b1b)'
                      : 'radial-gradient(circle at 38% 38%, #78350f, #451a03)',
                    boxShadow: isActive
                      ? '0 0 12px rgba(220,38,38,0.6), inset 0 2px 4px rgba(0,0,0,0.5)'
                      : 'inset 0 -1px 3px rgba(0,0,0,0.4), 0 2px 6px rgba(0,0,0,0.4)',
                    border: `1.5px solid ${isActive ? '#7f1d1d' : '#5c3310'}`,
                    transition: 'background 0.1s, box-shadow 0.1s',
                  }}
                >
                  <div className="text-amber-100/80" style={{ filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.6))' }}>
                    {action.icon}
                  </div>
                </button>
              );
            })}

            {/* Center camera joystick */}
            <div
              ref={rightRef}
              onTouchStart={onRightStart}
              onTouchMove={onRightMove}
              onTouchEnd={onRightEnd}
              className="absolute"
              style={{ left: 32, top: 32 }}
            >
              <JoystickBase>
                <JoystickKnob position={rightStick.position} active={rightStick.active} />
              </JoystickBase>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
