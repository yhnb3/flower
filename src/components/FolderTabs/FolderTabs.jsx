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

  const dominantDelta =
    Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
  const deltaScale =
    event.deltaMode === WheelEvent.DOM_DELTA_LINE
      ? 16
      : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
        ? tabs.clientWidth
        : 1;
  const wheelDelta = dominantDelta * deltaScale;
  const nextScrollLeft = Math.min(maxScrollLeft, Math.max(0, tabs.scrollLeft + wheelDelta));
  if (nextScrollLeft === tabs.scrollLeft) return;

  event.preventDefault();
  tabs.scrollLeft = nextScrollLeft;
}

export default function FolderTabs({
  folders,
  activeFolder,
  isOverviewActive,
  openTaskCount,
  editingFolder,
  folderDraft,
  selectFolderDraftOnFocus,
  onFolderDraftChange,
  onOpenOverview,
  onSelectFolder,
  onStartEditingFolder,
  onCommitFolderName,
  onCancelFolderEdit,
  onAddFolder,
  onReorderFolders,
}) {
  const tabsRef = useRef(null);
  const editInputRef = useRef(null);
  const mobileReorderTriggerRef = useRef(null);
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
      <div
        className={`folder-tabs-mobile-tools ${
          isMobileReorderLayout ? "is-coarse-pointer" : ""
        }`}
      >
        <button
          className={`folder-overview-mobile ${isOverviewActive ? "is-active" : ""}`}
          type="button"
          onClick={onOpenOverview}
          aria-current={isOverviewActive ? "page" : undefined}
          aria-label={`미완료 ${openTaskCount}개 모아보기`}
        >
          미완료
          <strong>{openTaskCount}</strong>
        </button>
        {isMobileReorderLayout && folders.length > 1 ? (
          <button
            ref={mobileReorderTriggerRef}
            type="button"
            aria-label="폴더 순서 변경"
            aria-haspopup="dialog"
            onClick={() => setIsMobileReorderOpen(true)}
          >
            <ArrowUpDown aria-hidden="true" size={17} />
            순서 변경
          </button>
        ) : null}
      </div>

      <DragDropProvider sensors={folderTabSensors} onDragEnd={handleDragEnd}>
        <nav className="folder-tabs" aria-label="할 일 보기 및 폴더">
          <button
            className={`folder-tab-wrap folder-tab folder-overview-tab ${
              isOverviewActive ? "is-active" : ""
            }`}
            type="button"
            onClick={onOpenOverview}
            aria-current={isOverviewActive ? "page" : undefined}
            aria-label={`미완료 ${openTaskCount}개 모아보기`}
          >
            <span>미완료</span>
            <strong>{openTaskCount}</strong>
          </button>
          <div ref={tabsRef} className="folder-tabs-scroll">
            <span className="visually-hidden" aria-live="polite">
              {reorderAnnouncement}
            </span>
            {folders.map((folder, folderIndex) => (
              <SortableFolderTab
                key={folder.id}
                folder={folder}
                index={folderIndex}
                dragDisabled={isMobileReorderLayout}
                isActive={!isOverviewActive && activeFolder === folder.id}
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
          </div>
        </nav>
        <DragOverlay className="folder-tab-drag-overlay">
          {(source) => {
            const folder = folders.find((item) => item.id === source.id);
            if (!folder) return null;

            return (
              <div
                className={`folder-tab ${
                  !isOverviewActive && activeFolder === folder.id ? "is-active" : ""
                }`}
              >
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
        returnFocusRef={mobileReorderTriggerRef}
        onClose={() => setIsMobileReorderOpen(false)}
        onDragEnd={(event) => handleDragEnd(event, { refocusTab: false })}
      />
    </>
  );
}
