import React from "react";
import { Cloud, CloudOff, RefreshCw } from "lucide-react";
import "./SyncStatus.css";

export default function SyncStatus({ status, onRetry }) {
  if (!status) return null;

  const needsAction = status.type === "error" || status.type === "conflict";
  const StatusIcon = needsAction ? CloudOff : status.type === "saving" ? RefreshCw : Cloud;

  return (
    <div className={`sync-status is-${status.type}`} role="status" aria-live="polite">
      <StatusIcon
        aria-hidden="true"
        className={status.type === "saving" ? "is-spinning" : ""}
        size={16}
      />
      <span>{status.message}</span>
      {needsAction ? (
        <button type="button" onClick={onRetry}>
          {status.type === "conflict" ? "새로고침" : "다시 시도"}
        </button>
      ) : null}
    </div>
  );
}
