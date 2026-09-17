import assert from "node:assert/strict";
import { browserType } from "./e2e-browser.mjs";

const appUrl = process.env.APP_URL ?? "http://127.0.0.1:5173/";
const browser = await browserType.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const runtimeErrors = [];

page.on("pageerror", (error) => runtimeErrors.push(error.message));
page.on("console", (message) => {
  if (message.type() === "error") runtimeErrors.push(message.text());
});

async function addTask(title) {
  await page.getByLabel("새 할 일").fill(title);
  await page.locator(".add-row").getByRole("button", { name: "추가", exact: true }).click();
}

async function selectTheme(name) {
  await page.getByRole("button", { name: /^테마 선택, 현재 / }).click();
  await page.getByRole("radio", { name }).click();
}

async function readOverviewPalette() {
  return page.evaluate(() => {
    const colorOf = (selector, property) =>
      getComputedStyle(document.querySelector(selector))[property];

    return {
      sheet: colorOf(".folder-sheet.is-overview", "backgroundColor"),
      sheetText: colorOf(".folder-sheet.is-overview", "color"),
      group: colorOf(".open-tasks-group", "backgroundColor"),
      task: colorOf(".open-tasks-stack .task-note", "backgroundColor"),
      mobileTab: colorOf(".folder-overview-mobile.is-active", "backgroundColor"),
      desktopTab: colorOf(".folder-overview-tab.is-active", "backgroundColor"),
      count: colorOf(".folder-overview-mobile strong", "backgroundColor"),
      countText: colorOf(".folder-overview-mobile strong", "color"),
    };
  });
}

try {
  await page.goto(appUrl, { waitUntil: "networkidle" });

  await addTask("오늘 남은 일");

  await page.getByRole("button", { name: "새 폴더", exact: true }).click();
  const folderNameInput = page.locator(".folder-name-input");
  await folderNameInput.fill("업무");
  await folderNameInput.press("Enter");

  await addTask("업무 남은 일");
  await addTask("업무 완료한 일");
  await page.getByLabel("업무 완료한 일 완료하기").click();

  const overviewTab = page.getByRole("button", { name: "미완료 2개 모아보기" });
  assert.equal(await overviewTab.count(), 1, "the overview entry should expose the total count");
  await overviewTab.click();

  assert.equal(
    await page.getByRole("heading", { name: "미완료 할 일", exact: true }).count(),
    0,
    "the overview should not repeat the active tab as a visible title",
  );
  assert.equal(
    await page
      .getByText("모든 폴더에서 아직 끝나지 않은 일을 모았습니다.", { exact: true })
      .count(),
    0,
    "the overview should start directly with folder groups",
  );
  assert.equal(await page.getByText("총 2개", { exact: true }).count(), 0);
  assert.equal(await page.getByText("오늘 남은 일", { exact: true }).count(), 1);
  assert.equal(await page.getByText("업무 남은 일", { exact: true }).count(), 1);
  assert.equal(
    await page.getByText("업무 완료한 일", { exact: true }).count(),
    0,
    "completed tasks should stay out of the overview",
  );
  assert.equal(await page.getByRole("heading", { name: "오늘", exact: true }).count(), 1);
  assert.equal(await page.getByRole("heading", { name: "업무", exact: true }).count(), 1);
  assert.equal(await page.getByLabel("새 메모").count(), 0);
  assert.equal(await page.getByLabel("새 할 일").count(), 0);
  assert.equal(
    await page.getByRole("button", { name: /폴더 삭제$/ }).count(),
    0,
    "folder-only actions should be hidden in the overview",
  );

  const expectedOverviewPalette = {
    sheet: "rgb(229, 231, 235)",
    sheetText: "rgb(17, 18, 20)",
    group: "rgb(215, 219, 224)",
    task: "rgb(255, 255, 255)",
    mobileTab: "rgb(229, 231, 235)",
    desktopTab: "rgb(229, 231, 235)",
    count: "rgb(200, 205, 211)",
    countText: "rgb(17, 18, 20)",
  };
  const lightOverviewPalette = await readOverviewPalette();
  assert.deepEqual(
    lightOverviewPalette,
    expectedOverviewPalette,
    "the overview should use the approved iPhone-keyboard-inspired neutral palette",
  );
  await selectTheme(/^네이비 데스크/);
  assert.deepEqual(
    await readOverviewPalette(),
    lightOverviewPalette,
    "the overview palette should stay unchanged in navy mode",
  );
  await selectTheme(/^모브 잉크/);
  assert.deepEqual(
    await readOverviewPalette(),
    lightOverviewPalette,
    "the overview palette should stay unchanged in mauve mode",
  );
  await selectTheme(/^기존 라이트/);

  await page.setViewportSize({ width: 320, height: 568 });
  assert.deepEqual(
    await page.evaluate(() => ({
      viewportWidth: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
    })),
    { viewportWidth: 320, documentWidth: 320 },
    "the overview should not create horizontal page overflow at the narrowest supported width",
  );
  const mobileInsets = await page.locator(".open-tasks-overview").evaluate((overview) => {
    const overviewRect = overview.getBoundingClientRect();
    const group = overview.querySelector(".open-tasks-group");
    const groupRect = group.getBoundingClientRect();
    const groupHeaderRect = group
      .querySelector(".open-tasks-group-header")
      .getBoundingClientRect();
    const taskRect = group.querySelector(".task-note").getBoundingClientRect();

    return {
      overviewLeft: groupRect.left - overviewRect.left,
      overviewRight: overviewRect.right - groupRect.right,
      groupHeaderLeft: groupHeaderRect.left - groupRect.left,
      groupHeaderRight: groupRect.right - groupHeaderRect.right,
      taskLeft: taskRect.left - groupRect.left,
      taskRight: groupRect.right - taskRect.right,
    };
  });
  assert.ok(
    mobileInsets.overviewLeft >= 16 && mobileInsets.overviewRight >= 16,
    `mobile overview copy needs breathing room from its border (${JSON.stringify(mobileInsets)})`,
  );
  assert.ok(
    mobileInsets.groupHeaderLeft >= 12 &&
      mobileInsets.groupHeaderRight >= 12 &&
      mobileInsets.taskLeft >= 12 &&
      mobileInsets.taskRight >= 12,
    `mobile groups need consistent inner padding (${JSON.stringify(mobileInsets)})`,
  );
  await page.setViewportSize({ width: 1440, height: 900 });
  const desktopInsets = await page.locator(".folder-sheet").evaluate((sheet) => {
    const overview = sheet.querySelector(".open-tasks-overview");
    const sheetRect = sheet.getBoundingClientRect();
    const overviewRect = overview.getBoundingClientRect();
    const styles = getComputedStyle(sheet);
    const contentLeft =
      sheetRect.left +
      Number.parseFloat(styles.borderLeftWidth) +
      Number.parseFloat(styles.paddingLeft);
    const contentRight =
      sheetRect.right -
      Number.parseFloat(styles.borderRightWidth) -
      Number.parseFloat(styles.paddingRight);
    const contentWidth = contentRight - contentLeft;

    return {
      left: overviewRect.left - contentLeft,
      right: contentRight - overviewRect.right,
      expected: Math.max(0, (contentWidth - 860) / 8),
    };
  });
  assert.ok(
    Math.abs(desktopInsets.left - desktopInsets.expected) <= 1 &&
      Math.abs(desktopInsets.right - desktopInsets.expected) <= 1,
    `desktop overview side margins should be one quarter of their previous size (${JSON.stringify(desktopInsets)})`,
  );
  await page.setViewportSize({ width: 390, height: 844 });

  await page.getByRole("button", { name: "업무 남은 일 할 일 수정" }).click();
  const editingTask = page.getByLabel("할 일 수정", { exact: true });
  await editingTask.fill("업무 수정된 일");
  await editingTask.press("Enter");
  assert.equal(await page.getByText("업무 수정된 일", { exact: true }).count(), 1);

  await page.getByLabel("오늘 남은 일 완료하기").click();
  assert.equal(await page.getByText("오늘 남은 일", { exact: true }).count(), 0);
  assert.equal(
    await page.getByText("오늘 남은 일을 완료했어요.", { exact: true }).count(),
    1,
    "completion should provide reversible feedback",
  );
  const undoButton = page.getByRole("button", { name: "완료 실행 취소" });
  assert.equal(
    await undoButton.evaluate((button) => document.activeElement === button),
    true,
    "focus should move to the recovery action when the completed row disappears",
  );
  await undoButton.click();
  assert.equal(await page.getByText("오늘 남은 일", { exact: true }).count(), 1);
  assert.equal(
    await page
      .getByLabel("오늘 남은 일 완료하기")
      .evaluate((button) => document.activeElement === button),
    true,
    "undo should restore focus to the recovered task",
  );

  await page.getByRole("button", { name: "업무 폴더로 이동" }).click();
  assert.equal(
    await page.getByRole("heading", { name: "미완료 할 일", exact: true }).count(),
    0,
  );
  assert.equal(await page.getByText("업무 수정된 일", { exact: true }).count(), 1);

  await page.getByRole("button", { name: "미완료 2개 모아보기" }).click();
  await page.getByRole("button", { name: "업무 수정된 일 삭제" }).click();
  assert.equal(await page.getByRole("button", { name: "미완료 1개 모아보기" }).count(), 1);

  await page.getByLabel("오늘 남은 일 완료하기").click();
  assert.equal(
    await page.getByRole("heading", { name: "남은 일이 없어요.", exact: true }).count(),
    1,
    "the overview should explain when every task is complete",
  );
  await page.getByRole("button", { name: "새 폴더", exact: true }).click();
  await page.locator(".folder-name-input").fill("빈 폴더");
  await page.locator(".folder-name-input").press("Enter");
  await page.getByRole("button", { name: "미완료 0개 모아보기" }).click();
  assert.equal(
    await page.getByRole("button", { name: "완료 실행 취소" }).count(),
    0,
    "leaving the overview to create a folder should clear stale completion feedback",
  );
  assert.deepEqual(runtimeErrors, [], "the overview flow should not cause runtime errors");
} finally {
  await browser.close();
}
