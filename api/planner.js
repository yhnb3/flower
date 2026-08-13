import { createClerkAuthenticator } from "./_auth.js";
import { createPlannerHandler } from "./_planner-handler.js";
import { createPlannerRepository } from "./_planner-repository.js";

const handler = createPlannerHandler({
  authenticate: createClerkAuthenticator(),
  repository: createPlannerRepository(),
  allowedUserId: process.env.OWNER_CLERK_USER_ID || undefined,
});

export default {
  fetch(request) {
    return handler(request);
  },
};
