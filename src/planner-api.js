import { parsePlannerState } from "../shared/planner-contract.js";

export class PlannerApiError extends Error {
  constructor(code, message, { status = 0, revision = null } = {}) {
    super(message);
    this.name = "PlannerApiError";
    this.code = code;
    this.status = status;
    this.revision = revision;
  }
}

export function isPlannerVersionConflict(caughtError) {
  return caughtError instanceof PlannerApiError && caughtError.code === "VERSION_CONFLICT";
}

export function isPlannerAccessDenied(caughtError) {
  return caughtError instanceof PlannerApiError && caughtError.code === "FORBIDDEN";
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function parseRevision(value) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new PlannerApiError("INVALID_RESPONSE", "서버 응답을 확인할 수 없습니다.");
  }
  return value;
}

async function parseResponse(response) {
  let body;
  try {
    body = await response.json();
  } catch {
    throw new PlannerApiError("INVALID_RESPONSE", "서버 응답을 확인할 수 없습니다.", {
      status: response.status,
    });
  }

  if (!response.ok) {
    const apiError = isRecord(body?.error) ? body.error : {};
    throw new PlannerApiError(
      typeof apiError.code === "string" ? apiError.code : "REQUEST_FAILED",
      typeof apiError.message === "string" ? apiError.message : "요청을 처리하지 못했습니다.",
      {
        status: response.status,
        revision: Number.isSafeInteger(body?.revision) ? body.revision : null,
      },
    );
  }

  if (!isRecord(body)) {
    throw new PlannerApiError("INVALID_RESPONSE", "서버 응답을 확인할 수 없습니다.");
  }
  return body;
}

export function createPlannerApi({ getToken, fetchImpl = fetch }) {
  async function authenticatedRequest(options = {}) {
    const token = await getToken();
    if (!token) {
      throw new PlannerApiError("NO_SESSION", "로그인 정보를 확인할 수 없습니다.");
    }

    try {
      return await fetchImpl("/api/planner", {
        cache: "no-store",
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (caughtError) {
      if (caughtError instanceof PlannerApiError) throw caughtError;
      throw new PlannerApiError("NETWORK_ERROR", "네트워크에 연결할 수 없습니다.");
    }
  }

  return {
    async load() {
      const body = await parseResponse(await authenticatedRequest({ method: "GET" }));
      return {
        data: body.data === null ? null : parsePlannerState(body.data),
        revision: parseRevision(body.revision),
        updatedAt: typeof body.updatedAt === "string" ? body.updatedAt : null,
      };
    },

    async save(data, revision) {
      const body = await parseResponse(
        await authenticatedRequest({
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: parsePlannerState(data), revision: parseRevision(revision) }),
        }),
      );
      return {
        revision: parseRevision(body.revision),
        updatedAt: typeof body.updatedAt === "string" ? body.updatedAt : null,
      };
    },
  };
}
