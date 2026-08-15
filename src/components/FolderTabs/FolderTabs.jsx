import React, { useEffect, useRef, useState } from "react";
import { DragDropProvider, DragOverlay } from "@dnd-kit/react";
import { isSortable } from "@dnd-kit/react/sortable";
import { ArrowUpDown, Plus } from "lucide-react";
import MobileFolderReorder from "../MobileFolderReorder/MobileFolderReorder.jsx";
import SortableFolderTab from "./SortableFolderTab.jsx";
import { folderTabSensors } from "./folderTabSensors.js";
import "./FolderTabs.css";

const mobileReorderMediaQuery = "(pointer: coarse) and (hover: none)";

function useMobileReorderLayout() {
  const [isMobileReorderLayout, setIsMobileReorderLayout] = useState(
    () => window.matchMedia(mobileReorderMediaQuery).matches,
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia(mobileReorderMediaQuery);
    const handleChange = (event) => setIsMobileReorderLayout(event.matches);
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return isMobileReorderLayout;
}

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
  const isMobileReorderLayout = useMobileReorderLayout();
  const [isMobileReorderOpen, setIsMobileReorderOpen] = useState(false);
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
    if (!isMobileReorderLayout) setIsMobileReorderOpen(false);
  }, [isMobileReorderLayout]);

  useEffect(() => {
    if (!folderToRefocus) return;

    tabsRef.current
      ?.querySelector(`[data-folder-id="${CSS.escape(folderToRefocus)}"]`)
      ?.focus({ preventScroll: true });
    setFolderToRefocus(null);
  }, [folderToRefocus, folders]);

  function handleDragEnd(event, { refocusTab = true } = {}) {
    if (event.canceled) return;

    const { source } = event.operation;
    if (!isSortable(source) || source.initialIndex === source.index) return;

    const nextFolders = [...folders];
    const [movedFolder] = nextFolders.splice(source.initialIndex, 1);
    if (!movedFolder) return;

    nextFolders.splice(source.index, 0, movedFolder);
    onReorderFolders(nextFolders.map((folder) => folder.id));
    if (refocusTab && event.nativeEvent instanceof KeyboardEvent) {
      setFolderToRefocus(movedFolder.id);
    }
    setReorderAnnouncement(
      `${movedFolder.label} 폴더를 ${source.index + 1}번째 위치로 이동했습니다.`,
    );
  }

  return (
    <>
      {isMobileReorderLayout && folders.length > 1 ? (
        <div className="folder-tabs-mobile-tools">
          <button
            type="button"
            aria-label="폴더 순서 변경"
            aria-haspopup="dialog"
            onClick={() => setIsMobileReorderOpen(true)}
          >
            <ArrowUpDown aria-hidden="true" size={17} />
            순서 변경
          </button>
        </div>
      ) : null}

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
              dragDisabled={isMobileReorderLayout}
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

      <MobileFolderReorder
        folders={folders}
        isOpen={isMobileReorderOpen}
        announcement={reorderAnnouncement}
        onClose={() => setIsMobileReorderOpen(false)}
        onDragEnd={(event) => handleDragEnd(event, { refocusTab: false })}
      />
    </>
  );
}
