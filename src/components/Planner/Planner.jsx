import React, { useEffect, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import {
  legacyPlannerStorageKey,
  readStoredPlanner,
  writeStoredPlanner,
} from "../../planner-storage.js";
import { readStoredTheme, writeStoredTheme } from "../../theme-preference.js";
import FolderTabs from "../FolderTabs/FolderTabs.jsx";
import MemoArea from "../MemoArea/MemoArea.jsx";
import SyncStatus from "../SyncStatus/SyncStatus.jsx";
import TaskBoard from "../TaskBoard/TaskBoard.jsx";
import ThemeMenu from "../ThemeMenu/ThemeMenu.jsx";
import "./Planner.css";

const initialFolders = [
  { id: "today", label: "오늘" },
];

const initialTasks = [];

const initialMemos = [];

export const initialPlannerState = {
  folders: initialFolders,
  activeFolder: initialFolders[0].id,
  tasks: initialTasks,
  memos: initialMemos,
};

export default function Planner({
  initialPlanner,
  storageKey = legacyPlannerStorageKey,
  onPlannerChange,
  syncStatus,
  onRetrySync,
  migrationControl,
  accountControl,
}) {
  const [storedPlanner] = useState(
    () => initialPlanner ?? readStoredPlanner(storageKey) ?? initialPlannerState,
  );
  const [folders, setFolders] = useState(() => storedPlanner?.folders ?? initialFolders);
  const [activeFolder, setActiveFolder] = useState(
    () => storedPlanner?.activeFolder ?? initialFolders[0].id,
  );
  const [tasks, setTasks] = useState(() => storedPlanner?.tasks ?? initialTasks);
  const [memos, setMemos] = useState(() => storedPlanner?.memos ?? initialMemos);
  const [taskDraft, setTaskDraft] = useState("");
  const [memoDraft, setMemoDraft] = useState("");
  const [editingFolder, setEditingFolder] = useState(null);
  const [folderDraft, setFolderDraft] = useState("");
  const [selectFolderDraftOnFocus, setSelectFolderDraftOnFocus] = useState(false);
  const [editingMemo, setEditingMemo] = useState(null);
  const [memoEditDraft, setMemoEditDraft] = useState("");
  const [editingTask, setEditingTask] = useState(null);
  const [taskEditDraft, setTaskEditDraft] = useState("");
  const [theme, setTheme] = useState(() => readStoredTheme());
  const hasMountedRef = useRef(false);

  const visibleTasks = tasks.filter((task) => task.folder === activeFolder);
  const visibleMemos = memos.filter((memo) => memo.folder === activeFolder);
  const activeMeta = folders.find((folder) => folder.id === activeFolder);

  useEffect(() => {
    const planner = { folders, activeFolder, tasks, memos };
    writeStoredPlanner(storageKey, planner);
    if (hasMountedRef.current) onPlannerChange?.(planner);
    hasMountedRef.current = true;
  }, [activeFolder, folders, memos, onPlannerChange, storageKey, tasks]);

  function addTask(event) {
    event.preventDefault();
    const title = taskDraft.trim();
    if (!title) return;
    setTasks((current) => [
      { id: `task-${window.crypto.randomUUID()}`, folder: activeFolder, title, done: false },
      ...current,
    ]);
    setTaskDraft("");
  }

  function toggleTask(id) {
    setTasks((current) =>
      current.map((task) => (task.id === id ? { ...task, done: !task.done } : task)),
    );
    if (editingTask === id) cancelTaskEdit();
  }

  function removeTask(id) {
    setTasks((current) => current.filter((task) => task.id !== id));
    if (editingTask === id) cancelTaskEdit();
  }

  function startEditingTask(task) {
    if (task.done) return;
    setEditingTask(task.id);
    setTaskEditDraft(task.title);
  }

  function commitTaskEdit() {
    if (editingTask === null) return;
    const title = taskEditDraft.trim();
    if (title) {
      setTasks((current) =>
        current.map((task) => (task.id === editingTask ? { ...task, title } : task)),
      );
    }
    setEditingTask(null);
    setTaskEditDraft("");
  }

  function cancelTaskEdit() {
    setEditingTask(null);
    setTaskEditDraft("");
  }

  function addMemo(event) {
    event.preventDefault();
    const content = memoDraft.trim();
    if (!content) return;
    setMemos((current) => [
      { id: `memo-${window.crypto.randomUUID()}`, folder: activeFolder, content },
      ...current,
    ]);
    setMemoDraft("");
  }

  function removeMemo(id) {
    setMemos((current) => current.filter((memo) => memo.id !== id));
    if (editingMemo === id) cancelMemoEdit();
  }

  function startEditingMemo(memo) {
    setEditingMemo(memo.id);
    setMemoEditDraft(memo.content);
  }

  function commitMemoEdit() {
    if (editingMemo === null) return;
    const content = memoEditDraft.trim();
    if (content) {
      setMemos((current) =>
        current.map((memo) => (memo.id === editingMemo ? { ...memo, content } : memo)),
      );
    }
    setEditingMemo(null);
    setMemoEditDraft("");
  }

  function cancelMemoEdit() {
    setEditingMemo(null);
    setMemoEditDraft("");
  }

  function addFolder() {
    const id = `folder-${window.crypto.randomUUID()}`;
    const nextFolder = { id, label: "새 폴더" };
    setFolders((current) => [...current, nextFolder]);
    setActiveFolder(id);
    setEditingFolder(id);
    setFolderDraft(nextFolder.label);
    setSelectFolderDraftOnFocus(true);
  }

  function reorderFolders(folderIds) {
    setFolders((current) => {
      if (folderIds.length !== current.length || new Set(folderIds).size !== current.length) {
        return current;
      }

      const foldersById = new Map(current.map((folder) => [folder.id, folder]));
      const nextFolders = folderIds.map((folderId) => foldersById.get(folderId));
      if (nextFolders.some((folder) => !folder)) return current;

      return nextFolders;
    });
  }

  function deleteActiveFolder() {
    if (folders.length <= 1) return;
    if (!window.confirm(`${activeMeta.label} 폴더와 안의 내용 전체를 삭제할까요?`)) return;

    const currentIndex = folders.findIndex((folder) => folder.id === activeFolder);
    const nextFolders = folders.filter((folder) => folder.id !== activeFolder);
    const nextActiveFolder =
      nextFolders[Math.max(0, Math.min(currentIndex, nextFolders.length - 1))]?.id;

    setFolders(nextFolders);
    setTasks((current) => current.filter((task) => task.folder !== activeFolder));
    setMemos((current) => current.filter((memo) => memo.folder !== activeFolder));
    setActiveFolder(nextActiveFolder);
    if (editingFolder === activeFolder) cancelFolderEdit();
    if (editingMemo !== null) cancelMemoEdit();
    if (editingTask !== null) cancelTaskEdit();
  }

  function startEditingFolder(folder) {
    setEditingFolder(folder.id);
    setFolderDraft(folder.label);
    setSelectFolderDraftOnFocus(false);
  }

  function commitFolderName() {
    if (!editingFolder) return;
    const nextLabel = folderDraft.trim();
    if (nextLabel) {
      setFolders((current) =>
        current.map((folder) =>
          folder.id === editingFolder ? { ...folder, label: nextLabel } : folder,
        ),
      );
    }
    setEditingFolder(null);
    setFolderDraft("");
    setSelectFolderDraftOnFocus(false);
    window.requestAnimationFrame(() => {
      document
        .querySelector(`[data-folder-id="${editingFolder}"]`)
        ?.scrollIntoView({ block: "nearest", inline: "start" });
    });
  }

  function cancelFolderEdit() {
    setEditingFolder(null);
    setFolderDraft("");
    setSelectFolderDraftOnFocus(false);
  }

  function changeTheme(nextTheme) {
    setTheme(nextTheme);
    writeStoredTheme(nextTheme);
  }

  return (
    <main className="app-shell" data-styleseed-recipe="calm-consumer" data-theme={theme}>
      <section className="workspace" aria-labelledby="page-title">
        <header className="topbar">
          <h1 id="page-title">花 Planner</h1>
          <div className="topbar-actions">
            <ThemeMenu activeTheme={theme} onThemeChange={changeTheme} />
            <SyncStatus status={syncStatus} onRetry={onRetrySync} />
            {migrationControl}
            {accountControl}
          </div>
        </header>

        <div className="folder-board">
          <FolderTabs
            folders={folders}
            activeFolder={activeFolder}
            editingFolder={editingFolder}
            folderDraft={folderDraft}
            selectFolderDraftOnFocus={selectFolderDraftOnFocus}
            onFolderDraftChange={setFolderDraft}
            onSelectFolder={setActiveFolder}
            onStartEditingFolder={startEditingFolder}
            onCommitFolderName={commitFolderName}
            onCancelFolderEdit={cancelFolderEdit}
            onAddFolder={addFolder}
            onReorderFolders={reorderFolders}
          />

          <div className="folder-sheet">
            <MemoArea
              memos={visibleMemos}
              draft={memoDraft}
              onDraftChange={setMemoDraft}
              onAdd={addMemo}
              editingMemo={editingMemo}
              editDraft={memoEditDraft}
              onEditDraftChange={setMemoEditDraft}
              onStartEditing={startEditingMemo}
              onCommitEdit={commitMemoEdit}
              onCancelEdit={cancelMemoEdit}
              onRemove={removeMemo}
            />

            <TaskBoard
              tasks={visibleTasks}
              draft={taskDraft}
              onDraftChange={setTaskDraft}
              onAdd={addTask}
              editingTask={editingTask}
              editDraft={taskEditDraft}
              onEditDraftChange={setTaskEditDraft}
              onStartEditing={startEditingTask}
              onCommitEdit={commitTaskEdit}
              onCancelEdit={cancelTaskEdit}
              onToggle={toggleTask}
              onRemove={removeTask}
            />

            <div className="folder-bottom-actions">
              <button
                className="folder-delete-button"
                type="button"
                onClick={deleteActiveFolder}
                disabled={folders.length <= 1}
                aria-label={`${activeMeta.label} 폴더 삭제`}
              >
                <Trash2 aria-hidden="true" size={18} />
                삭제
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
