/**
 * Input system constants — button mappings and shared types.
 * Extracted from input-system.ts to keep it under 200 LOC.
 */

export type MouseButton = "left" | "right" | "middle";

/** Maps MouseEvent.button index to named button. */
export const BUTTON_MAP: Record<number, MouseButton> = { 0: "left", 1: "middle", 2: "right" };

export interface Vec2 {
	x: number;
	y: number;
}
