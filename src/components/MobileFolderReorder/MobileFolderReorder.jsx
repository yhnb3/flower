import React, { useEffect, useRef, useState } from "react";
import { DragDropProvider, DragOverlay } from "@dnd-kit/react";
import { isSortable, useSortable } from "@dnd-kit/react/sortable";
import { GripVertical } from "lucide-react";
import { folderTabSensors } from "../FolderTabs/folderTabSensors.js";
import "./MobileFolderReorder.css";

function SortableMobileFolder({ folder, index }) {
  const { ref, handleRef, isDragging } = useSortable({
    id: folder.id,
    index,
    data: { label: folder.label },
  });

  return (
    <li
      ref={ref}
      className={`mobile-folder-reorder-item ${
        isDragging ? "mobile-folder-reorder-placeholder" : ""
      }`}
      data-mobile-folder-id={folder.id}
    >
      <button
        ref={handleRef}
        className="mobile-folder-reorder-handle"
        type="button"
        aria-label={`${folder.label} 이동`}
        title="드래그하거나 Space로 든 뒤 방향키로 이동"
      >
        <GripVertical aria-hidden="true" size={22} />
      </button>
      <span className="mobile-folder-reorder-label">{folder.label}</span>
    </li>
  );
}

export default function MobileFolderReorder({
  folders,
  isOpen,
  announcement,
  onClose,
  onDragEnd,
}) {
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);
  const previousFocusRef = useRef(null);
  const [folderToRefocus, setFolderToRefocus] = useState(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!isOpen || !dialog) return undefined;

    previousFocusRef.current = document.activeElement;
    if (!dialog.open) dialog.showModal();
    closeButtonRef.current?.focus();
    return () => {
      if (dialog.open) dialog.close();
      previousFocusRef.current?.focus({ preventScroll: true });
    };
  }, [isOpen]);

  useEffect(() => {
    if (!folderToRefocus) return;

    dialogRef.current
      ?.querySelector(
        `[data-mobile-folder-id="${CSS.escape(folderToRefocus)}"] .mobile-folder-reorder-handle`,
      )
      ?.focus({ preventScroll: true });
    setFolderToRefocus(null);
  }, [folderToRefocus, folders]);

  if (!isOpen) return null;

  function handleDragEnd(event) {
    const { source } = event.operation;
    if (event.nativeEvent instanceof KeyboardEvent && isSortable(source)) {
      setFolderToRefocus(source.id);
    }
    onDragEnd(event);
  }

  function handleCancel(event) {
    event.preventDefault();
    onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      className="mobile-folder-reorder-dialog"
      aria-labelledby="mobile-folder-reorder-title"
      aria-describedby="mobile-folder-reorder-description"
      onCancel={handleCancel}
    >
      <DragDropProvider sensors={folderTabSensors} onDragEnd={handleDragEnd}>
        <div className="mobile-folder-reorder-layout">
          <header className="mobile-folder-reorder-header">
            <div>
              <h2 id="mobile-folder-reorder-title">폴더 순서 변경</h2>
              <p id="mobile-folder-reorder-description">
                왼쪽 손잡이를 끌어 순서를 바꿔보세요.
              </p>
            </div>
            <button ref={closeButtonRef} type="button" onClick={onClose}>
              완료
            </button>
          </header>

          <ol className="mobile-folder-reorder-list" aria-label="폴더 순서">
            {folders.map((folder, index) => (
              <SortableMobileFolder key={folder.id} folder={folder} index={index} />
            ))}
          </ol>

          <span className="visually-hidden" aria-live="polite">
            {announcement}
          </span>
        </div>

        <DragOverlay className="mobile-folder-reorder-overlay">
          {(source) => {
            const folder = folders.find((item) => item.id === source.id);
            if (!folder) return null;

            return (
              <div className="mobile-folder-reorder-item">
                <span className="mobile-folder-reorder-handle" aria-hidden="true">
                  <GripVertical size={22} />
                </span>
                <span className="mobile-folder-reorder-label">{folder.label}</span>
              </div>
            );
          }}
        </DragOverlay>
      </DragDropProvider>
    </dialog>
  );
}
