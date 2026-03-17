import { expect, test } from "@playwright/experimental-ct-react";
import { MobileControls } from "./MobileControls.tsx";

const noop = () => {};

test.describe("MobileControls", () => {
	test("renders the mobile controls container", async ({ mount }) => {
		const component = await mount(
			<MobileControls
				joystickActive={false}
				joystickX={0}
				joystickY={0}
				joystickCenterX={0}
				joystickCenterY={0}
				onButtonPress={noop}
				onButtonRelease={noop}
			/>,
		);
		await expect(component.getByTestId("mobile-controls")).toBeVisible();
	});

	test("renders all 5 action buttons", async ({ mount }) => {
		const component = await mount(
			<MobileControls
				joystickActive={false}
				joystickX={0}
				joystickY={0}
				joystickCenterX={0}
				joystickCenterY={0}
				onButtonPress={noop}
				onButtonRelease={noop}
			/>,
		);
		await expect(component.getByTestId("mobile-btn-mine")).toBeVisible();
		await expect(component.getByTestId("mobile-btn-place")).toBeVisible();
		await expect(component.getByTestId("mobile-btn-jump")).toBeVisible();
		await expect(component.getByTestId("mobile-btn-bok")).toBeVisible();
		await expect(component.getByTestId("mobile-btn-inventory")).toBeVisible();
	});

	test("buttons have aria-labels for accessibility", async ({ mount }) => {
		const component = await mount(
			<MobileControls
				joystickActive={false}
				joystickX={0}
				joystickY={0}
				joystickCenterX={0}
				joystickCenterY={0}
				onButtonPress={noop}
				onButtonRelease={noop}
			/>,
		);
		await expect(component.getByTestId("mobile-btn-mine")).toHaveAttribute("aria-label", "Mine");
		await expect(component.getByTestId("mobile-btn-jump")).toHaveAttribute("aria-label", "Jump");
		await expect(component.getByTestId("mobile-btn-bok")).toHaveAttribute("aria-label", "Bok");
	});

	test("buttons are minimum 48px", async ({ mount }) => {
		const component = await mount(
			<MobileControls
				joystickActive={false}
				joystickX={0}
				joystickY={0}
				joystickCenterX={0}
				joystickCenterY={0}
				onButtonPress={noop}
				onButtonRelease={noop}
				buttonScale={1.0}
			/>,
		);
		const btn = component.getByTestId("mobile-btn-mine");
		const box = await btn.boundingBox();
		expect(box).not.toBeNull();
		expect(box?.width).toBeGreaterThanOrEqual(48);
		expect(box?.height).toBeGreaterThanOrEqual(48);
	});

	test("all buttons are positioned in the bottom 40% of viewport", async ({ mount, page }) => {
		const viewport = page.viewportSize();
		expect(viewport).not.toBeNull();
		const thumbZoneTop = viewport?.height * 0.6;

		const component = await mount(
			<MobileControls
				joystickActive={false}
				joystickX={0}
				joystickY={0}
				joystickCenterX={0}
				joystickCenterY={0}
				onButtonPress={noop}
				onButtonRelease={noop}
			/>,
		);

		for (const id of ["mine", "place", "jump", "bok", "inventory"]) {
			const btn = component.getByTestId(`mobile-btn-${id}`);
			const box = await btn.boundingBox();
			expect(box).not.toBeNull();
			// Button top edge should be within the bottom 40%
			expect(box?.y).toBeGreaterThanOrEqual(thumbZoneTop - box?.height);
		}
	});

	test("joystick is hidden when inactive and no center", async ({ mount }) => {
		const component = await mount(
			<MobileControls
				joystickActive={false}
				joystickX={0}
				joystickY={0}
				joystickCenterX={0}
				joystickCenterY={0}
				onButtonPress={noop}
				onButtonRelease={noop}
			/>,
		);
		await expect(component.getByTestId("joystick-base")).toHaveCount(0);
		await expect(component.getByTestId("joystick-nub")).toHaveCount(0);
	});

	test("joystick is visible when active", async ({ mount }) => {
		const component = await mount(
			<MobileControls
				joystickActive={true}
				joystickX={10}
				joystickY={-15}
				joystickCenterX={100}
				joystickCenterY={400}
				onButtonPress={noop}
				onButtonRelease={noop}
			/>,
		);
		await expect(component.getByTestId("joystick-base")).toBeVisible();
		await expect(component.getByTestId("joystick-nub")).toBeVisible();
	});

	test("scaled buttons remain above minimum size", async ({ mount }) => {
		const component = await mount(
			<MobileControls
				joystickActive={false}
				joystickX={0}
				joystickY={0}
				joystickCenterX={0}
				joystickCenterY={0}
				onButtonPress={noop}
				onButtonRelease={noop}
				buttonScale={0.5}
			/>,
		);
		const btn = component.getByTestId("mobile-btn-mine");
		const box = await btn.boundingBox();
		expect(box).not.toBeNull();
		// Even at 0.5 scale, should be at least 48px
		expect(box?.width).toBeGreaterThanOrEqual(48);
	});

	test("mobile controls overlay has correct z-index for pointer events", async ({ mount }) => {
		const component = await mount(
			<MobileControls
				joystickActive={false}
				joystickX={0}
				joystickY={0}
				joystickCenterX={0}
				joystickCenterY={0}
				onButtonPress={noop}
				onButtonRelease={noop}
			/>,
		);
		const container = component.getByTestId("mobile-controls");
		await expect(container).toHaveClass(/z-20/);
		await expect(container).toHaveClass(/pointer-events-none/);
	});
});
