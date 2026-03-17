import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
	testDir: "e2e",
	testMatch: "**/*.e2e.ts",
	timeout: 60_000,
	fullyParallel: false, // game tests need sequential access
	retries: 0,
	reporter: "list",
	use: {
		baseURL: "http://localhost:5173/bok/",
		trace: "on-first-retry",
		permissions: ["clipboard-read"],
	},
	webServer: {
		command: "pnpm dev",
		port: 5173,
		reuseExistingServer: true,
		timeout: 30_000,
	},
	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"] },
		},
	],
});
