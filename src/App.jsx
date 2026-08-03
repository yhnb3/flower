import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Archive, Plus, Trash2 } from "lucide-react";
import "./styles.css";

const initialFolders = [
  { id: "today", label: "오늘" },
  { id: "work", label: "업무" },
  { id: "home", label: "생활" },
  { id: "later", label: "나중" },
];

const initialNotes = [
  {
    id: 1,
    folder: "today",
    content: "오전 회의 전에 확인할 자료 3개",
  },
  {
    id: 2,
    folder: "today",
    content: "저녁 장보기 전에 냉장고 사진 확인",
  },
  {
    id: 3,
    folder: "work",
    content: "분기 목표 초안에서 빠진 일정 정리",
  },
  {
    id: 4,
    folder: "work",
    content: "디자인 피드백은 핵심만 5줄로 남기기",
  },
  {
    id: 5,
    folder: "home",
    content: "세탁 맡긴 옷 찾기",
  },
  {
    id: 6,
    folder: "later",
    content: "읽고 싶은 책 후보 정리",
  },
];

function App() {
  const [folders, setFolders] = useState(initialFolders);
  const [activeFolder, setActiveFolder] = useState("today");
  const [notes, setNotes] = useState(initialNotes);
  const [draft, setDraft] = useState("");
  const [editingFolder, setEditingFolder] = useState(null);
  const [folderDraft, setFolderDraft] = useState("");
  const [editingNote, setEditingNote] = useState(null);
  const [noteDraft, setNoteDraft] = useState("");
  const folderEditInputRef = useRef(null);
  const noteEditInputRef = useRef(null);

  const visibleNotes = notes.filter((note) => note.folder === activeFolder);
  const activeMeta = folders.find((folder) => folder.id === activeFolder);

  useEffect(() => {
    if (editingFolder) {
      folderEditInputRef.current?.focus();
    }
  }, [editingFolder]);

  useEffect(() => {
    if (editingNote) {
      noteEditInputRef.current?.focus();
    }
  }, [editingNote]);

  function addNote() {
    const content = draft.trim();
    if (!content) return;
    setNotes((current) => [
      {
        id: Date.now(),
        folder: activeFolder,
        content,
      },
      ...current,
    ]);
    setDraft("");
  }

  function removeNote(id) {
    setNotes((current) => current.filter((note) => note.id !== id));
    if (editingNote === id) {
      cancelNoteEdit();
    }
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
    const folderToDelete = activeMeta;
    if (!window.confirm(`${folderToDelete.label} 폴더와 안의 메모를 삭제할까요?`)) return;

    const currentIndex = folders.findIndex((folder) => folder.id === activeFolder);
    const nextFolders = folders.filter((folder) => folder.id !== activeFolder);
    const nextActiveFolder =
      nextFolders[Math.max(0, Math.min(currentIndex, nextFolders.length - 1))]?.id;

    setFolders(nextFolders);
    setNotes((current) => current.filter((note) => note.folder !== activeFolder));
    setActiveFolder(nextActiveFolder);
    if (editingFolder === activeFolder) {
      cancelFolderEdit();
    }
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

  function startEditingNote(note) {
    setEditingNote(note.id);
    setNoteDraft(note.content);
  }

  function commitNoteEdit() {
    if (!editingNote) return;
    const content = noteDraft.trim();
    if (content) {
      setNotes((current) =>
        current.map((note) => (note.id === editingNote ? { ...note, content } : note)),
      );
    }
    setEditingNote(null);
    setNoteDraft("");
  }

  function cancelNoteEdit() {
    setEditingNote(null);
    setNoteDraft("");
  }

  return (
    <main className="app-shell" data-styleseed-recipe="calm-consumer">
      <section className="workspace" aria-labelledby="page-title">
        <header className="topbar">
          <div>
            <h1 id="page-title">花 Planner</h1>
          </div>
        </header>

        <div className="folder-board">
          <nav className="folder-tabs" aria-label="할 일 폴더">
            {folders.map((folder) => {
              return (
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
                    <>
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
                    </>
                  )}
                </div>
              );
            })}
            <button className="folder-add-tab" type="button" onClick={addFolder}>
              <Plus aria-hidden="true" size={18} />
              새 폴더
            </button>
          </nav>

          <div className="folder-sheet">
            <section className="memo-area" aria-labelledby="memo-heading">
              <div className="memo-toolbar">
                <h2 id="memo-heading">메모</h2>
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

              <form
                className="add-row"
                onSubmit={(event) => {
                  event.preventDefault();
                  addNote();
                }}
              >
                <textarea
                  id="memo-input"
                  aria-label="새 메모"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                  placeholder="메모를 적어주세요"
                  rows={2}
                />
                <button type="submit">
                  <Plus aria-hidden="true" size={18} />
                  추가
                </button>
              </form>

              {visibleNotes.length === 0 ? (
                <div className="empty-state" role="status">
                  <Archive aria-hidden="true" size={28} />
                  <h3>메모가 없어요.</h3>
                  <p>위 입력칸에 남겨둘 내용을 적어보세요.</p>
                </div>
              ) : (
                <ul className="memo-list" aria-label="메모 목록">
                  {visibleNotes.map((note) => (
                    <li className="memo-item" key={note.id}>
                      {editingNote === note.id ? (
                        <textarea
                          ref={noteEditInputRef}
                          className="memo-edit-input"
                          aria-label="메모 수정"
                          value={noteDraft}
                          onChange={(event) => setNoteDraft(event.target.value)}
                          onBlur={commitNoteEdit}
                          onKeyDown={(event) => {
                            if (event.key === "Escape") {
                              event.preventDefault();
                              cancelNoteEdit();
                            }
                            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                              event.preventDefault();
                              commitNoteEdit();
                            }
                          }}
                          rows={2}
                        />
                      ) : (
                        <button
                          className="memo-content"
                          type="button"
                          onClick={() => startEditingNote(note)}
                          aria-label={`${note.content} 메모 수정`}
                          title="클릭해서 메모 수정"
                        >
                          {note.content}
                        </button>
                      )}
                      <button
                        className="delete-button"
                        type="button"
                        aria-label={`${note.content} 삭제`}
                        onClick={() => removeNote(note.id)}
                      >
                        <Trash2 aria-hidden="true" size={18} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
