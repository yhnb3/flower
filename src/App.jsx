import React, { useEffect, useMemo, useRef, useState } from "react";
import { Archive, Check, Cloud, CloudOff, Clock3, Plus, RefreshCw, Trash2 } from "lucide-react";
import {
  legacyPlannerStorageKey,
  readStoredPlanner,
  writeStoredPlanner,
} from "./planner-storage.js";
import "./styles.css";

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

function SyncStatus({ status, onRetry }) {
  if (!status) return null;
  const needsAction = status.type === "error" || status.type === "conflict";
  const StatusIcon = needsAction ? CloudOff : status.type === "saving" ? RefreshCw : Cloud;

  return (
    <div className={`sync-status is-${status.type}`} role="status" aria-live="polite">
      <StatusIcon
        aria-hidden="true"
        className={status.type === "saving" ? "is-spinning" : ""}
        size={16}
      />
      <span>{status.message}</span>
      {needsAction ? (
        <button type="button" onClick={onRetry}>
          {status.type === "conflict" ? "새로고침" : "다시 시도"}
        </button>
      ) : null}
    </div>
  );
}

export default function App({
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
  const [editingMemo, setEditingMemo] = useState(null);
  const [memoEditDraft, setMemoEditDraft] = useState("");
  const folderEditInputRef = useRef(null);
  const memoEditInputRef = useRef(null);
  const hasMountedRef = useRef(false);

  const visibleTasks = tasks.filter((task) => task.folder === activeFolder);
  const openTasks = visibleTasks.filter((task) => !task.done);
  const doneTasks = visibleTasks.filter((task) => task.done);
  const visibleMemos = memos.filter((memo) => memo.folder === activeFolder);
  const activeMeta = folders.find((folder) => folder.id === activeFolder);

  const taskColumns = useMemo(
    () => [
      {
        id: "open",
        title: "처리되지 않은 아이템",
        countLabel: `${openTasks.length}개`,
        icon: <Clock3 aria-hidden="true" size={18} />,
        tasks: openTasks,
        emptyTitle: "아직 남은 일이 없어요.",
        emptyBody: "새 할 일을 추가하면 이쪽에 먼저 쌓입니다.",
      },
      {
        id: "done",
        title: "처리된 아이템",
        countLabel: `${doneTasks.length}개`,
        icon: <Check aria-hidden="true" size={18} />,
        tasks: doneTasks,
        emptyTitle: "완료한 일이 없어요.",
        emptyBody: "왼쪽 아이템을 체크하면 이쪽으로 이동합니다.",
      },
    ],
    [doneTasks, openTasks],
  );

  useEffect(() => {
    const planner = { folders, activeFolder, tasks, memos };
    writeStoredPlanner(storageKey, planner);
    if (hasMountedRef.current) onPlannerChange?.(planner);
    hasMountedRef.current = true;
  }, [activeFolder, folders, memos, onPlannerChange, storageKey, tasks]);

  useEffect(() => {
    if (editingFolder) {
      folderEditInputRef.current?.focus();
    }
  }, [editingFolder]);

  useEffect(() => {
    if (editingMemo) {
      memoEditInputRef.current?.focus();
    }
  }, [editingMemo]);

  function addTask(event) {
    event.preventDefault();
    const title = taskDraft.trim();
    if (!title) return;
    setTasks((current) => [
      { id: Date.now(), folder: activeFolder, title, done: false },
      ...current,
    ]);
    setTaskDraft("");
  }

  function toggleTask(id) {
    setTasks((current) =>
      current.map((task) => (task.id === id ? { ...task, done: !task.done } : task)),
    );
  }

  function removeTask(id) {
    setTasks((current) => current.filter((task) => task.id !== id));
  }

  function addMemo(event) {
    event.preventDefault();
    const content = memoDraft.trim();
    if (!content) return;
    setMemos((current) => [
      { id: Date.now(), folder: activeFolder, content },
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
    if (!editingMemo) return;
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
    const id = `folder-${Date.now()}`;
    const nextFolder = { id, label: "새 폴더" };
    setFolders((current) => [...current, nextFolder]);
    setActiveFolder(id);
    setEditingFolder(id);
    setFolderDraft(nextFolder.label);
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
    if (editingMemo) cancelMemoEdit();
  }

  function startEditingFolder(folder) {
    setEditingFolder(folder.id);
    setFolderDraft(folder.label);
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
    window.requestAnimationFrame(() => {
      document
        .querySelector(`[data-folder-id="${editingFolder}"]`)
        ?.scrollIntoView({ block: "nearest", inline: "start" });
    });
  }

  function cancelFolderEdit() {
    setEditingFolder(null);
    setFolderDraft("");
  }

  return (
    <main className="app-shell" data-styleseed-recipe="calm-consumer">
      <section className="workspace" aria-labelledby="page-title">
        <header className="topbar">
          <h1 id="page-title">花 Planner</h1>
          <div className="topbar-actions">
            <SyncStatus status={syncStatus} onRetry={onRetrySync} />
            {migrationControl}
            {accountControl}
          </div>
        </header>

        <div className="folder-board">
          <nav className="folder-tabs" aria-label="할 일 폴더">
            {folders.map((folder) => (
              <div
                className={`folder-tab-wrap ${activeFolder === folder.id ? "is-active" : ""}`}
                data-folder-id={folder.id}
                key={folder.id}
              >
                {editingFolder === folder.id ? (
                  <input
                    ref={folderEditInputRef}
                    className={`folder-tab folder-name-input ${
                      activeFolder === folder.id ? "is-active" : ""
                    }`}
                    autoComplete="off"
                    maxLength={100}
                    value={folderDraft}
                    onChange={(event) => setFolderDraft(event.target.value)}
                    onBlur={commitFolderName}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        commitFolderName();
                      }
                      if (event.key === "Escape") {
                        event.preventDefault();
                        cancelFolderEdit();
                      }
                    }}
                    aria-label={`${folder.label} 폴더 이름 수정`}
                  />
                ) : (
                  <button
                    className={`folder-tab ${activeFolder === folder.id ? "is-active" : ""}`}
                    type="button"
                    onClick={() => setActiveFolder(folder.id)}
                    onDoubleClick={() => startEditingFolder(folder)}
                    aria-pressed={activeFolder === folder.id}
                    title={`${folder.label} - 더블클릭해서 폴더 이름 수정`}
                  >
                    <span>{folder.label}</span>
                  </button>
                )}
              </div>
            ))}
            <button className="folder-add-tab" type="button" onClick={addFolder}>
              <Plus aria-hidden="true" size={18} />
              새 폴더
            </button>
          </nav>

          <div className="folder-sheet">
            <section className="memo-area" aria-label="메모">
              <form className="memo-add-row" onSubmit={addMemo}>
                <textarea
                  id="memo-input"
                  aria-label="새 메모"
                  autoComplete="off"
                  maxLength={5000}
                  value={memoDraft}
                  onChange={(event) => setMemoDraft(event.target.value)}
                  placeholder="메모를 적어주세요"
                  rows={1}
                />
                <button type="submit">
                  <Plus aria-hidden="true" size={18} />
                  추가
                </button>
              </form>

              {visibleMemos.length === 0 ? (
                <div className="empty-state memo-empty-state" role="status">
                  <Archive aria-hidden="true" size={28} />
                  <h3>메모가 없어요.</h3>
                  <p>위 입력칸에 남겨둘 내용을 적어보세요.</p>
                </div>
              ) : (
                <ul className="memo-list" aria-label="메모 목록">
                  {visibleMemos.map((memo) => (
                    <li className="memo-item" key={memo.id}>
                      {editingMemo === memo.id ? (
                        <textarea
                          ref={memoEditInputRef}
                          className="memo-edit-input"
                          aria-label="메모 수정"
                          autoComplete="off"
                          maxLength={5000}
                          value={memoEditDraft}
                          onChange={(event) => setMemoEditDraft(event.target.value)}
                          onBlur={commitMemoEdit}
                          onKeyDown={(event) => {
                            if (event.key === "Escape") {
                              event.preventDefault();
                              cancelMemoEdit();
                            }
                            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                              event.preventDefault();
                              commitMemoEdit();
                            }
                          }}
                          rows={2}
                        />
                      ) : (
                        <button
                          className="memo-content"
                          type="button"
                          onClick={() => startEditingMemo(memo)}
                          aria-label={`${memo.content} 메모 수정`}
                          title="클릭해서 메모 수정"
                        >
                          {memo.content}
                        </button>
                      )}
                      <button
                        className="delete-button"
                        type="button"
                        aria-label={`${memo.content} 삭제`}
                        onClick={() => removeMemo(memo.id)}
                      >
                        <Trash2 aria-hidden="true" size={18} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <form className="add-row" onSubmit={addTask}>
              <input
                id="task-input"
                aria-label="새 할 일"
                autoComplete="off"
                maxLength={500}
                value={taskDraft}
                onChange={(event) => setTaskDraft(event.target.value)}
                placeholder="할 일 추가"
              />
              <button type="submit">
                <Plus aria-hidden="true" size={18} />
                추가
              </button>
            </form>

            <div className="task-board" aria-label="할 일 보드">
              {taskColumns.map((column) => (
                <section className="task-column" aria-labelledby={`${column.id}-tasks`} key={column.id}>
                  <div className="task-column-header">
                    <h2 id={`${column.id}-tasks`}>
                      {column.icon}
                      {column.title}
                    </h2>
                    <span>{column.countLabel}</span>
                  </div>

                  {column.tasks.length === 0 ? (
                    <div className="empty-state is-compact" role="status">
                      <Archive aria-hidden="true" size={28} />
                      <h3>{column.emptyTitle}</h3>
                      <p>{column.emptyBody}</p>
                    </div>
                  ) : (
                    <ul className="task-stack" aria-label={column.title}>
                      {column.tasks.map((task) => (
                        <li className={`task-note ${task.done ? "is-done" : ""}`} key={task.id}>
                          <button
                            className="check-button"
                            type="button"
                            aria-label={`${task.title} ${task.done ? "미완료로 바꾸기" : "완료하기"}`}
                            onClick={() => toggleTask(task.id)}
                          >
                            {task.done ? <Check aria-hidden="true" size={18} /> : null}
                          </button>
                          <div className="task-copy">
                            <span>{task.title}</span>
                          </div>
                          <button
                            className="delete-button"
                            type="button"
                            aria-label={`${task.title} 삭제`}
                            onClick={() => removeTask(task.id)}
                          >
                            <Trash2 aria-hidden="true" size={18} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ))}
            </div>

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
