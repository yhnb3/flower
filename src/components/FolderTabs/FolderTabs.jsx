import React, { useEffect, useRef, useState } from "react";
import { PointerActivationConstraints, PointerSensor } from "@dnd-kit/dom";
import { DragDropProvider, DragOverlay } from "@dnd-kit/react";
import { isSortable } from "@dnd-kit/react/sortable";
import { Plus } from "lucide-react";
import SortableFolderTab from "./SortableFolderTab.jsx";
import "./FolderTabs.css";

const folderTabSensors = (defaults) => [
  ...defaults.filter((sensor) => sensor !== PointerSensor),
  PointerSensor.configure({
    activationConstraints(event) {
      if (event.pointerType === "touch") {
        return [new PointerActivationConstraints.Delay({ value: 250, tolerance: 5 })];
      }

      return [new PointerActivationConstraints.Distance({ value: 8 })];
    },
  }),
];

function scrollFolderTabsOnWheel(event) {
  const tabs = event.currentTarget;
  const maxScrollLeft = tabs.scrollWidth - tabs.clientWidth;
  if (maxScrollLeft <= 0) return;

  const wheelDelta =
    Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
  const nextScrollLeft = Math.min(maxScrollLeft, Math.max(0, tabs.scrollLeft + wheelDelta));
  if (nextScrollLeft === tabs.scrollLeft) return;

  event.preventDefault();
  tabs.scrollLeft = nextScrollLeft;
}

export default function FolderTabs({
  folders,
  activeFolder,
  editingFolder,
  folderDraft,
  selectFolderDraftOnFocus,
  onFolderDraftChange,
  onSelectFolder,
  onStartEditingFolder,
  onCommitFolderName,
  onCancelFolderEdit,
  onAddFolder,
  onReorderFolders,
}) {
  const tabsRef = useRef(null);
  const editInputRef = useRef(null);
  const [reorderAnnouncement, setReorderAnnouncement] = useState("");
  const [folderToRefocus, setFolderToRefocus] = useState(null);

  useEffect(() => {
    if (!editingFolder) return;

    editInputRef.current?.focus();
    if (selectFolderDraftOnFocus) editInputRef.current?.select();
  }, [editingFolder, selectFolderDraftOnFocus]);

  useEffect(() => {
    const tabs = tabsRef.current;
    if (!tabs) return undefined;

    tabs.addEventListener("wheel", scrollFolderTabsOnWheel, { passive: false });
    return () => tabs.removeEventListener("wheel", scrollFolderTabsOnWheel);
  }, []);

  useEffect(() => {
    if (!folderToRefocus) return;

    tabsRef.current
      ?.querySelector(`[data-folder-id="${CSS.escape(folderToRefocus)}"]`)
      ?.focus({ preventScroll: true });
    setFolderToRefocus(null);
  }, [folderToRefocus, folders]);

  function handleDragEnd(event) {
    if (event.canceled) return;

    const { source } = event.operation;
    if (!isSortable(source) || source.initialIndex === source.index) return;

    const nextFolders = [...folders];
    const [movedFolder] = nextFolders.splice(source.initialIndex, 1);
    if (!movedFolder) return;

    nextFolders.splice(source.index, 0, movedFolder);
    onReorderFolders(nextFolders.map((folder) => folder.id));
    if (event.nativeEvent instanceof KeyboardEvent) setFolderToRefocus(movedFolder.id);
    setReorderAnnouncement(
      `${movedFolder.label} 폴더를 ${source.index + 1}번째 위치로 이동했습니다.`,
    );
  }

  return (
    <DragDropProvider sensors={folderTabSensors} onDragEnd={handleDragEnd}>
      <nav ref={tabsRef} className="folder-tabs" aria-label="할 일 폴더">
        <span className="visually-hidden" aria-live="polite">
          {reorderAnnouncement}
        </span>
        {folders.map((folder, folderIndex) => (
          <SortableFolderTab
            key={folder.id}
            folder={folder}
            index={folderIndex}
            isActive={activeFolder === folder.id}
            isEditing={editingFolder === folder.id}
            folderDraft={folderDraft}
            editInputRef={editInputRef}
            onFolderDraftChange={onFolderDraftChange}
            onSelectFolder={onSelectFolder}
            onStartEditingFolder={onStartEditingFolder}
            onCommitFolderName={onCommitFolderName}
            onCancelFolderEdit={onCancelFolderEdit}
          />
        ))}
        <button className="folder-add-tab" type="button" onClick={onAddFolder}>
          <Plus aria-hidden="true" size={18} />
          새 폴더
        </button>
      </nav>
      <DragOverlay className="folder-tab-drag-overlay">
        {(source) => {
          const folder = folders.find((item) => item.id === source.id);
          if (!folder) return null;

          return (
            <div className={`folder-tab ${activeFolder === folder.id ? "is-active" : ""}`}>
              <span>{folder.label}</span>
            </div>
          );
        }}
      </DragOverlay>
    </DragDropProvider>
  );
}
