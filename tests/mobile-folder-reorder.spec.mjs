import assert from "node:assert/strict";
import { chromium, devices } from "playwright";

const appUrl = process.env.APP_URL ?? "http://127.0.0.1:5173/";
const browser = await chromium.launch();
const context = await browser.newContext(devices["iPhone 13 Pro"]);
const page = await context.newPage();
const runtimeErrors = [];

page.on("pageerror", (error) => runtimeErrors.push(error.message));
page.on("console", (message) => {
  if (message.type() === "error") runtimeErrors.push(message.text());
});

async function swipeWithTouch(locator, deltaX, deltaY, holdMilliseconds = 0) {
  const box = await locator.boundingBox();
  assert.ok(box, "the swipe target should be visible");

  const client = await context.newCDPSession(page);
  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;
  await client.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: startX, y: startY, id: 1, radiusX: 4, radiusY: 4, force: 1 }],
  });
  if (holdMilliseconds > 0) await page.waitForTimeout(holdMilliseconds);

  for (let step = 1; step <= 8; step += 1) {
    await client.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [
        {
          x: startX + (deltaX * step) / 8,
          y: startY + (deltaY * step) / 8,
          id: 1,
          radiusX: 4,
          radiusY: 4,
          force: 1,
        },
      ],
    });
    await page.waitForTimeout(20);
  }

  await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await page.waitForTimeout(300);
  await client.detach();
}

try {
  await page.goto(appUrl, { waitUntil: "load" });

  for (let index = 1; index <= 12; index += 1) {
    await page.getByRole("button", { name: "새 폴더", exact: true }).click();
    const folderNameInput = page.locator(".folder-name-input");
    await page.keyboard.type(`폴더 ${index}`);
    await folderNameInput.press("Enter");
  }

  const folderTabs = page.locator(".folder-tabs");
  const addFolderButton = page.getByRole("button", { name: "새 폴더", exact: true });
  await addFolderButton.scrollIntoViewIfNeeded();

  const beforeTabSwipe = await folderTabs.evaluate((tabs) => tabs.scrollLeft);
  assert.ok(beforeTabSwipe > 0, "the mobile tab strip should start scrolled to its overflowing end");
  await swipeWithTouch(page.getByRole("button", { name: "폴더 12", exact: true }), 140, 0);
  const afterTabSwipe = await folderTabs.evaluate((tabs) => tabs.scrollLeft);
  assert.ok(
    afterTabSwipe < beforeTabSwipe,
    `swiping a mobile folder tab should scroll the strip (${beforeTabSwipe} -> ${afterTabSwipe})`,
  );

  const reorderTrigger = page.getByRole("button", { name: "폴더 순서 변경" });
  await reorderTrigger.click();

  const reorderDialog = page.getByRole("dialog", { name: "폴더 순서 변경" });
  await reorderDialog.waitFor({ state: "visible" });
  const reorderList = reorderDialog.locator(".mobile-folder-reorder-list");
  const listOverflow = await reorderList.evaluate((list) => ({
    clientHeight: list.clientHeight,
    scrollHeight: list.scrollHeight,
    touchAction: getComputedStyle(list).touchAction,
  }));
  assert.ok(
    listOverflow.scrollHeight > listOverflow.clientHeight,
    "a long mobile reorder list should have its own scrollable area",
  );
  assert.notEqual(listOverflow.touchAction, "none");

  const rowLabel = reorderDialog.locator(".mobile-folder-reorder-label").nth(2);
  await swipeWithTouch(rowLabel, 0, -140);
  assert.ok(
    (await reorderList.evaluate((list) => list.scrollTop)) > 0,
    "swiping a folder row outside its handle should scroll the reorder list",
  );
  await page.waitForTimeout(700);

  const folderOneHandle = reorderDialog.getByRole("button", { name: "폴더 1 이동" });
  await folderOneHandle.scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  await swipeWithTouch(folderOneHandle, 0, 90, 320);

  assert.deepEqual(
    (await reorderList.locator(".mobile-folder-reorder-label").allTextContents()).slice(0, 4),
    ["오늘", "폴더 2", "폴더 1", "폴더 3"],
    "dragging the dedicated mobile handle should reorder folders",
  );

  await reorderDialog.getByRole("button", { name: "완료" }).click();
  await reorderDialog.waitFor({ state: "hidden" });
  assert.equal(
    await reorderTrigger.evaluate((button) => document.activeElement === button),
    true,
    "closing the mobile reorder dialog should restore focus to its trigger",
  );
  assert.deepEqual(
    (await folderTabs.locator(".folder-tab span").allTextContents()).slice(0, 4),
    ["오늘", "폴더 2", "폴더 1", "폴더 3"],
    "the mobile reorder result should be reflected in the tab strip",
  );
  await page.setViewportSize({ width: 844, height: 390 });
  assert.equal(
    await reorderTrigger.isVisible(),
    true,
    "a touch-first phone should retain mobile reorder controls in landscape",
  );

  assert.deepEqual(runtimeErrors, [], "mobile tab scrolling and reordering should stay error-free");
} finally {
  await context.close();
  await browser.close();
}
