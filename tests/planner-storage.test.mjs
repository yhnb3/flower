import assert from "node:assert/strict";
import test from "node:test";
import {
  getPlannerStorageKey,
  migrateLegacyPlanner,
  readStoredPlanner,
  removeStoredPlanner,
  resolvePlannerBootstrap,
  writeStoredPlanner,
} from "../src/planner-storage.js";

const planner = {
  folders: [{ id: "today", label: "오늘" }],
  activeFolder: "today",
  tasks: [],
  memos: [],
};

test("planner caches are isolated by authenticated user ID and can be removed after migration", () => {
  const values = new Map();
  globalThis.window = {
    localStorage: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
      removeItem: (key) => values.delete(key),
    },
  };

  const firstUserKey = getPlannerStorageKey("user_first");
  const secondUserKey = getPlannerStorageKey("user_second");
  assert.notEqual(firstUserKey, secondUserKey);

  writeStoredPlanner(firstUserKey, planner);
  assert.deepEqual(readStoredPlanner(firstUserKey), planner);
  assert.equal(readStoredPlanner(secondUserKey), null);

  removeStoredPlanner(firstUserKey);
  assert.equal(readStoredPlanner(firstUserKey), null);
});

test("legacy data is removed only after the remote save succeeds", async () => {
  const values = new Map([["flower-planner-state", JSON.stringify(planner)]]);
  globalThis.window = {
    localStorage: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
      removeItem: (key) => values.delete(key),
    },
  };

  await assert.rejects(
    migrateLegacyPlanner({
      planner,
      save: async () => {
        throw new Error("network unavailable");
      },
    }),
    /network unavailable/,
  );
  assert.deepEqual(readStoredPlanner("flower-planner-state"), planner);

  const saved = await migrateLegacyPlanner({
    planner,
    save: async (nextPlanner, revision) => {
      assert.deepEqual(nextPlanner, planner);
      assert.equal(revision, 0);
      return { revision: 1 };
    },
  });

  assert.deepEqual(saved, { revision: 1 });
  assert.equal(readStoredPlanner("flower-planner-state"), null);
});

test("legacy storage enables a manual update only when the remote planner is empty", () => {
  const initialPlanner = { ...planner, activeFolder: "initial" };
  const remotePlanner = { ...planner, activeFolder: "remote" };
  const userCachedPlanner = { ...planner, activeFolder: "user-cache" };
  const legacyPlanner = { ...planner, activeFolder: "legacy" };

  assert.deepEqual(
    resolvePlannerBootstrap({
      remotePlanner: null,
      userCachedPlanner: null,
      legacyPlanner,
      initialPlanner,
    }),
    {
      planner: legacyPlanner,
      shouldCreateRemote: false,
      canMigrateLegacy: true,
    },
  );

  assert.equal(
    resolvePlannerBootstrap({
      remotePlanner,
      userCachedPlanner: null,
      legacyPlanner,
      initialPlanner,
    }).canMigrateLegacy,
    false,
  );

  assert.deepEqual(
    resolvePlannerBootstrap({
      remotePlanner: null,
      userCachedPlanner,
      legacyPlanner,
      initialPlanner,
    }),
    {
      planner: userCachedPlanner,
      shouldCreateRemote: false,
      canMigrateLegacy: true,
    },
  );

  assert.equal(
    resolvePlannerBootstrap({
      remotePlanner: null,
      userCachedPlanner,
      legacyPlanner: null,
      initialPlanner,
    }).canMigrateLegacy,
    false,
  );
});
