import assert from "node:assert/strict";
import test from "node:test";
import {
  createClerkAuthenticator,
  isClerkUserAllowed,
  parseAllowedUserEmails,
} from "../api/_auth.js";

const environment = {
  CLERK_AUTHORIZED_PARTIES: "http://localhost",
  CLERK_PUBLISHABLE_KEY: "pk_test_example",
  CLERK_SECRET_KEY: "sk_test_example",
  ALLOWED_USER_EMAILS: "owner@example.com,editor@example.com",
};

test("allowed user emails are normalized and deduplicated", () => {
  assert.deepEqual(
    [...parseAllowedUserEmails(" OWNER@example.com, editor@example.com,owner@example.com ")],
    ["owner@example.com", "editor@example.com"],
  );
});

test("a Clerk user is allowed only when the primary email is in the allowlist", () => {
  const allowedEmails = parseAllowedUserEmails("owner@example.com,editor@example.com");

  assert.equal(
    isClerkUserAllowed(
      {
        primaryEmailAddress: {
          emailAddress: "EDITOR@EXAMPLE.COM",
          verification: { status: "verified" },
        },
      },
      allowedEmails,
    ),
    true,
  );
  assert.equal(
    isClerkUserAllowed(
      {
        primaryEmailAddress: {
          emailAddress: "someone@example.com",
          verification: { status: "verified" },
        },
      },
      allowedEmails,
    ),
    false,
  );
  assert.equal(
    isClerkUserAllowed(
      {
        primaryEmailAddress: {
          emailAddress: "owner@example.com",
          verification: { status: "unverified" },
        },
      },
      allowedEmails,
    ),
    false,
  );
  assert.equal(isClerkUserAllowed({ primaryEmailAddress: null }, allowedEmails), false);
});

test("the Clerk authenticator returns an authorization decision from the verified user", async () => {
  let requestedUserId = null;
  const authenticate = createClerkAuthenticator(environment, {
    createClient: () => ({
      authenticateRequest: async () => ({
        isAuthenticated: true,
        toAuth: () => ({ userId: "user_123" }),
      }),
      users: {
        getUser: async (userId) => {
          requestedUserId = userId;
          return {
            primaryEmailAddress: {
              emailAddress: "owner@example.com",
              verification: { status: "verified" },
            },
          };
        },
      },
    }),
  });

  assert.deepEqual(await authenticate(new Request("http://localhost/api/planner")), {
    userId: "user_123",
    isAllowed: true,
  });
  assert.equal(requestedUserId, "user_123");
});

test("production authentication fails closed when no allowlist is configured", async () => {
  const authenticate = createClerkAuthenticator(
    { ...environment, ALLOWED_USER_EMAILS: "", VERCEL_ENV: "production" },
    {
      createClient: () => {
        throw new Error("Clerk should not initialize without an access rule");
      },
    },
  );

  await assert.rejects(
    () => authenticate(new Request("https://planner.example.com/api/planner")),
    /ALLOWED_USER_EMAILS is required/,
  );
});
