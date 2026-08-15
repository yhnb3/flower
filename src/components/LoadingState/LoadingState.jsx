import React, { useEffect, useState } from "react";
import "./LoadingState.css";

export default function LoadingState() {
  const [showSkeleton, setShowSkeleton] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setShowSkeleton(true), 300);
    return () => window.clearTimeout(timer);
  }, []);

  if (!showSkeleton) {
    return (
      <main
        className="app-shell loading-state-shell"
        aria-busy="true"
        aria-label="플래너 불러오는 중"
      />
    );
  }

  return (
    <main
      className="app-shell loading-state-shell"
      aria-busy="true"
      aria-label="플래너 불러오는 중"
    >
      <section className="planner-skeleton">
        <div className="skeleton-line is-title" />
        <div className="skeleton-tabs">
          <div />
          <div />
        </div>
        <div className="skeleton-sheet">
          <div />
          <div />
        </div>
      </section>
    </main>
  );
}
