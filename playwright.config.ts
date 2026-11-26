import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  use: {
    launchOptions: { executablePath: process.env.CHROMIUM_PATH },
  },
  webServer: {
    command: "pnpm dev --ignore-lock --host 127.0.0.1 --port 4180",
    port: 4180,
  },
});
