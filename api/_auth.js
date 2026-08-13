import { createClerkClient } from "@clerk/backend";

function getAuthorizedParties(request, environment) {
  const parties = new Set(
    (environment.CLERK_AUTHORIZED_PARTIES ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );

  for (const hostname of [environment.VERCEL_PROJECT_PRODUCTION_URL, environment.VERCEL_URL]) {
    if (hostname) parties.add(`https://${hostname}`);
  }

  const requestUrl = new URL(request.url);
  if (
    environment.VERCEL_ENV !== "production" &&
    (requestUrl.hostname === "localhost" || requestUrl.hostname === "127.0.0.1")
  ) {
    parties.add(requestUrl.origin);
  }

  if (parties.size === 0) throw new Error("CLERK_AUTHORIZED_PARTIES is required");
  return [...parties];
}

export function createClerkAuthenticator(environment = process.env) {
  let clerkClient;

  return async function authenticate(request) {
    const publishableKey =
      environment.CLERK_PUBLISHABLE_KEY ?? environment.VITE_CLERK_PUBLISHABLE_KEY;
    if (!publishableKey || !environment.CLERK_SECRET_KEY) {
      throw new Error("Clerk server keys are not configured");
    }

    clerkClient ??= createClerkClient({
      publishableKey,
      secretKey: environment.CLERK_SECRET_KEY,
    });

    const requestState = await clerkClient.authenticateRequest(request, {
      acceptsToken: "session_token",
      authorizedParties: getAuthorizedParties(request, environment),
    });
    if (!requestState.isAuthenticated) return null;

    return requestState.toAuth().userId;
  };
}
