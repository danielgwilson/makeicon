import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: "http://localhost:3107",
  },
  webServer: {
    command: "pnpm dev -p 3107",
    url: "http://localhost:3107",
    reuseExistingServer: !process.env.CI,
    env: {
      ...process.env,
      E2E: "1",
    },
  },
});
