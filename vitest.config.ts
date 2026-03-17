import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [react(), tailwindcss()],
	optimizeDeps: {
		exclude: ["fsevents"],
	},
	test: {
		projects: [
			{
				extends: true,
				test: {
					name: "unit",
					include: ["src/**/*.test.ts"],
					environment: "node",
				},
			},
			{
				extends: true,
				test: {
					name: "browser",
					include: ["src/**/*.ct.tsx"],
					browser: {
						enabled: true,
						provider: playwright(),
						instances: [{ browser: "chromium" }],
					},
				},
			},
		],
	},
});
