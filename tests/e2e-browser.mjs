import { chromium, devices, webkit } from "playwright";

export const browserName = process.env.E2E_BROWSER ?? "chromium";
export const browserType = { chromium, webkit }[browserName];

if (!browserType) throw new Error(`Unsupported E2E browser: ${browserName}`);

export { devices };
