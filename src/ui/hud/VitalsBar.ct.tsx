import { expect, test } from "@playwright/experimental-ct-react";
import { VitalsBar } from "./VitalsBar.tsx";

test.describe("VitalsBar", () => {
	test("renders health, hunger, and stamina bars", async ({ mount }) => {
		const component = await mount(<VitalsBar health={100} hunger={80} stamina={60} />);
		await expect(component).toBeVisible();
	});

	test("renders low health state", async ({ mount }) => {
		const component = await mount(<VitalsBar health={15} hunger={100} stamina={100} />);
		await expect(component).toBeVisible();
	});

	test("renders zero values without crashing", async ({ mount }) => {
		const component = await mount(<VitalsBar health={0} hunger={0} stamina={0} />);
		await expect(component).toBeVisible();
	});
});
