/**
 * Default Playwright config — delegates to the E2E config.
 * Allows `pnpm playwright test` to work without -c flag.
 */
export { default } from "./playwright-e2e.config.ts";
