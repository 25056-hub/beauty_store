import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  workers: 1,
  globalSetup: "./e2e/global-setup.js",
  use: {
    baseURL: "http://127.0.0.1:5173",
    trace: "on-first-retry",
  },
  webServer: [
    {
      command: 'cmd /c "cd /d ..\\backend && .\\venv\\Scripts\\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000"',
      url: "http://127.0.0.1:8000",
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: "npm.cmd run dev -- --host 127.0.0.1",
      url: "http://127.0.0.1:5173",
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
