import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ClerkProvider,
  SignInButton,
  SignUpButton,
  UserButton,
  useAuth,
} from "@clerk/react";
import { AlertCircle, Cloud, LogIn, UploadCloud, UserPlus } from "lucide-react";
import App, { initialPlannerState } from "./App.jsx";
import { createPlannerApi, isPlannerVersionConflict } from "./planner-api.js";
import {
  getPlannerStorageKey,
  legacyPlannerStorageKey,
  migrateLegacyPlanner as persistLegacyPlanner,
  readStoredPlanner,
  resolvePlannerBootstrap,
  writeStoredPlanner,
} from "./planner-storage.js";

const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const useLocalPlanner = import.meta.env.VITE_USE_LOCAL_PLANNER === "true";

function PageState({ icon: Icon, title, description, action, isLoading = false }) {
  return (
    <main className="app-shell auth-shell">
      <section className="auth-card" aria-busy={isLoading || undefined}>
        <Icon aria-hidden="true" size={32} />
        <h1>{title}</h1>
        <p>{description}</p>
        {action}
      </section>
    </main>
  );
}

function LoadingState() {
  const [showSkeleton, setShowSkeleton] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setShowSkeleton(true), 300);
    return () => window.clearTimeout(timer);
  }, []);

  if (!showSkeleton) {
    return <main className="app-shell auth-shell" aria-busy="true" aria-label="플래너 불러오는 중" />;
  }

  return (
    <main className="app-shell auth-shell" aria-busy="true" aria-label="플래너 불러오는 중">
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

function SignedOutState() {
  return (
    <PageState
      icon={Cloud}
      title="花 Planner"
      description="계정을 만들거나 로그인하면 할 일과 메모가 기기 간에 안전하게 동기화됩니다."
      action={
        <div className="auth-actions">
          <SignUpButton mode="modal">
            <button className="auth-button auth-primary-button" type="button">
              <UserPlus aria-hidden="true" size={18} />
              계정 만들기
            </button>
          </SignUpButton>
          <SignInButton mode="modal">
            <button className="auth-button auth-secondary-button" type="button">
              <LogIn aria-hidden="true" size={18} />
              로그인
            </button>
          </SignInButton>
        </div>
      }
    />
  );
}

function AuthenticatedPlanner({ userId, getToken }) {
  const api = useMemo(() => createPlannerApi({ getToken }), [getToken]);
  const storageKey = useMemo(() => getPlannerStorageKey(userId), [userId]);
  const [loadState, setLoadState] = useState({ type: "loading", planner: null, key: 0 });
  const [syncStatus, setSyncStatus] = useState(null);
  const revisionRef = useRef(0);
  const latestPlannerRef = useRef(null);
  const saveTimerRef = useRef(null);
  const saveQueueRef = useRef(Promise.resolve());
  const conflictRef = useRef(false);
  const migrationStatusRef = useRef("unavailable");
  const [migrationStatus, setMigrationStatus] = useState("unavailable");

  const updateMigrationStatus = useCallback((status) => {
    migrationStatusRef.current = status;
    setMigrationStatus(status);
  }, []);

  const enqueueSave = useCallback(
    (planner) => {
      saveQueueRef.current = saveQueueRef.current.then(async () => {
        if (conflictRef.current || migrationStatusRef.current !== "unavailable") return;
        setSyncStatus({ type: "saving", message: "저장 중" });

        try {
          const saved = await api.save(planner, revisionRef.current);
          revisionRef.current = saved.revision;
          if (latestPlannerRef.current === planner) {
            setSyncStatus({ type: "saved", message: "동기화됨" });
          }
        } catch (caughtError) {
          if (isPlannerVersionConflict(caughtError)) {
            conflictRef.current = true;
            setSyncStatus({ type: "conflict", message: "다른 기기의 변경 있음" });
            return;
          }
          setSyncStatus({ type: "error", message: "로컬에 저장됨" });
        }
      });
    },
    [api],
  );

  const loadPlanner = useCallback(async () => {
    window.clearTimeout(saveTimerRef.current);
    conflictRef.current = false;
    updateMigrationStatus("unavailable");
    saveQueueRef.current = Promise.resolve();
    setLoadState((current) => ({ ...current, type: "loading" }));

    const userCachedPlanner = readStoredPlanner(storageKey);
    const legacyPlanner = readStoredPlanner(legacyPlannerStorageKey);
    const cachedPlanner = userCachedPlanner ?? legacyPlanner;

    try {
      const remote = await api.load();
      const bootstrap = resolvePlannerBootstrap({
        remotePlanner: remote.data,
        userCachedPlanner,
        legacyPlanner,
        initialPlanner: initialPlannerState,
      });
      const planner = bootstrap.planner;
      let revision = remote.revision;

      if (bootstrap.shouldCreateRemote) {
        const saved = await api.save(planner, 0);
        revision = saved.revision;
      }

      revisionRef.current = revision;
      latestPlannerRef.current = planner;
      writeStoredPlanner(storageKey, planner);
      updateMigrationStatus(bootstrap.canMigrateLegacy ? "available" : "unavailable");
      setSyncStatus(
        bootstrap.canMigrateLegacy
          ? { type: "migration", message: "기존 데이터 업데이트 필요" }
          : { type: "saved", message: "동기화됨" },
      );
      setLoadState((current) => ({ type: "ready", planner, key: current.key + 1 }));
    } catch (caughtError) {
      const planner = cachedPlanner ?? initialPlannerState;
      const hasConflict = isPlannerVersionConflict(caughtError);
      conflictRef.current = hasConflict;
      revisionRef.current = 0;
      latestPlannerRef.current = planner;
      writeStoredPlanner(storageKey, planner);
      setSyncStatus({
        type: hasConflict ? "conflict" : "error",
        message: hasConflict ? "다른 기기의 변경 있음" : "로컬에 저장됨",
      });
      setLoadState((current) => ({ type: "ready", planner, key: current.key + 1 }));
    }
  }, [api, storageKey, updateMigrationStatus]);

  useEffect(() => {
    loadPlanner();
    return () => window.clearTimeout(saveTimerRef.current);
  }, [loadPlanner]);

  const handlePlannerChange = useCallback(
    (planner) => {
      latestPlannerRef.current = planner;
      writeStoredPlanner(storageKey, planner);
      if (conflictRef.current || migrationStatusRef.current !== "unavailable") return;

      setSyncStatus({ type: "saving", message: "저장 중" });
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = window.setTimeout(() => enqueueSave(planner), 700);
    },
    [enqueueSave, storageKey],
  );

  const migrateLegacyPlanner = useCallback(async () => {
    const planner = latestPlannerRef.current;
    if (migrationStatusRef.current !== "available" || !planner) return;

    updateMigrationStatus("saving");
    setSyncStatus({ type: "saving", message: "기존 데이터 업데이트 중" });

    try {
      const saved = await persistLegacyPlanner({ planner, save: api.save });
      const latestPlanner = latestPlannerRef.current;
      revisionRef.current = saved.revision;
      writeStoredPlanner(storageKey, latestPlanner);
      updateMigrationStatus("unavailable");
      setSyncStatus({ type: "saved", message: "동기화됨" });
      if (latestPlanner !== planner) enqueueSave(latestPlanner);
    } catch (caughtError) {
      if (isPlannerVersionConflict(caughtError)) {
        conflictRef.current = true;
        updateMigrationStatus("unavailable");
        setSyncStatus({ type: "conflict", message: "다른 기기의 변경 있음" });
        return;
      }

      updateMigrationStatus("available");
      setSyncStatus({ type: "error", message: "업데이트 실패 · 로컬 데이터 유지됨" });
    }
  }, [api, enqueueSave, storageKey, updateMigrationStatus]);

  const retrySync = useCallback(() => {
    if (conflictRef.current) {
      window.location.reload();
      return;
    }
    if (migrationStatusRef.current === "available") {
      migrateLegacyPlanner();
      return;
    }
    if (latestPlannerRef.current) enqueueSave(latestPlannerRef.current);
  }, [enqueueSave, migrateLegacyPlanner]);

  if (loadState.type === "loading") return <LoadingState />;

  return (
    <App
      key={`${userId}-${loadState.key}`}
      initialPlanner={loadState.planner}
      storageKey={storageKey}
      onPlannerChange={handlePlannerChange}
      syncStatus={syncStatus}
      onRetrySync={retrySync}
      migrationControl={
        <button
          className="legacy-update-button"
          type="button"
          disabled={migrationStatus !== "available"}
          onClick={migrateLegacyPlanner}
          title={
            migrationStatus === "available"
              ? "기존 브라우저 데이터를 Turso에 저장합니다"
              : "DB가 비어 있고 기존 브라우저 데이터가 있을 때 사용할 수 있습니다"
          }
        >
          <UploadCloud aria-hidden="true" size={16} />
          {migrationStatus === "saving" ? "업데이트 중" : "DB 업데이트"}
        </button>
      }
      accountControl={<UserButton />}
    />
  );
}

function AuthenticatedRoot() {
  const { getToken, isLoaded, isSignedIn, userId } = useAuth();

  if (!isLoaded) return <LoadingState />;
  if (!isSignedIn) return <SignedOutState />;
  return <AuthenticatedPlanner userId={userId} getToken={getToken} />;
}

function ConfigurationState() {
  return (
    <PageState
      icon={AlertCircle}
      title="로컬 설정이 필요해요"
      description=".env.local에 Clerk와 Turso 환경변수를 추가한 뒤 npm run dev:vercel을 실행해 주세요."
    />
  );
}

const root = createRoot(document.getElementById("root"));

if (useLocalPlanner) {
  root.render(<App />);
} else if (!clerkPublishableKey) {
  root.render(<ConfigurationState />);
} else {
  root.render(
    <ClerkProvider publishableKey={clerkPublishableKey}>
      <AuthenticatedRoot />
    </ClerkProvider>,
  );
}
