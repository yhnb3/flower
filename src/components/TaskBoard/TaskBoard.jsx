import React from "react";
import { Check, Clock3, Plus } from "lucide-react";
import EmptyState from "../EmptyState/EmptyState.jsx";
import TaskItem from "../TaskItem/TaskItem.jsx";
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
                  <TaskItem
                    key={task.id}
                    task={task}
                    isEditing={!task.done && editingTask === task.id}
                    editDraft={editDraft}
                    onEditDraftChange={onEditDraftChange}
                    onStartEditing={onStartEditing}
                    onCommitEdit={onCommitEdit}
                    onCancelEdit={onCancelEdit}
                    onToggle={onToggle}
                    onRemove={onRemove}
                  />
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </>
  );
}
