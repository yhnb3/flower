import assert from "node:assert/strict";
import test from "node:test";
import { createPlannerHandler } from "../api/_planner-handler.js";

const planner = {
  folders: [{ id: "today", label: "오늘" }],
  activeFolder: "today",
  tasks: [],
  memos: [],
};

function request(method, body) {
  return new Request("http://localhost/api/planner", {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
}

test("the planner API rejects unauthenticated requests", async () => {
  const handler = createPlannerHandler({
    authenticate: async () => null,
    repository: { get: async () => null, save: async () => null },
  });

  const response = await handler(request("GET"));
  assert.equal(response.status, 401);
  assert.equal((await response.json()).error.code, "UNAUTHENTICATED");
});

test("the planner API rejects a signed-in user outside the owner allowlist", async () => {
  const handler = createPlannerHandler({
    authenticate: async () => "user_guest",
    allowedUserId: "user_owner",
    repository: { get: async () => null, save: async () => null },
  });

  const response = await handler(request("GET"));
  assert.equal(response.status, 403);
  assert.equal((await response.json()).error.code, "FORBIDDEN");
});

test("GET returns the authenticated user's planner", async () => {
  const handler = createPlannerHandler({
    authenticate: async () => "user_123",
    repository: {
      get: async (userId) => {
        assert.equal(userId, "user_123");
        return { payload: JSON.stringify(planner), revision: 3, updatedAt: "2026-08-13" };
      },
      save: async () => null,
    },
  });

  const response = await handler(request("GET"));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    data: planner,
    revision: 3,
    updatedAt: "2026-08-13",
  });
});

test("PUT validates planner documents before saving", async () => {
  const handler = createPlannerHandler({
    authenticate: async () => "user_123",
    repository: { get: async () => null, save: async () => null },
  });

  const response = await handler(request("PUT", { data: { folders: [] }, revision: 0 }));
  assert.equal(response.status, 422);
  assert.equal((await response.json()).error.code, "INVALID_PLANNER");
});

test("PUT saves with an expected revision", async () => {
  const handler = createPlannerHandler({
    authenticate: async () => "user_123",
    repository: {
      get: async () => null,
      save: async (userId, payload, revision) => {
        assert.equal(userId, "user_123");
        assert.equal(revision, 2);
        assert.deepEqual(JSON.parse(payload), planner);
        return { revision: 3, updatedAt: "2026-08-13" };
      },
    },
  });

  const response = await handler(request("PUT", { data: planner, revision: 2 }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { revision: 3, updatedAt: "2026-08-13" });
});

test("PUT reports a conflict instead of overwriting a newer revision", async () => {
  const handler = createPlannerHandler({
    authenticate: async () => "user_123",
    repository: {
      get: async () => ({ payload: JSON.stringify(planner), revision: 4, updatedAt: "2026-08-13" }),
      save: async () => null,
    },
  });

  const response = await handler(request("PUT", { data: planner, revision: 2 }));
  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), {
    error: {
      code: "VERSION_CONFLICT",
      message: "다른 기기에서 먼저 저장된 변경이 있습니다.",
    },
    revision: 4,
  });
});

test("unsupported methods advertise the allowed planner operations", async () => {
  const handler = createPlannerHandler({
    authenticate: async () => "user_123",
    repository: { get: async () => null, save: async () => null },
  });

  const response = await handler(request("POST", { data: planner, revision: 0 }));
  assert.equal(response.status, 405);
  assert.equal(response.headers.get("allow"), "GET, PUT");
});
