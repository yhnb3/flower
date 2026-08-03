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

  const todoToggle = page.getByLabel("오전 회의 전 자료 3개만 정리하기 완료하기");
  await todoToggle.click();
  assert.equal(
    await page.getByLabel("오전 회의 전 자료 3개만 정리하기 미완료로 바꾸기").count(),
    1,
    "existing todo completion should keep working",
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

  const newMemo = page.getByLabel("새 메모");
  await newMemo.fill("브라우저 메모 확인");
  await page.locator(".memo-area").getByRole("button", { name: "추가", exact: true }).click();
  assert.equal(await page.getByText("브라우저 메모 확인", { exact: true }).count(), 1);

  await page.getByRole("button", { name: "브라우저 메모 확인 메모 수정" }).click();
  const editingMemo = page.getByLabel("메모 수정", { exact: true });
  await editingMemo.fill("수정된 브라우저 메모");
  await editingMemo.press("Tab");
  assert.equal(await page.getByText("수정된 브라우저 메모", { exact: true }).count(), 1);

  await page.getByRole("button", { name: "수정된 브라우저 메모 삭제" }).click();
  assert.equal(await page.getByText("수정된 브라우저 메모", { exact: true }).count(), 0);
} finally {
  await browser.close();
}
