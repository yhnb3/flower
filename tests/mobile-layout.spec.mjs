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

try {
  await page.goto(appUrl, { waitUntil: "networkidle" });

  assert.equal(page.viewportSize()?.width, 390);
  assert.ok((page.viewportSize()?.height ?? 0) >= 600);

  const memoDraft = [
    "아이폰 13 Pro에서 긴 메모를 작성할 때 입력창이 내용과 함께 커져야 합니다.",
    "https://example.com/" + "very-long-path-segment".repeat(16),
    "줄바꿈이 여러 번 이어져도 입력 영역과 추가 버튼이 화면 밖으로 밀려나면 안 됩니다.",
    "메모 수정 상태에서도 충분한 내용을 한눈에 확인할 수 있어야 합니다.",
  ].join("\n");

  const memoInput = page.getByLabel("새 메모");
  await memoInput.fill(memoDraft);
  const draftSize = await memoInput.evaluate((textarea) => ({
    clientHeight: textarea.clientHeight,
    scrollHeight: textarea.scrollHeight,
    maxHeight: Number.parseFloat(getComputedStyle(textarea).maxHeight),
  }));
  assert.ok(
    draftSize.clientHeight > 44,
    `the mobile memo composer should grow beyond one row (${draftSize.clientHeight}px)`,
  );
  assert.ok(
    Math.abs(draftSize.clientHeight - Math.min(draftSize.scrollHeight, draftSize.maxHeight)) <= 2,
    "the memo composer should grow with its content until reaching its height cap",
  );

  await page.locator(".memo-area").getByRole("button", { name: "추가", exact: true }).click();

  const memoAlignment = await page.locator(".memo-item").evaluate((item) => {
    const content = item.querySelector(".memo-content").getBoundingClientRect();
    const remove = item.querySelector(".delete-button").getBoundingClientRect();
    return { contentTop: content.top, removeTop: remove.top };
  });
  assert.ok(
    Math.abs(memoAlignment.removeTop - memoAlignment.contentTop) <= 12,
    "a long memo's delete action should stay aligned with the top of its content",
  );

  await page.locator(".memo-content").click();
  const editSize = await page.getByLabel("메모 수정", { exact: true }).evaluate((textarea) => ({
    clientHeight: textarea.clientHeight,
    scrollHeight: textarea.scrollHeight,
    fontSize: Number.parseFloat(getComputedStyle(textarea).fontSize),
  }));
  assert.ok(editSize.fontSize >= 16, "memo editing must not trigger iOS input auto-zoom");
  assert.ok(
    editSize.clientHeight >= Math.min(editSize.scrollHeight, 240),
    `the long memo editor should expose a useful editing area (${editSize.clientHeight}px)`,
  );
  await page.getByLabel("메모 수정", { exact: true }).press("Meta+Enter");

  const longTask = "공백없는아주긴할일".repeat(35);
  await page.getByLabel("새 할 일").fill(longTask);
  await page.locator(".add-row").getByRole("button", { name: "추가", exact: true }).click();

  const taskAlignment = await page.locator(".task-note").evaluate((item) => {
    const copy = item.querySelector(".task-copy").getBoundingClientRect();
    const toggle = item.querySelector(".check-button").getBoundingClientRect();
    const remove = item.querySelector(".delete-button").getBoundingClientRect();
    return { copyTop: copy.top, toggleTop: toggle.top, removeTop: remove.top };
  });
  assert.ok(
    Math.abs(taskAlignment.toggleTop - taskAlignment.copyTop) <= 12 &&
      Math.abs(taskAlignment.removeTop - taskAlignment.copyTop) <= 12,
    "long task actions should stay aligned with the top of the task copy",
  );

  for (const viewport of [
    { width: 320, height: 568 },
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    const layout = await page.evaluate(() => ({
      innerWidth: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      outOfBounds: [...document.querySelectorAll("button, input, textarea, section, form")]
        .map((element) => ({ element, rect: element.getBoundingClientRect() }))
        .filter(({ rect }) => rect.left < -0.5 || rect.right > window.innerWidth + 0.5)
        .map(({ element, rect }) => ({
          className: element.className,
          left: rect.left,
          right: rect.right,
        })),
    }));
    assert.equal(
      layout.documentWidth,
      layout.innerWidth,
      `${viewport.width}px viewport must not scroll horizontally`,
    );
    assert.deepEqual(
      layout.outOfBounds,
      [],
      `${viewport.width}px interactive and content surfaces must stay in view`,
    );
  }
  assert.deepEqual(runtimeErrors, [], "mobile layout interactions should not cause runtime errors");
} finally {
  await context.close();
  await browser.close();
}
