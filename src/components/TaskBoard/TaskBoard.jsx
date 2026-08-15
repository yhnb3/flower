import React, { useEffect, useRef } from "react";
import { Check, Clock3, Plus, Trash2 } from "lucide-react";
import EmptyState from "../EmptyState/EmptyState.jsx";
import "./TaskBoard.css";

export default function TaskBoard({
  tasks,
  draft,
  onDraftChange,
  onAdd,
  editingTask,
  editDraft,
  onEditDraftChange,
  onStartEditing,
  onCommitEdit,
  onCancelEdit,
  onToggle,
  onRemove,
}) {
  const editInputRef = useRef(null);
  const openTasks = tasks.filter((task) => !task.done);
  const doneTasks = tasks.filter((task) => task.done);
  const columns = [
    {
      id: "open",
      title: "체크리스트",
      tasks: openTasks,
      icon: <Clock3 aria-hidden="true" size={18} />,
      emptyTitle: "아직 남은 일이 없어요.",
      emptyBody: "새 할 일을 추가하면 이쪽에 먼저 쌓입니다.",
    },
    {
      id: "done",
      title: "완료",
      tasks: doneTasks,
      icon: <Check aria-hidden="true" size={18} />,
      emptyTitle: "완료한 일이 없어요.",
      emptyBody: "왼쪽 아이템을 체크하면 이쪽으로 이동합니다.",
    },
  ];

  useEffect(() => {
    if (editingTask !== null) editInputRef.current?.focus();
  }, [editingTask]);

  return (
    <>
      <form className="add-row" onSubmit={onAdd}>
        <input
          id="task-input"
          aria-label="새 할 일"
          autoComplete="off"
          maxLength={500}
          value={draft}
          onChange={(event) => onDraftChange(event.target.value)}
          placeholder="할 일 추가"
        />
        <button type="submit">
          <Plus aria-hidden="true" size={18} />
          추가
        </button>
      </form>

      <div className="task-board" aria-label="할 일 보드">
        {columns.map((column) => (
          <section className="task-column" aria-labelledby={`${column.id}-tasks`} key={column.id}>
            <div className="task-column-header">
              <h2 id={`${column.id}-tasks`}>
                {column.icon}
                {column.title}
              </h2>
              <span>{column.tasks.length}개</span>
            </div>

            {column.tasks.length === 0 ? (
              <EmptyState
                title={column.emptyTitle}
                description={column.emptyBody}
                variant="compact"
              />
            ) : (
              <ul className="task-stack" aria-label={column.title}>
                {column.tasks.map((task) => (
                  <li className={`task-note ${task.done ? "is-done" : ""}`} key={task.id}>
                    <button
                      className="check-button"
                      type="button"
                      aria-pressed={task.done}
                      aria-label={`${task.title} ${task.done ? "미완료로 바꾸기" : "완료하기"}`}
                      onClick={() => onToggle(task.id)}
                    >
                      {task.done ? <Check aria-hidden="true" size={18} /> : null}
                    </button>
                    {!task.done && editingTask === task.id ? (
                      <input
                        ref={editInputRef}
                        className="task-edit-input"
                        aria-label="할 일 수정"
                        autoComplete="off"
                        maxLength={500}
                        value={editDraft}
                        onChange={(event) => onEditDraftChange(event.target.value)}
                        onBlur={onCommitEdit}
                        onKeyDown={(event) => {
                          if (event.key === "Escape") {
                            event.preventDefault();
                            onCancelEdit();
                          }
                          if (event.key === "Enter" && !event.nativeEvent.isComposing) {
                            event.preventDefault();
                            onCommitEdit();
                          }
                        }}
                      />
                    ) : task.done ? (
                      <div className="task-copy">
                        <span>{task.title}</span>
                      </div>
                    ) : (
                      <button
                        className="task-copy"
                        type="button"
                        onClick={() => onStartEditing(task)}
                        aria-label={`${task.title} 할 일 수정`}
                        title="클릭해서 할 일 수정"
                      >
                        <span>{task.title}</span>
                      </button>
                    )}
                    <button
                      className="delete-button"
                      type="button"
                      aria-label={`${task.title} 삭제`}
                      onClick={() => onRemove(task.id)}
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
    </>
  );
}
