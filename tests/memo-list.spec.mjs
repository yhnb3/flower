import assert from "node:assert/strict";
import { chromium } from "playwright";

const appUrl = process.env.APP_URL ?? "http://127.0.0.1:5173/";
const browser = await chromium.launch();
const page = await browser.newPage();

try {
  await page.goto(appUrl, { waitUntil: "networkidle" });

  assert.equal(
    await page.getByRole("heading", { name: "메모", exact: true }).count(),
    1,
    "the folder sheet should lead with a memo list",
  );

  const newMemo = page.getByLabel("새 메모");
  await newMemo.fill("브라우저 메모 확인");
  await page.getByRole("button", { name: "추가", exact: true }).click();
  assert.equal(await page.getByText("브라우저 메모 확인", { exact: true }).count(), 1);

  await page.getByRole("button", { name: "브라우저 메모 확인 메모 수정" }).click();
  const editingMemo = page.getByLabel("메모 수정");
  await editingMemo.fill("수정된 브라우저 메모");
  await editingMemo.press("Tab");
  assert.equal(await page.getByText("수정된 브라우저 메모", { exact: true }).count(), 1);

  await page.getByRole("button", { name: "수정된 브라우저 메모 삭제" }).click();
  assert.equal(await page.getByText("수정된 브라우저 메모", { exact: true }).count(), 0);
} finally {
  await browser.close();
}
