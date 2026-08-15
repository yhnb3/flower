import { parsePlannerState, serializePlannerState } from "../shared/planner-contract.js";

const responseHeaders = {
  "cache-control": "no-store",
  "content-type": "application/json; charset=utf-8",
  "x-content-type-options": "nosniff",
};

function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...responseHeaders, ...headers },
  });
}

function error(code, message, status, extra = {}, headers = {}) {
  return json({ error: { code, message }, ...extra }, status, headers);
}

function hasOnlyKeys(value, keys) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const actualKeys = Object.keys(value);
  return actualKeys.length === keys.length && actualKeys.every((key) => keys.includes(key));
}

export function createPlannerHandler({ authenticate, repository }) {
  return async function handlePlannerRequest(request) {
    try {
      const authenticatedUser = await authenticate(request);
      if (!authenticatedUser) {
        return error("UNAUTHENTICATED", "로그인이 필요합니다.", 401);
      }
      const usesLegacyIdentity = typeof authenticatedUser === "string";
      const userId = usesLegacyIdentity ? authenticatedUser : authenticatedUser.userId;
      const isAllowed = usesLegacyIdentity || authenticatedUser.isAllowed === true;
      if (typeof userId !== "string" || !userId || !isAllowed) {
        return error("FORBIDDEN", "이 플래너에 접근할 수 없습니다.", 403);
      }

      if (request.method === "GET") {
        const storedPlanner = await repository.get(userId);
        if (!storedPlanner) {
          return json({ data: null, revision: 0, updatedAt: null });
        }

        const data = parsePlannerState(JSON.parse(storedPlanner.payload));
        return json({
          data,
          revision: storedPlanner.revision,
          updatedAt: storedPlanner.updatedAt,
        });
      }

      if (request.method === "PUT") {
        if (!request.headers.get("content-type")?.includes("application/json")) {
          return error("UNSUPPORTED_MEDIA_TYPE", "JSON 요청만 지원합니다.", 415);
        }

        let body;
        try {
          body = await request.json();
        } catch {
          return error("INVALID_JSON", "올바른 JSON 요청이 아닙니다.", 400);
        }

        if (
          !hasOnlyKeys(body, ["data", "revision"]) ||
          !Number.isSafeInteger(body.revision) ||
          body.revision < 0
        ) {
          return error("INVALID_REQUEST", "요청 형식이 올바르지 않습니다.", 422);
        }

        let payload;
        try {
          payload = serializePlannerState(body.data);
        } catch (caughtError) {
          if (caughtError instanceof RangeError) {
            return error("PLANNER_TOO_LARGE", "플래너 데이터가 너무 큽니다.", 413);
          }
          return error("INVALID_PLANNER", "플래너 데이터 형식이 올바르지 않습니다.", 422);
        }

        const savedPlanner = await repository.save(userId, payload, body.revision);
        if (!savedPlanner) {
          const currentPlanner = await repository.get(userId);
          return error(
            "VERSION_CONFLICT",
            "다른 기기에서 먼저 저장된 변경이 있습니다.",
            409,
            { revision: currentPlanner?.revision ?? 0 },
          );
        }

        return json(savedPlanner);
      }

      return error(
        "METHOD_NOT_ALLOWED",
        "허용되지 않은 요청 방식입니다.",
        405,
        {},
        { allow: "GET, PUT" },
      );
    } catch {
      return error("SERVICE_UNAVAILABLE", "플래너 서버에 연결할 수 없습니다.", 503);
    }
  };
}
