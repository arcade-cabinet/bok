import { expect, test } from "@playwright/experimental-ct-react";
import { BokPage } from "./BokPage.tsx";

test.describe("BokPage", () => {
	test("renders title", async ({ mount }) => {
		const component = await mount(<BokPage title="Test Page" />);
		await expect(component.getByText("Test Page")).toBeVisible();
	});

	test("renders children content", async ({ mount }) => {
		const component = await mount(
			<BokPage title="My Page">
				<p>Custom content here</p>
			</BokPage>,
		);
		await expect(component.getByText("Custom content here")).toBeVisible();
	});

	test("shows placeholder when no children", async ({ mount }) => {
		const component = await mount(<BokPage title="Empty Page" />);
		await expect(component.getByText("These pages are yet unwritten...")).toBeVisible();
	});

	test("has rune border decorations", async ({ mount }) => {
		const component = await mount(<BokPage title="Runes" />);
		const decorations = component.locator("[aria-hidden='true']");
		await expect(decorations).toHaveCount(2);
	});

	test("has data-testid", async ({ mount }) => {
		const component = await mount(<BokPage title="Test" />);
		await expect(component.getByTestId("bok-page")).toBeVisible();
	});
});
