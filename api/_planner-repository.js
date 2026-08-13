import { connect } from "@tursodatabase/serverless";

const createPlannerTableSql = `
  CREATE TABLE IF NOT EXISTS planner_state (
    user_id TEXT PRIMARY KEY,
    payload TEXT NOT NULL,
    revision INTEGER NOT NULL DEFAULT 1 CHECK (revision >= 1),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  )
`;

const insertPlannerSql = `
  INSERT INTO planner_state (user_id, payload, revision)
  VALUES (?, ?, 1)
  ON CONFLICT(user_id) DO NOTHING
  RETURNING revision, updated_at AS updatedAt
`;

const updatePlannerSql = `
  UPDATE planner_state SET
    payload = ?,
    revision = planner_state.revision + 1,
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  WHERE user_id = ? AND revision = ?
  RETURNING revision, updated_at AS updatedAt
`;

export function createPlannerRepository(environment = process.env, connectImpl = connect) {
  let connection;
  let schemaReady;

  function getConnection() {
    if (!environment.TURSO_DATABASE_URL || !environment.TURSO_AUTH_TOKEN) {
      throw new Error("Turso credentials are not configured");
    }
    connection ??= connectImpl({
      url: environment.TURSO_DATABASE_URL,
      authToken: environment.TURSO_AUTH_TOKEN,
    });
    return connection;
  }

  async function ensureSchema() {
    schemaReady ??= getConnection()
      .run(createPlannerTableSql)
      .catch((caughtError) => {
        schemaReady = undefined;
        throw caughtError;
      });
    await schemaReady;
  }

  return {
    async get(userId) {
      await ensureSchema();
      const row = await getConnection().get(
        `SELECT payload, revision, updated_at AS updatedAt
         FROM planner_state
         WHERE user_id = ?`,
        userId,
      );
      if (!row) return null;
      return {
        payload: String(row.payload),
        revision: Number(row.revision),
        updatedAt: String(row.updatedAt),
      };
    },

    async save(userId, payload, expectedRevision) {
      await ensureSchema();
      const row =
        expectedRevision === 0
          ? await getConnection().get(insertPlannerSql, userId, payload)
          : await getConnection().get(updatePlannerSql, payload, userId, expectedRevision);
      if (!row) return null;
      return {
        revision: Number(row.revision),
        updatedAt: String(row.updatedAt),
      };
    },
  };
}
