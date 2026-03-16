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

	test("shows slow movement indicator when hungerSlowed", async ({ mount }) => {
		const component = await mount(<VitalsBar health={100} hunger={15} stamina={100} hungerSlowed />);
		await expect(component).toBeVisible();
		await expect(component.getByText("Hungry — movement slowed")).toBeVisible();
	});

	test("does not show slow indicator when not hungerSlowed", async ({ mount }) => {
		const component = await mount(<VitalsBar health={100} hunger={50} stamina={100} hungerSlowed={false} />);
		await expect(component.getByText("Hungry — movement slowed")).not.toBeVisible();
	});

	test("slow indicator has aria-live for accessibility", async ({ mount }) => {
		const component = await mount(<VitalsBar health={100} hunger={15} stamina={100} hungerSlowed />);
		const indicator = component.getByText("Hungry — movement slowed");
		await expect(indicator).toHaveAttribute("aria-live", "polite");
	});

	test("hides when visible=false (diegetic mode)", async ({ mount }) => {
		const component = await mount(<VitalsBar health={100} hunger={80} stamina={60} visible={false} />);
		await expect(component).not.toBeVisible();
	});

	test("shows when visible=true (explicit vitals mode)", async ({ mount }) => {
		const component = await mount(<VitalsBar health={100} hunger={80} stamina={60} visible={true} />);
		await expect(component.getByTestId("vitals-bar")).toBeVisible();
	});
});
