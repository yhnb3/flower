import assert from "node:assert/strict";
import test from "node:test";
import {
  readStoredTheme,
  themeStorageKey,
  writeStoredTheme,
} from "../src/theme-preference.js";

function createStorage(initialValue = null) {
  const values = new Map();
  if (initialValue !== null) values.set(themeStorageKey, initialValue);

  return {
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
  };
}

test("theme preference restores only the three supported themes", () => {
  assert.equal(readStoredTheme(createStorage("light")), "light");
  assert.equal(readStoredTheme(createStorage("navy")), "navy");
  assert.equal(readStoredTheme(createStorage("mauve")), "mauve");
  assert.equal(readStoredTheme(createStorage("forest")), "light");
  assert.equal(readStoredTheme(createStorage()), "light");
});

test("theme preference survives storage failures without breaking the planner", () => {
  const unavailableStorage = {
    getItem() {
      throw new Error("storage unavailable");
    },
    setItem() {
      throw new Error("storage unavailable");
    },
  };

  assert.equal(readStoredTheme(unavailableStorage), "light");
  assert.equal(writeStoredTheme("navy", unavailableStorage), false);
});

test("theme preference writes supported themes and rejects unknown values", () => {
  const storage = createStorage();

  assert.equal(writeStoredTheme("navy", storage), true);
  assert.equal(storage.getItem(themeStorageKey), "navy");
  assert.equal(writeStoredTheme("forest", storage), false);
  assert.equal(storage.getItem(themeStorageKey), "navy");
});
