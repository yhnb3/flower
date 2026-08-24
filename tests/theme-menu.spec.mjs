import assert from "node:assert/strict";
import { chromium } from "playwright";

const appUrl = process.env.APP_URL ?? "http://127.0.0.1:5173/";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const runtimeErrors = [];

page.on("pageerror", (error) => runtimeErrors.push(error.message));
page.on("console", (message) => {
  if (message.type() === "error") runtimeErrors.push(message.text());
});

try {
  await page.goto(appUrl, { waitUntil: "networkidle" });

  const shell = page.locator(".app-shell");
  const openThemeMenu = () =>
    page.getByRole("button", { name: /^테마 선택, 현재 / });

  assert.equal(await shell.getAttribute("data-theme"), "light");
  assert.equal(await page.getByText("라이트 · 다크 팔레트 비교").count(), 0);

  await openThemeMenu().click();
  const themeGroup = page.getByRole("radiogroup", { name: "화면 테마" });
  assert.equal(await themeGroup.count(), 1);
  assert.deepEqual(
    await themeGroup.getByRole("radio").allTextContents(),
    ["기존 라이트밝고 따뜻한 기본 화면", "네이비 데스크차분하고 집중하기 좋은 다크", "모브 잉크부드럽고 개성 있는 다크"],
  );
  assert.deepEqual(
    await themeGroup.getByRole("radio").evaluateAll((radios) =>
      radios.map((radio) => radio.getAttribute("tabindex")),
    ),
    ["0", "-1", "-1"],
    "only the selected radio should participate in the Tab order",
  );
  assert.equal(await page.getByRole("radio", { name: /^먹빛 노트/ }).count(), 0);
  assert.equal(await page.getByRole("radio", { name: /^딥 포레스트/ }).count(), 0);

  await page.getByRole("radio", { name: /^네이비 데스크/ }).click();
  assert.equal(await shell.getAttribute("data-theme"), "navy");
  assert.equal(await themeGroup.count(), 0, "choosing a theme should close the menu");
  assert.equal(
    await page.evaluate(() => window.localStorage.getItem("hwa-planner-theme")),
    "navy",
  );

  await page.reload({ waitUntil: "networkidle" });
  assert.equal(await shell.getAttribute("data-theme"), "navy");
  assert.equal(await openThemeMenu().getAttribute("aria-label"), "테마 선택, 현재 네이비 데스크");

  await openThemeMenu().click();
  await page.getByRole("radio", { name: /^네이비 데스크/ }).press("ArrowDown");
  assert.equal(
    await page.getByRole("radio", { name: /^모브 잉크/ }).getAttribute("aria-checked"),
    "true",
    "arrow keys should move and select within the radio group",
  );
  assert.equal(await shell.getAttribute("data-theme"), "mauve");
  await page.keyboard.press("Escape");
  assert.equal(await themeGroup.count(), 0);
  assert.equal(await openThemeMenu().evaluate((button) => document.activeElement === button), true);

  await page.setViewportSize({ width: 390, height: 844 });
  await openThemeMenu().click();
  const mobilePanel = page.locator(".theme-menu-panel");
  assert.deepEqual(
    await mobilePanel.evaluate((panel) => {
      const styles = getComputedStyle(panel);
      return { position: styles.position, bottom: styles.bottom };
    }),
    { position: "fixed", bottom: "0px" },
  );
  assert.ok(
    await page.getByRole("radio", { name: /^모브 잉크/ }).evaluate((radio) =>
      Number.parseFloat(getComputedStyle(radio).height) >= 44,
    ),
    "mobile theme options should meet the minimum touch target",
  );
  await page.getByRole("radio", { name: /^모브 잉크/ }).click();
  assert.equal(await shell.getAttribute("data-theme"), "mauve");

  await page.reload({ waitUntil: "networkidle" });
  assert.equal(await shell.getAttribute("data-theme"), "mauve");
  assert.deepEqual(runtimeErrors, [], "theme selection should not cause runtime errors");
} finally {
  await browser.close();
}
