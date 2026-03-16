import { defineConfig, devices } from "@playwright/experimental-ct-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
	testDir: "src",
	testMatch: "**/*.ct.tsx",
	snapshotDir: "__snapshots__",
	timeout: 30_000,
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: process.env.CI ? "github" : "list",
	use: {
		trace: "on-first-retry",
		ctPort: 3100,
		ctViteConfig: {
			plugins: [tailwindcss()],
		},
	},
	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"] },
		},
	],
});
