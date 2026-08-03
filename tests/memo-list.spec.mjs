import assert from "node:assert/strict";
import { chromium } from "playwright";

const appUrl = process.env.APP_URL ?? "http://127.0.0.1:5173/";
const browser = await chromium.launch();
const page = await browser.newPage();

try {
  await page.goto(appUrl, { waitUntil: "networkidle" });

  assert.equal(
    await page.getByRole("heading", { name: "처리되지 않은 아이템", exact: true }).count(),
    1,
    "the original todo board should remain available",
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
  const todoToggle = page.getByLabel("브라우저 할 일 확인 완료하기");
  await todoToggle.click();
  assert.equal(
    await page.getByLabel("브라우저 할 일 확인 미완료로 바꾸기").count(),
    1,
    "new todo completion should keep working",
  );

  assert.equal(
    await page.locator(".memo-area").count(),
    1,
    "the folder sheet should include a compact memo list",
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
  await newMemo.fill("브라우저 메모 확인");
  await page.locator(".memo-area").getByRole("button", { name: "추가", exact: true }).click();
  assert.equal(await page.getByText("브라우저 메모 확인", { exact: true }).count(), 1);

  await page.getByRole("button", { name: "브라우저 메모 확인 메모 수정" }).click();
  const editingMemo = page.getByLabel("메모 수정", { exact: true });
  assert.equal(
    await editingMemo.getAttribute("autocomplete"),
    "off",
    "memo editing should disable browser autocomplete",
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
