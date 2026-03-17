/**
 * MobileControls — visible touch controls overlay for mobile gameplay.
 * Renders a virtual joystick nub (left side) and action buttons (bottom 40%).
 *
 * This component is purely presentational + event-dispatching.
 * Actual input polling happens in InputBehavior (JP engine layer).
 */

import { useCallback } from "react";
import {
	BUTTON_LAYOUTS,
	JOYSTICK_ACTIVE_OPACITY,
	JOYSTICK_BASE_RADIUS,
	JOYSTICK_IDLE_OPACITY,
	JOYSTICK_NUB_RADIUS,
	MIN_TOUCH_TARGET,
	type MobileButtonId,
} from "./mobile-controls-data.ts";

export interface MobileControlsProps {
	/** Whether the joystick is currently being touched. */
	joystickActive: boolean;
	/** Joystick nub offset from center (px), clamped to base radius. */
	joystickX: number;
	joystickY: number;
	/** Center position of the joystick base (px from viewport origin). */
	joystickCenterX: number;
	joystickCenterY: number;
	/** Button press handlers. */
	onButtonPress: (id: MobileButtonId) => void;
	onButtonRelease: (id: MobileButtonId) => void;
	/** User's button scale preference (1.0 = default). */
	buttonScale?: number;
}

export function MobileControls({
	joystickActive,
	joystickX,
	joystickY,
	joystickCenterX,
	joystickCenterY,
	onButtonPress,
	onButtonRelease,
	buttonScale = 1.0,
}: MobileControlsProps) {
	const size = Math.max(MIN_TOUCH_TARGET, Math.round(MIN_TOUCH_TARGET * buttonScale));

	return (
		<div className="absolute inset-0 z-20 pointer-events-none" data-testid="mobile-controls" aria-hidden="true">
			{/* Joystick base + nub */}
			<JoystickOverlay
				active={joystickActive}
				offsetX={joystickX}
				offsetY={joystickY}
				centerX={joystickCenterX}
				centerY={joystickCenterY}
			/>

			{/* Action buttons */}
			{BUTTON_LAYOUTS.map((btn) => (
				<ActionButton
					key={btn.id}
					id={btn.id}
					icon={btn.icon}
					label={btn.label}
					side={btn.side}
					bottomPx={btn.bottomPx}
					sidePx={btn.sidePx}
					size={size}
					onPress={onButtonPress}
					onRelease={onButtonRelease}
				/>
			))}
		</div>
	);
}

// ─── Joystick Visual ───

interface JoystickOverlayProps {
	active: boolean;
	offsetX: number;
	offsetY: number;
	centerX: number;
	centerY: number;
}

function JoystickOverlay({ active, offsetX, offsetY, centerX, centerY }: JoystickOverlayProps) {
	const opacity = active ? JOYSTICK_ACTIVE_OPACITY : JOYSTICK_IDLE_OPACITY;
	const baseD = JOYSTICK_BASE_RADIUS * 2;
	const nubD = JOYSTICK_NUB_RADIUS * 2;

	// Only show when there's a valid center position (i.e., after first touch)
	if (centerX === 0 && centerY === 0 && !active) return null;

	return (
		<>
			{/* Base ring */}
			<div
				className="absolute rounded-full border-2 border-white/40 pointer-events-none"
				data-testid="joystick-base"
				style={{
					width: baseD,
					height: baseD,
					left: centerX - JOYSTICK_BASE_RADIUS,
					top: centerY - JOYSTICK_BASE_RADIUS,
					opacity,
					background: "radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)",
					transition: "opacity 0.15s ease",
				}}
			/>
			{/* Nub */}
			<div
				className="absolute rounded-full bg-white/50 pointer-events-none"
				data-testid="joystick-nub"
				style={{
					width: nubD,
					height: nubD,
					left: centerX + offsetX - JOYSTICK_NUB_RADIUS,
					top: centerY + offsetY - JOYSTICK_NUB_RADIUS,
					opacity: active ? 0.8 : 0.4,
					transition: active ? "none" : "opacity 0.15s ease",
					boxShadow: "0 0 8px rgba(0,0,0,0.5)",
				}}
			/>
		</>
	);
}

// ─── Action Button ───

interface ActionButtonProps {
	id: MobileButtonId;
	icon: string;
	label: string;
	side: "left" | "right";
	bottomPx: number;
	sidePx: number;
	size: number;
	onPress: (id: MobileButtonId) => void;
	onRelease: (id: MobileButtonId) => void;
}

function ActionButton({ id, icon, label, side, bottomPx, sidePx, size, onPress, onRelease }: ActionButtonProps) {
	const handleTouchStart = useCallback(
		(e: React.TouchEvent) => {
			e.stopPropagation();
			onPress(id);
		},
		[id, onPress],
	);

	const handleTouchEnd = useCallback(
		(e: React.TouchEvent) => {
			e.stopPropagation();
			onRelease(id);
		},
		[id, onRelease],
	);

	const posStyle: React.CSSProperties = {
		bottom: bottomPx,
		width: size,
		height: size,
		...(side === "right" ? { right: sidePx } : { left: sidePx }),
	};

	return (
		<button
			type="button"
			className="absolute pointer-events-auto flex items-center justify-center rounded-xl bg-black/30 border border-white/20 active:bg-white/20 active:scale-95 transition-transform duration-75 select-none"
			style={posStyle}
			data-testid={`mobile-btn-${id}`}
			aria-label={label}
			onTouchStart={handleTouchStart}
			onTouchEnd={handleTouchEnd}
			onTouchCancel={handleTouchEnd}
		>
			<span className="text-white/80 text-lg select-none" style={{ textShadow: "0 1px 3px rgba(0,0,0,0.8)" }}>
				{icon}
			</span>
		</button>
	);
}
