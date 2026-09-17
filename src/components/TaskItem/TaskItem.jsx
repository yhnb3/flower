import React, { useEffect, useRef } from "react";
import { Check, Trash2 } from "lucide-react";
import "./TaskItem.css";

export default function TaskItem({
  task,
  isEditing,
  editDraft,
  onEditDraftChange,
  onStartEditing,
  onCommitEdit,
  onCancelEdit,
  onToggle,
  onRemove,
}) {
  const editInputRef = useRef(null);

  useEffect(() => {
    if (isEditing) editInputRef.current?.focus();
  }, [isEditing]);

  return (
    <li
      className={`task-note ${task.done ? "is-done" : ""}`}
      data-task-id={task.id}
    >
      <button
        className="check-button"
        type="button"
        aria-pressed={task.done}
        aria-label={`${task.title} ${task.done ? "미완료로 바꾸기" : "완료하기"}`}
        onClick={() => onToggle(task.id)}
      >
        {task.done ? <Check aria-hidden="true" size={18} /> : null}
      </button>
      {!task.done && isEditing ? (
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
  );
}
