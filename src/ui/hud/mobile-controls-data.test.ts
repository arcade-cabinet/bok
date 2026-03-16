import { describe, expect, it } from "vitest";
import {
	BUTTON_LAYOUTS,
	HAPTIC_PATTERNS,
	isInThumbZone,
	MIN_TOUCH_TARGET,
	scaledButtonSize,
	THUMB_ZONE_TOP_PERCENT,
} from "./mobile-controls-data.ts";

describe("mobile-controls-data", () => {
	describe("MIN_TOUCH_TARGET", () => {
		it("is at least 48px per WCAG guidelines", () => {
			expect(MIN_TOUCH_TARGET).toBeGreaterThanOrEqual(48);
		});
	});

	describe("BUTTON_LAYOUTS", () => {
		it("has 5 buttons: mine, place, jump, bok, inventory", () => {
			const ids = BUTTON_LAYOUTS.map((b) => b.id);
			expect(ids).toContain("mine");
			expect(ids).toContain("place");
			expect(ids).toContain("jump");
			expect(ids).toContain("bok");
			expect(ids).toContain("inventory");
			expect(BUTTON_LAYOUTS.length).toBe(5);
		});

		it("all buttons have non-empty labels and icons", () => {
			for (const btn of BUTTON_LAYOUTS) {
				expect(btn.label.length).toBeGreaterThan(0);
				expect(btn.icon.length).toBeGreaterThan(0);
			}
		});

		it("action buttons (mine/place/jump) are on the right side", () => {
			for (const btn of BUTTON_LAYOUTS) {
				if (btn.id === "mine" || btn.id === "place" || btn.id === "jump") {
					expect(btn.side).toBe("right");
				}
			}
		});

		it("navigation buttons (bok/inventory) are on the left side", () => {
			for (const btn of BUTTON_LAYOUTS) {
				if (btn.id === "bok" || btn.id === "inventory") {
					expect(btn.side).toBe("left");
				}
			}
		});
	});

	describe("HAPTIC_PATTERNS", () => {
		it("defines patterns for place, mine, damage, jump", () => {
			expect(HAPTIC_PATTERNS.place).toBeDefined();
			expect(HAPTIC_PATTERNS.mine).toBeDefined();
			expect(HAPTIC_PATTERNS.damage).toBeDefined();
			expect(HAPTIC_PATTERNS.jump).toBeDefined();
		});

		it("place is light, mine is medium, damage is heavy", () => {
			expect(HAPTIC_PATTERNS.place.intensity).toBe("light");
			expect(HAPTIC_PATTERNS.mine.intensity).toBe("medium");
			expect(HAPTIC_PATTERNS.damage.intensity).toBe("heavy");
		});
	});

	describe("isInThumbZone", () => {
		const vp = 800; // viewport height

		it("returns true for buttons in the bottom 40%", () => {
			// bottomPx=100 → top edge = 800 - 100 - 48 = 652 → thumb zone top = 480
			expect(isInThumbZone(100, vp)).toBe(true);
		});

		it("returns false for buttons in the top area", () => {
			// bottomPx=700 → top edge = 800 - 700 - 48 = 52 → thumb zone top = 480
			expect(isInThumbZone(700, vp)).toBe(false);
		});

		it("returns true exactly at the boundary", () => {
			// thumbZoneTop = 800 * 0.6 = 480
			// need topEdge >= 480: 800 - bottomPx - 48 >= 480 → bottomPx <= 272
			expect(isInThumbZone(272, vp)).toBe(true);
		});
	});

	describe("scaledButtonSize", () => {
		it("respects minimum touch target", () => {
			expect(scaledButtonSize(30, 1.0)).toBe(MIN_TOUCH_TARGET);
		});

		it("scales up from base", () => {
			expect(scaledButtonSize(48, 1.5)).toBe(72);
		});

		it("rounds to nearest integer", () => {
			expect(scaledButtonSize(50, 1.1)).toBe(55);
		});
	});

	describe("THUMB_ZONE_TOP_PERCENT", () => {
		it("is 60 (meaning bottom 40% is the thumb zone)", () => {
			expect(THUMB_ZONE_TOP_PERCENT).toBe(60);
		});
	});
});
