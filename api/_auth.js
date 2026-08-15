import { createClerkClient } from "@clerk/backend";

export function parseAllowedUserEmails(value = "") {
  return new Set(
    value
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isClerkUserAllowed(user, allowedEmails) {
  const primaryEmailAddress = user.primaryEmailAddress;
  const primaryEmail = primaryEmailAddress?.emailAddress?.trim().toLowerCase();
  return Boolean(
    primaryEmailAddress?.verification?.status === "verified" &&
      primaryEmail &&
      allowedEmails.has(primaryEmail),
  );
}

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

export function createClerkAuthenticator(
  environment = process.env,
  { createClient = createClerkClient } = {},
) {
  let clerkClient;
  const allowedEmails = parseAllowedUserEmails(environment.ALLOWED_USER_EMAILS);

  return async function authenticate(request) {
    if (
      environment.VERCEL_ENV === "production" &&
      allowedEmails.size === 0 &&
      !environment.OWNER_CLERK_USER_ID
    ) {
      throw new Error("ALLOWED_USER_EMAILS is required in production");
    }

    const publishableKey =
      environment.CLERK_PUBLISHABLE_KEY ?? environment.VITE_CLERK_PUBLISHABLE_KEY;
    if (!publishableKey || !environment.CLERK_SECRET_KEY) {
      throw new Error("Clerk server keys are not configured");
    }

    clerkClient ??= createClient({
      publishableKey,
      secretKey: environment.CLERK_SECRET_KEY,
    });

    const requestState = await clerkClient.authenticateRequest(request, {
      acceptsToken: "session_token",
      authorizedParties: getAuthorizedParties(request, environment),
    });
    if (!requestState.isAuthenticated) return null;

    const { userId } = requestState.toAuth();
    if (allowedEmails.size > 0) {
      // Clerk Backend User lookup: https://clerk.com/docs/reference/backend/user/get-user
      const user = await clerkClient.users.getUser(userId);
      return { userId, isAllowed: isClerkUserAllowed(user, allowedEmails) };
    }

    return {
      userId,
      isAllowed: !environment.OWNER_CLERK_USER_ID || userId === environment.OWNER_CLERK_USER_ID,
    };
  };
}
