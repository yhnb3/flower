import { parsePlannerState } from "../shared/planner-contract.js";

export const legacyPlannerStorageKey = "flower-planner-state";

export function getPlannerStorageKey(userId) {
  return `${legacyPlannerStorageKey}:${userId}`;
}

export function resolvePlannerBootstrap({
  remotePlanner,
  userCachedPlanner,
  legacyPlanner,
  initialPlanner,
}) {
  if (remotePlanner !== null) {
    return {
      planner: remotePlanner,
      shouldCreateRemote: false,
      canMigrateLegacy: false,
    };
  }

  if (legacyPlanner !== null) {
    return {
      planner: userCachedPlanner ?? legacyPlanner,
      shouldCreateRemote: false,
      canMigrateLegacy: true,
    };
  }

  if (userCachedPlanner !== null) {
    return {
      planner: userCachedPlanner,
      shouldCreateRemote: true,
      canMigrateLegacy: false,
    };
  }

  return {
    planner: initialPlanner,
    shouldCreateRemote: true,
    canMigrateLegacy: false,
  };
}

export function readStoredPlanner(storageKey) {
  try {
    const storedValue = window.localStorage.getItem(storageKey);
    return storedValue ? parsePlannerState(JSON.parse(storedValue)) : null;
  } catch {
    return null;
  }
}

export function writeStoredPlanner(storageKey, planner) {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(parsePlannerState(planner)));
  } catch {
    // Storage can be unavailable or full in restricted browsing contexts.
  }
}

export function removeStoredPlanner(storageKey) {
  try {
    window.localStorage.removeItem(storageKey);
  } catch {
    // Storage can be unavailable in restricted browsing contexts.
  }
}

export async function migrateLegacyPlanner({
  planner,
  save,
  storageKey = legacyPlannerStorageKey,
}) {
  const saved = await save(planner, 0);
  removeStoredPlanner(storageKey);
  return saved;
}
