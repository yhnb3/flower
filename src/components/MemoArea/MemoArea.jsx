import React, { useEffect, useLayoutEffect, useRef } from "react";
import { Plus, Trash2 } from "lucide-react";
import EmptyState from "../EmptyState/EmptyState.jsx";
import "./MemoArea.css";

function useAutosizeTextarea(ref, value) {
  useLayoutEffect(() => {
    const textarea = ref.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    const maxHeight = Number.parseFloat(getComputedStyle(textarea).maxHeight);
    const nextHeight = Number.isFinite(maxHeight)
      ? Math.min(textarea.scrollHeight, maxHeight)
      : textarea.scrollHeight;
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY = textarea.scrollHeight > nextHeight ? "auto" : "hidden";
  }, [ref, value]);
}

export default function MemoArea({
  memos,
  draft,
  onDraftChange,
  onAdd,
  editingMemo,
  editDraft,
  onEditDraftChange,
  onStartEditing,
  onCommitEdit,
  onCancelEdit,
  onRemove,
}) {
  const draftInputRef = useRef(null);
  const editInputRef = useRef(null);

  useAutosizeTextarea(draftInputRef, draft);
  useAutosizeTextarea(editInputRef, editDraft);

  useEffect(() => {
    if (editingMemo !== null) editInputRef.current?.focus();
  }, [editingMemo]);

  return (
    <section className="memo-area" aria-label="메모">
      <form className="memo-add-row" onSubmit={onAdd}>
        <textarea
          ref={draftInputRef}
          id="memo-input"
          aria-label="새 메모"
          autoComplete="off"
          maxLength={5000}
          value={draft}
          onChange={(event) => onDraftChange(event.target.value)}
          onKeyDown={(event) => {
            if (
              event.key === "Enter" &&
              !event.shiftKey &&
              !event.nativeEvent.isComposing
            ) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
          placeholder="메모를 적어주세요"
          rows={1}
        />
        <button type="submit">
          <Plus aria-hidden="true" size={18} />
          추가
        </button>
      </form>

      {memos.length === 0 ? (
        <EmptyState
          title="메모가 없어요."
          description="위 입력칸에 남겨둘 내용을 적어보세요."
          variant="memo"
        />
      ) : (
        <ul className="memo-list" aria-label="메모 목록">
          {memos.map((memo) => (
            <li className="memo-item" key={memo.id}>
              {editingMemo === memo.id ? (
                <textarea
                  ref={editInputRef}
                  className="memo-edit-input"
                  aria-label="메모 수정"
                  autoComplete="off"
                  maxLength={5000}
                  value={editDraft}
                  onChange={(event) => onEditDraftChange(event.target.value)}
                  onBlur={onCommitEdit}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      event.preventDefault();
                      onCancelEdit();
                    }
                    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                      event.preventDefault();
                      onCommitEdit();
                    }
                  }}
                  rows={2}
                />
              ) : (
                <button
                  className="memo-content"
                  type="button"
                  onClick={() => onStartEditing(memo)}
                  aria-label={`${memo.content} 메모 수정`}
                  title="클릭해서 메모 수정"
                >
                  {memo.content}
                </button>
              )}
              <button
                className="delete-button"
                type="button"
                aria-label={`${memo.content} 삭제`}
                onClick={() => onRemove(memo.id)}
              >
                <Trash2 aria-hidden="true" size={18} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
