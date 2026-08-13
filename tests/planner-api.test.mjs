import assert from "node:assert/strict";
import test from "node:test";
import {
  createPlannerApi,
  isPlannerVersionConflict,
  PlannerApiError,
} from "../src/planner-api.js";

const planner = {
  folders: [{ id: "today", label: "오늘" }],
  activeFolder: "today",
  tasks: [],
  memos: [],
};

test("load sends the current Clerk session token", async () => {
  const api = createPlannerApi({
    getToken: async () => "session-token",
    fetchImpl: async (url, options) => {
      assert.equal(url, "/api/planner");
      assert.equal(options.headers.Authorization, "Bearer session-token");
      return Response.json({ data: planner, revision: 2, updatedAt: "2026-08-13" });
    },
  });

  assert.deepEqual(await api.load(), {
    data: planner,
    revision: 2,
    updatedAt: "2026-08-13",
  });
});

test("save sends the planner and expected revision", async () => {
  const api = createPlannerApi({
    getToken: async () => "session-token",
    fetchImpl: async (_url, options) => {
      assert.equal(options.method, "PUT");
      assert.equal(options.headers["Content-Type"], "application/json");
      assert.deepEqual(JSON.parse(options.body), { data: planner, revision: 3 });
      return Response.json({ revision: 4, updatedAt: "2026-08-13" });
    },
  });

  assert.deepEqual(await api.save(planner, 3), {
    revision: 4,
    updatedAt: "2026-08-13",
  });
});

test("save preserves conflict metadata for the sync UI", async () => {
  const api = createPlannerApi({
    getToken: async () => "session-token",
    fetchImpl: async () =>
      Response.json(
        {
          error: { code: "VERSION_CONFLICT", message: "conflict" },
          revision: 7,
        },
        { status: 409 },
      ),
  });

  await assert.rejects(
    () => api.save(planner, 3),
    (caughtError) =>
      caughtError instanceof PlannerApiError &&
      caughtError.code === "VERSION_CONFLICT" &&
      caughtError.revision === 7,
  );
});

test("requests fail before fetch when Clerk has no session token", async () => {
  const api = createPlannerApi({
    getToken: async () => null,
    fetchImpl: async () => {
      throw new Error("fetch should not run");
    },
  });

  await assert.rejects(
    () => api.load(),
    (caughtError) => caughtError instanceof PlannerApiError && caughtError.code === "NO_SESSION",
  );
});

test("only version conflict API errors block automatic saves", () => {
  assert.equal(
    isPlannerVersionConflict(new PlannerApiError("VERSION_CONFLICT", "conflict")),
    true,
  );
  assert.equal(isPlannerVersionConflict(new PlannerApiError("NETWORK_ERROR", "offline")), false);
  assert.equal(isPlannerVersionConflict(new Error("VERSION_CONFLICT")), false);
});
