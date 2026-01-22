import { defineConfig } from "@playwright/test";

const port = Number(process.env.E2E_PORT || 3127);

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: `http://127.0.0.1:${port}`,
  },
  webServer: {
    command: `pnpm exec next dev --webpack -p ${port}`,
    url: `http://127.0.0.1:${port}`,
    timeout: 120_000,
    reuseExistingServer: false,
    env: {
      ...process.env,
      E2E: "1",
    },
  },
});
