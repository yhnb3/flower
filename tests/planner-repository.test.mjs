import assert from "node:assert/strict";
import test from "node:test";
import { createPlannerRepository } from "../api/_planner-repository.js";

function createFakeConnection() {
  const calls = [];
  return {
    calls,
    connection: {
      run: async () => undefined,
      get: async (sql, ...parameters) => {
        calls.push({ sql, parameters });
        return { revision: sql.includes("INSERT INTO") ? 1 : 2, updatedAt: "2026-08-13" };
      },
    },
  };
}

test("new planner rows use an insert guarded by the user primary key", async () => {
  const fake = createFakeConnection();
  const repository = createPlannerRepository(
    { TURSO_DATABASE_URL: "libsql://test", TURSO_AUTH_TOKEN: "test" },
    () => fake.connection,
  );

  const saved = await repository.save("user_1", "payload", 0);

  assert.equal(saved.revision, 1);
  assert.match(fake.calls[0].sql, /INSERT INTO planner_state/);
  assert.match(fake.calls[0].sql, /ON CONFLICT\(user_id\) DO NOTHING/);
  assert.deepEqual(fake.calls[0].parameters, ["user_1", "payload"]);
});

test("existing planner rows use a revision-checked update", async () => {
  const fake = createFakeConnection();
  const repository = createPlannerRepository(
    { TURSO_DATABASE_URL: "libsql://test", TURSO_AUTH_TOKEN: "test" },
    () => fake.connection,
  );

  const saved = await repository.save("user_1", "next-payload", 1);

  assert.equal(saved.revision, 2);
  assert.match(fake.calls[0].sql, /UPDATE planner_state/);
  assert.match(fake.calls[0].sql, /WHERE user_id = \? AND revision = \?/);
  assert.deepEqual(fake.calls[0].parameters, ["next-payload", "user_1", 1]);
});
