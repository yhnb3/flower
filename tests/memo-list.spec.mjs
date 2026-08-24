import assert from "node:assert/strict";
import { chromium, webkit } from "playwright";

const appUrl = process.env.APP_URL ?? "http://127.0.0.1:5173/";
const browserName = process.env.E2E_BROWSER ?? "chromium";
const browserType = { chromium, webkit }[browserName];

if (!browserType) throw new Error(`Unsupported E2E browser: ${browserName}`);

const browser = await browserType.launch();
const page = await browser.newPage({ viewport: { width: 393, height: 659 } });

async function getHorizontalOverflow(locator) {
  return locator.evaluate((element) => element.scrollWidth - element.clientWidth);
}

try {
  await page.goto(appUrl, { waitUntil: "networkidle" });

  assert.equal(
    await page.getByRole("heading", { name: "체크리스트", exact: true }).count(),
    1,
    "the checklist board should remain available",
  );

  assert.equal(await page.getByRole("button", { name: "오늘", exact: true }).count(), 1);
  assert.equal(
    await page.getByRole("button", { name: "업무", exact: true }).count(),
    0,
    "first-time users should not receive pre-created folders",
  );
  assert.equal(
    await page.locator(".task-note").count(),
    0,
    "first-time users should not receive sample tasks",
  );
  assert.equal(
    await page.locator(".memo-item").count(),
    0,
    "first-time users should not receive sample memos",
  );

  await page.getByLabel("새 할 일").fill("브라우저 할 일 확인");
  await page.locator(".add-row").getByRole("button", { name: "추가", exact: true }).click();
  await page.getByRole("button", { name: "브라우저 할 일 확인 할 일 수정" }).click();
  const editingTask = page.getByLabel("할 일 수정", { exact: true });
  assert.equal(
    await editingTask.getAttribute("autocomplete"),
    "off",
    "task editing should disable browser autocomplete",
  );
  await editingTask.fill("수정된 브라우저 할 일");
  await editingTask.press("Enter");
  assert.equal(await page.getByText("수정된 브라우저 할 일", { exact: true }).count(), 1);

  const todoToggle = page.getByLabel("수정된 브라우저 할 일 완료하기");
  const uncheckedControl = await todoToggle.evaluate((button) => {
    const hitArea = getComputedStyle(button);
    const indicator = getComputedStyle(button, "::before");
    return {
      ariaPressed: button.getAttribute("aria-pressed"),
      hitAreaWidth: hitArea.width,
      hitAreaHeight: hitArea.height,
      hitAreaRadius: hitArea.borderRadius,
      indicatorContent: indicator.content,
      indicatorWidth: indicator.width,
      indicatorHeight: indicator.height,
      indicatorRadius: indicator.borderRadius,
    };
  });
  assert.deepEqual(
    uncheckedControl,
    {
      ariaPressed: "false",
      hitAreaWidth: "44px",
      hitAreaHeight: "44px",
      hitAreaRadius: "50%",
      indicatorContent: '\"\"',
      indicatorWidth: "28px",
      indicatorHeight: "28px",
      indicatorRadius: "50%",
    },
    "the todo toggle should use a round iOS-style indicator inside a full touch target",
  );
  await todoToggle.click();
  const completedToggle = page.getByLabel("수정된 브라우저 할 일 미완료로 바꾸기");
  assert.equal(
    await completedToggle.count(),
    1,
    "new todo completion should keep working",
  );
  assert.equal(
    await completedToggle.getAttribute("aria-pressed"),
    "true",
    "the completed control should expose its pressed state",
  );

  assert.equal(
    await page.locator(".memo-area").count(),
    1,
    "the folder sheet should include a compact memo list",
  );
  assert.equal(
    await getHorizontalOverflow(page.locator(".memo-area")),
    0,
    `${browserName} should keep the empty memo area within an iPhone Pro viewport`,
  );
  assert.equal(
    await page
      .locator(".memo-area")
      .getByRole("button", { name: "추가", exact: true })
      .evaluate((button) => getComputedStyle(button).marginRight),
    "8px",
    "the memo add button should keep space from the right edge",
  );

  assert.equal(
    await page.locator(".summary-strip--compact").count(),
    0,
    "the component above the memo area should not render",
  );

  assert.equal(
    await page.locator(".folder-sheet").evaluate((sheet) =>
      sheet.lastElementChild?.querySelector('[aria-label$="폴더 삭제"]') !== null,
    ),
    true,
    "the folder delete action should appear after the folder content",
  );

  assert.deepEqual(
    await page.locator("input, textarea").evaluateAll((fields) =>
      fields.map((field) => field.getAttribute("autocomplete")),
    ),
    ["off", "off"],
    "all initially visible text fields should disable browser autocomplete",
  );

  await page.getByRole("button", { name: "오늘", exact: true }).dblclick();
  assert.equal(
    await page.locator(".folder-name-input").getAttribute("autocomplete"),
    "off",
    "folder name editing should disable browser autocomplete",
  );
  await page.keyboard.press("Escape");

  const newMemo = page.getByLabel("새 메모");
  await newMemo.fill("브라우저 메모 첫 줄");
  await newMemo.press("Shift+Enter");
  await newMemo.type("브라우저 메모 둘째 줄");
  assert.equal(
    await newMemo.inputValue(),
    "브라우저 메모 첫 줄\n브라우저 메모 둘째 줄",
    "Shift+Enter should insert a line break without submitting the memo",
  );
  await newMemo.press("Enter");
  assert.equal(await newMemo.inputValue(), "", "Enter should submit and clear the memo draft");
  const createdMemo = page.locator(".memo-content");
  assert.equal(
    await createdMemo.textContent(),
    "브라우저 메모 첫 줄\n브라우저 메모 둘째 줄",
    "the submitted memo should preserve Shift+Enter line breaks",
  );
  assert.equal(
    await createdMemo.evaluate((memo) => getComputedStyle(memo).whiteSpace),
    "pre-wrap",
    "saved memo line breaks should remain visible",
  );

  await createdMemo.click();
  const editingMemo = page.getByLabel("메모 수정", { exact: true });
  assert.equal(
    await editingMemo.getAttribute("autocomplete"),
    "off",
    "memo editing should disable browser autocomplete",
  );
  assert.equal(
    await getHorizontalOverflow(page.locator(".memo-area")),
    0,
    `${browserName} should keep the memo editor within an iPhone Pro viewport`,
  );
  await editingMemo.fill("수정된 브라우저 메모");
  await editingMemo.press("Tab");
  assert.equal(await page.getByText("수정된 브라우저 메모", { exact: true }).count(), 1);

  await page.getByRole("button", { name: "수정된 브라우저 메모 삭제" }).click();
  assert.equal(await page.getByText("수정된 브라우저 메모", { exact: true }).count(), 0);

  await page.getByRole("button", { name: "새 폴더", exact: true }).click();
  const folderNameInput = page.locator(".folder-name-input");
  await folderNameInput.fill("저장 확인");
  await folderNameInput.press("Enter");

  await page.getByLabel("새 메모").fill("새로고침 뒤에도 남는 메모");
  await page.locator(".memo-area").getByRole("button", { name: "추가", exact: true }).click();
  await page.getByLabel("새 할 일").fill("새로고침 뒤에도 남는 할 일");
  await page.locator(".add-row").getByRole("button", { name: "추가", exact: true }).click();

  await page.reload({ waitUntil: "networkidle" });
  assert.equal(
    await page.getByRole("button", { name: "저장 확인", exact: true }).count(),
    1,
    "new folders should persist after a reload",
  );
  assert.equal(
    await page.getByText("새로고침 뒤에도 남는 메모", { exact: true }).count(),
    1,
    "memos in the active folder should persist after a reload",
  );
  assert.equal(
    await page.getByText("새로고침 뒤에도 남는 할 일", { exact: true }).count(),
    1,
    "tasks in the active folder should persist after a reload",
  );
} finally {
  await browser.close();
}
