import React from "react";
import { UploadCloud } from "lucide-react";
import "./MigrationControl.css";

export default function MigrationControl({ status, onMigrate }) {
  const isAvailable = status === "available";

  return (
    <button
      className="legacy-update-button"
      type="button"
      disabled={!isAvailable}
      onClick={onMigrate}
      title={
        isAvailable
          ? "기존 브라우저 데이터를 Turso에 저장합니다"
          : "DB가 비어 있고 기존 브라우저 데이터가 있을 때 사용할 수 있습니다"
      }
    >
      <UploadCloud aria-hidden="true" size={16} />
      {status === "saving" ? "업데이트 중" : "DB 업데이트"}
    </button>
  );
}
