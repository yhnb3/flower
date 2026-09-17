import React, { useEffect, useMemo, useRef } from "react";
import { ArrowRight, Undo2 } from "lucide-react";
import EmptyState from "../EmptyState/EmptyState.jsx";
import TaskItem from "../TaskItem/TaskItem.jsx";
import "./OpenTasksOverview.css";

export default function OpenTasksOverview({
  folders,
  tasks,
  editingTask,
  editDraft,
  recentCompletion,
  onEditDraftChange,
  onStartEditing,
  onCommitEdit,
  onCancelEdit,
  onComplete,
  onUndoCompletion,
  onDismissCompletion,
  onRemove,
  onOpenFolder,
}) {
  const overviewRef = useRef(null);
  const undoButtonRef = useRef(null);
  const taskToRefocusRef = useRef(null);
  const openTasks = useMemo(() => tasks.filter((task) => !task.done), [tasks]);
  const groups = useMemo(() => {
    const tasksByFolder = new Map(folders.map((folder) => [folder.id, []]));
    for (const task of openTasks) tasksByFolder.get(task.folder)?.push(task);

    return folders
      .map((folder) => ({ folder, tasks: tasksByFolder.get(folder.id) }))
      .filter((group) => group.tasks.length > 0);
  }, [folders, openTasks]);

  useEffect(() => {
    if (!recentCompletion) return undefined;

    undoButtonRef.current?.focus();
    const timeoutId = window.setTimeout(() => {
      if (document.activeElement === undoButtonRef.current) overviewRef.current?.focus();
      onDismissCompletion(recentCompletion.id);
    }, 5_000);

    return () => window.clearTimeout(timeoutId);
  }, [onDismissCompletion, recentCompletion]);

  useEffect(() => {
    const taskId = taskToRefocusRef.current;
    if (!taskId) return;

    const restoredTaskButton = document.querySelector(
      `[data-task-id="${CSS.escape(taskId)}"] .check-button`,
    );
    if (!restoredTaskButton) return;

    restoredTaskButton.focus();
    taskToRefocusRef.current = null;
  }, [openTasks]);

  function undoCompletion() {
    const taskId = recentCompletion.id;
    taskToRefocusRef.current = taskId;
    onUndoCompletion(taskId);
  }

  return (
    <section
      ref={overviewRef}
      className="open-tasks-overview"
      aria-label="미완료 할 일"
      tabIndex={-1}
    >
      {recentCompletion ? (
        <div className="open-tasks-feedback">
          <span role="status" aria-live="polite">
            {recentCompletion.title}을 완료했어요.
          </span>
          <button
            ref={undoButtonRef}
            type="button"
            aria-label="완료 실행 취소"
            onClick={undoCompletion}
          >
            <Undo2 aria-hidden="true" size={17} />
            실행 취소
          </button>
        </div>
      ) : null}

      {groups.length === 0 ? (
        <EmptyState
          title="남은 일이 없어요."
          description="모든 폴더의 할 일을 완료했습니다."
          variant="compact"
        />
      ) : (
        <div className="open-tasks-groups">
          {groups.map(({ folder, tasks: folderTasks }, groupIndex) => (
            <section
              className="open-tasks-group"
              aria-labelledby={`open-tasks-folder-${groupIndex}`}
              key={folder.id}
            >
              <header className="open-tasks-group-header">
                <div>
                  <h2 id={`open-tasks-folder-${groupIndex}`}>{folder.label}</h2>
                  <span>{folderTasks.length}개</span>
                </div>
                <button
                  type="button"
                  aria-label={`${folder.label} 폴더로 이동`}
                  onClick={() => onOpenFolder(folder.id)}
                >
                  폴더로 이동
                  <ArrowRight aria-hidden="true" size={17} />
                </button>
              </header>

              <ul className="open-tasks-stack" aria-label={`${folder.label} 폴더 미완료 할 일`}>
                {folderTasks.map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    isEditing={editingTask === task.id}
                    editDraft={editDraft}
                    onEditDraftChange={onEditDraftChange}
                    onStartEditing={onStartEditing}
                    onCommitEdit={onCommitEdit}
                    onCancelEdit={onCancelEdit}
                    onToggle={onComplete}
                    onRemove={onRemove}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </section>
  );
}
