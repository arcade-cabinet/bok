import { expect, test } from "@playwright/experimental-ct-react";
import { DeathScreen } from "./DeathScreen.tsx";

test.describe("DeathScreen", () => {
	test("renders FALLEN header and lore text", async ({ mount }) => {
		const component = await mount(<DeathScreen onRespawn={() => {}} />);
		await expect(component.getByText("FALLEN")).toBeVisible();
		await expect(component.getByText(/wilderness claims/)).toBeVisible();
	});

	test("renders Return button with type=button", async ({ mount }) => {
		const component = await mount(<DeathScreen onRespawn={() => {}} />);
		const btn = component.getByRole("button", { name: "Return" });
		await expect(btn).toBeVisible();
		await expect(btn).toHaveAttribute("type", "button");
	});

	test("calls onRespawn when Return is clicked", async ({ mount }) => {
		let called = false;
		const component = await mount(
			<DeathScreen
				onRespawn={() => {
					called = true;
				}}
			/>,
		);
		await component.getByRole("button", { name: "Return" }).click();
		expect(called).toBe(true);
	});
});
