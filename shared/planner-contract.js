export const MAX_PLANNER_BYTES = 1_000_000;

const MAX_FOLDERS = 100;
const MAX_TASKS = 5_000;
const MAX_MEMOS = 1_000;

function invalidPlanner() {
  return new TypeError("INVALID_PLANNER");
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasOnlyKeys(value, keys) {
  const actualKeys = Object.keys(value);
  return actualKeys.length === keys.length && actualKeys.every((key) => keys.includes(key));
}

function isText(value, maxLength) {
  return typeof value === "string" && value.trim().length > 0 && value.length <= maxLength;
}

function isItemId(value) {
  return (
    (typeof value === "number" && Number.isSafeInteger(value)) ||
    (typeof value === "string" && value.length > 0 && value.length <= 128)
  );
}

export function parsePlannerState(value) {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, ["folders", "activeFolder", "tasks", "memos"]) ||
    !Array.isArray(value.folders) ||
    value.folders.length === 0 ||
    value.folders.length > MAX_FOLDERS ||
    !Array.isArray(value.tasks) ||
    value.tasks.length > MAX_TASKS ||
    !Array.isArray(value.memos) ||
    value.memos.length > MAX_MEMOS
  ) {
    throw invalidPlanner();
  }

  const folders = value.folders.map((folder) => {
    if (
      !isRecord(folder) ||
      !hasOnlyKeys(folder, ["id", "label"]) ||
      !isText(folder.id, 128) ||
      !isText(folder.label, 100)
    ) {
      throw invalidPlanner();
    }
    return { id: folder.id, label: folder.label };
  });
  const folderIds = new Set(folders.map((folder) => folder.id));
  if (folderIds.size !== folders.length || !folderIds.has(value.activeFolder)) {
    throw invalidPlanner();
  }

  const tasks = value.tasks.map((task) => {
    if (
      !isRecord(task) ||
      !hasOnlyKeys(task, ["id", "folder", "title", "done"]) ||
      !isItemId(task.id) ||
      !folderIds.has(task.folder) ||
      !isText(task.title, 500) ||
      typeof task.done !== "boolean"
    ) {
      throw invalidPlanner();
    }
    return { id: task.id, folder: task.folder, title: task.title, done: task.done };
  });

  const memos = value.memos.map((memo) => {
    if (
      !isRecord(memo) ||
      !hasOnlyKeys(memo, ["id", "folder", "content"]) ||
      !isItemId(memo.id) ||
      !folderIds.has(memo.folder) ||
      !isText(memo.content, 5_000)
    ) {
      throw invalidPlanner();
    }
    return { id: memo.id, folder: memo.folder, content: memo.content };
  });

  return { folders, activeFolder: value.activeFolder, tasks, memos };
}

export function serializePlannerState(value) {
  const serialized = JSON.stringify(parsePlannerState(value));
  if (new TextEncoder().encode(serialized).byteLength > MAX_PLANNER_BYTES) {
    throw new RangeError("PLANNER_TOO_LARGE");
  }
  return serialized;
}
