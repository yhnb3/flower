import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_PLANNER_BYTES,
  parsePlannerState,
  serializePlannerState,
} from "../shared/planner-contract.js";

const validPlanner = {
  folders: [{ id: "today", label: "오늘" }],
  activeFolder: "today",
  tasks: [{ id: 1, folder: "today", title: "테스트", done: false }],
  memos: [{ id: 2, folder: "today", content: "메모" }],
};

test("parsePlannerState accepts a valid planner document", () => {
  assert.deepEqual(parsePlannerState(validPlanner), validPlanner);
});

test("parsePlannerState rejects records that reference a missing folder", () => {
  assert.throws(
    () =>
      parsePlannerState({
        ...validPlanner,
        tasks: [{ id: 1, folder: "missing", title: "테스트", done: false }],
      }),
    /INVALID_PLANNER/,
  );
});

test("parsePlannerState rejects documents with unexpected fields", () => {
  assert.throws(
    () => parsePlannerState({ ...validPlanner, serviceRoleKey: "must-not-pass" }),
    /INVALID_PLANNER/,
  );
});

test("parsePlannerState rejects duplicate task and memo IDs", () => {
  assert.throws(
    () =>
      parsePlannerState({
        ...validPlanner,
        tasks: [
          { id: "task-1", folder: "today", title: "첫 번째", done: false },
          { id: "task-1", folder: "today", title: "두 번째", done: false },
        ],
      }),
    /INVALID_PLANNER/,
  );

  assert.throws(
    () =>
      parsePlannerState({
        ...validPlanner,
        memos: [
          { id: "memo-1", folder: "today", content: "첫 번째" },
          { id: "memo-1", folder: "today", content: "두 번째" },
        ],
      }),
    /INVALID_PLANNER/,
  );
});

test("parsePlannerState rejects zero, negative, and blank item IDs", () => {
  for (const id of [0, -1, "   "]) {
    assert.throws(
      () =>
        parsePlannerState({
          ...validPlanner,
          tasks: [{ id, folder: "today", title: "테스트", done: false }],
        }),
      /INVALID_PLANNER/,
    );
  }
});

test("serializePlannerState enforces the planner payload size limit", () => {
  const oversizedPlanner = {
    ...validPlanner,
    memos: Array.from({ length: Math.ceil(MAX_PLANNER_BYTES / 5_000) + 1 }, (_, index) => ({
      id: index + 1,
      folder: "today",
      content: "x".repeat(5_000),
    })),
  };

  assert.throws(() => serializePlannerState(oversizedPlanner), /PLANNER_TOO_LARGE/);
});
