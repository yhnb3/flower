import assert from "node:assert/strict";
import { chromium } from "playwright";

const appUrl = process.env.APP_URL ?? "http://127.0.0.1:5173/";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 640, height: 900 } });
const runtimeErrors = [];

page.on("pageerror", (error) => runtimeErrors.push(error.message));
page.on("console", (message) => {
  if (message.type() === "error") runtimeErrors.push(message.text());
});

try {
  await page.goto(appUrl, { waitUntil: "load" });

  for (let index = 1; index <= 7; index += 1) {
    await page.getByRole("button", { name: "새 폴더", exact: true }).click();
    const folderNameInput = page.locator(".folder-name-input");
    const newFolderSelection = await folderNameInput.evaluate((input) => ({
      value: input.value,
      start: input.selectionStart,
      end: input.selectionEnd,
    }));
    assert.deepEqual(
      newFolderSelection,
      { value: "새 폴더", start: 0, end: 4 },
      "a new folder should select its default name so typing replaces it immediately",
    );
    await page.keyboard.type(`폴더 ${index}`);
    assert.equal(
      await folderNameInput.inputValue(),
      `폴더 ${index}`,
      "typing should replace the selected default folder name",
    );
    await folderNameInput.press("Enter");
  }

  const folderTabs = page.locator(".folder-tabs");
  assert.equal(
    await page.getByRole("button", { name: "폴더 순서 변경" }).count(),
    0,
    "pointer-first desktop layouts should keep direct tab dragging without a reorder mode",
  );
  const folderOne = page.getByRole("button", { name: "폴더 1", exact: true });
  const folderTwo = page.getByRole("button", { name: "폴더 2", exact: true });
  const folderThree = page.getByRole("button", { name: "폴더 3", exact: true });
  const folderOneId = await folderOne.getAttribute("data-folder-id");
  assert.ok(folderOneId, "the dragged folder should have a stable identifier");
  await folderOne.scrollIntoViewIfNeeded();
  const folderOneBox = await folderOne.boundingBox();
  const folderTwoBox = await folderTwo.boundingBox();
  const folderThreeBox = await folderThree.boundingBox();
  assert.ok(folderOneBox, "the dragged folder should be visible");
  assert.ok(folderTwoBox, "the following folder should be visible");
  assert.ok(folderThreeBox, "the drop target should be visible");

  await page.mouse.move(
    folderOneBox.x + folderOneBox.width / 2,
    folderOneBox.y + folderOneBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    folderOneBox.x + folderOneBox.width / 2 + 4,
    folderOneBox.y + folderOneBox.height / 2,
    { steps: 2 },
  );
  await page.waitForTimeout(50);
  assert.equal(
    await page.locator(".folder-tab-placeholder").count(),
    0,
    "a small pointer movement should still behave like selecting the tab",
  );
  await page.mouse.up();
  await page.waitForFunction(
    (folderId) =>
      document.querySelector(`[data-folder-id="${CSS.escape(folderId)}"]`)?.getAttribute(
        "aria-current",
      ) === "page",
    folderOneId,
  );
  assert.equal(
    await folderOne.evaluate((tab) => getComputedStyle(tab, "::after").content),
    "none",
    "the active tab should not render a line below itself",
  );

  await page.mouse.move(
    folderOneBox.x + folderOneBox.width / 2,
    folderOneBox.y + folderOneBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(folderOneBox.x + folderOneBox.width / 2 + 12, folderOneBox.y + 24, {
    steps: 4,
  });
  await page.mouse.move(
    folderThreeBox.x + folderThreeBox.width / 2,
    folderThreeBox.y + folderThreeBox.height / 2,
    { steps: 12 },
  );
  await page.waitForTimeout(100);

  assert.equal(
    await page.locator(".folder-tab-placeholder").count(),
    1,
    "the projected drop position should use a tab-shaped placeholder",
  );
  assert.equal(
    await page.locator(".folder-tab-drag-overlay").count(),
    1,
    "the dragged tab should follow the pointer outside the list flow",
  );
  assert.equal(
    await page.locator(".is-drop-before, .is-drop-after").count(),
    0,
    "drop-position bars should not be used",
  );

  const folderTwoDuringDrag = await folderTwo.boundingBox();
  assert.ok(folderTwoDuringDrag, "the following folder should remain visible while dragging");
  assert.ok(
    Math.abs(folderTwoDuringDrag.x - folderOneBox.x) < 8,
    "the following tab should close the dragged tab's original gap immediately",
  );

  await page.mouse.up();
  await page.waitForTimeout(300);

  assert.equal(
    await folderOne.evaluate((tab) => tab.matches(":focus-visible")),
    false,
    "pointer reordering should not leave a keyboard focus outline on the moved tab",
  );

  const reorderedLabels = await folderTabs.locator(".folder-tab span").allTextContents();
  assert.deepEqual(
    reorderedLabels.slice(0, 4),
    ["오늘", "폴더 2", "폴더 3", "폴더 1"],
    "dropping on the right half of a tab should place the dragged folder after it",
  );

  await page.reload({ waitUntil: "load" });
  assert.deepEqual(
    (await folderTabs.locator(".folder-tab span").allTextContents()).slice(0, 4),
    ["오늘", "폴더 2", "폴더 3", "폴더 1"],
    "the reordered folder tabs should persist after a reload",
  );

  await folderOne.focus();
  await page.keyboard.press("Space");
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("Space");
  assert.deepEqual(
    (await folderTabs.locator(".folder-tab span").allTextContents()).slice(0, 4),
    ["오늘", "폴더 2", "폴더 1", "폴더 3"],
    "Space and ArrowLeft should provide a keyboard alternative to dragging",
  );
  await page.waitForFunction(
    (folderId) =>
      document.activeElement?.getAttribute("data-folder-id") === folderId &&
      document.activeElement.matches(":focus-visible"),
    folderOneId,
  );
  assert.equal(
    await folderOne.evaluate((tab) => tab.matches(":focus-visible")),
    true,
    "keyboard reordering should retain its visible focus indicator",
  );

  await page.waitForTimeout(300);
  await page.keyboard.press("Space");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Space");
  assert.deepEqual(
    (await folderTabs.locator(".folder-tab span").allTextContents()).slice(0, 4),
    ["오늘", "폴더 2", "폴더 3", "폴더 1"],
    "Space and ArrowRight should move the focused folder back to the right",
  );

  await page.getByRole("button", { name: "오늘", exact: true }).click();

  const activeTab = folderTabs.locator(".folder-tab.is-active");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Shift+Tab");
  assert.equal(
    await activeTab.evaluate((tab) => tab.matches(":focus-visible")),
    true,
    "the active tab should expose its keyboard focus ring",
  );
  const activeTabClearance = await folderTabs.evaluate((tabs) => {
    const active = tabs.querySelector(".folder-tab.is-active");
    const tabsRect = tabs.getBoundingClientRect();
    const activeRect = active.getBoundingClientRect();
    const activeStyles = getComputedStyle(active);
    return {
      top: activeRect.top - tabsRect.top,
      required:
        Number.parseFloat(activeStyles.outlineWidth) +
        Number.parseFloat(activeStyles.outlineOffset),
    };
  });

  assert.ok(
    activeTabClearance.top >= activeTabClearance.required,
    `the selected tab must keep its top edge and focus ring visible (${activeTabClearance.top}px < ${activeTabClearance.required}px)`,
  );

  const overflow = await folderTabs.evaluate((tabs) => {
    const styles = getComputedStyle(tabs);
    return {
      overflowX: styles.overflowX,
      overflowY: styles.overflowY,
      scrollbarWidth: styles.scrollbarWidth,
      hasHorizontalOverflow: tabs.scrollWidth > tabs.clientWidth,
    };
  });

  assert.equal(overflow.overflowX, "auto");
  assert.equal(overflow.overflowY, "hidden", "folder tabs should never scroll vertically");
  assert.equal(overflow.scrollbarWidth, "none", "horizontal scrollbar should stay hidden");
  assert.equal(overflow.hasHorizontalOverflow, true, "test setup should overflow horizontally");

  const beforeScrollLeft = await folderTabs.evaluate((tabs) => tabs.scrollLeft);
  const wheelDelta = beforeScrollLeft > 0 ? -180 : 180;
  const folderTabsBox = await folderTabs.boundingBox();
  assert.ok(folderTabsBox, "folder tabs should be visible");
  const wheelPoint = {
    x: folderTabsBox.x + folderTabsBox.width / 2,
    y: folderTabsBox.y + folderTabsBox.height / 2,
  };
  await page.mouse.move(wheelPoint.x, wheelPoint.y);
  await page.mouse.wheel(0, wheelDelta);
  await page.waitForTimeout(100);
  const afterScrollLeft = await folderTabs.evaluate((tabs) => tabs.scrollLeft);

  assert.ok(
    wheelDelta > 0 ? afterScrollLeft > beforeScrollLeft : afterScrollLeft < beforeScrollLeft,
    `a regular vertical wheel gesture should move overflowing folder tabs horizontally (${beforeScrollLeft} -> ${afterScrollLeft})`,
  );

  assert.deepEqual(runtimeErrors, [], "folder tab interactions should not cause runtime errors");
} finally {
  await browser.close();
}
