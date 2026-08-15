import React, { useCallback } from "react";
import { useSortable } from "@dnd-kit/react/sortable";
import "./SortableFolderTab.css";

export default function SortableFolderTab({
  folder,
  index,
  dragDisabled,
  isActive,
  isEditing,
  folderDraft,
  editInputRef,
  onFolderDraftChange,
  onSelectFolder,
  onStartEditingFolder,
  onCommitFolderName,
  onCancelFolderEdit,
}) {
  const { ref, handleRef, isDragging } = useSortable({
    id: folder.id,
    index,
    data: { label: folder.label },
    disabled: isEditing || dragDisabled,
  });

  const sortableRef = useCallback(
    (element) => {
      ref(element);
      handleRef(element);
    },
    [handleRef, ref],
  );

  if (isEditing) {
    return (
      <input
        ref={editInputRef}
        className={`folder-tab-wrap folder-tab folder-name-input ${isActive ? "is-active" : ""}`}
        data-folder-id={folder.id}
        autoComplete="off"
        maxLength={100}
        value={folderDraft}
        onChange={(event) => onFolderDraftChange(event.target.value)}
        onBlur={onCommitFolderName}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            onCommitFolderName();
          }
          if (event.key === "Escape") {
            event.preventDefault();
            onCancelFolderEdit();
          }
        }}
        aria-label={`${folder.label} 폴더 이름 수정`}
      />
    );
  }

  return (
    <button
      ref={sortableRef}
      className={`folder-tab-wrap folder-tab ${isActive ? "is-active" : ""} ${
        isDragging ? "folder-tab-placeholder" : ""
      } ${dragDisabled ? "is-touch-scrollable" : ""}`}
      data-folder-id={folder.id}
      type="button"
      onClick={() => onSelectFolder(folder.id)}
      onDoubleClick={() => onStartEditingFolder(folder)}
      aria-current={isActive ? "page" : undefined}
      title={`${folder.label} - 더블클릭해서 이름 수정, Space로 들고 방향키로 이동`}
    >
      <span>{folder.label}</span>
    </button>
  );
}
