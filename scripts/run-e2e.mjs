import { spawn } from "node:child_process";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const testsDirectory = path.join(projectRoot, "tests");
const vitePath = path.join(projectRoot, "node_modules", "vite", "bin", "vite.js");
const host = "127.0.0.1";
const port = process.env.E2E_PORT ?? "4173";
const appUrl = `http://${host}:${port}/`;

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function runNodeScript(scriptPath) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath], {
      cwd: projectRoot,
      env: { ...process.env, APP_URL: appUrl },
      stdio: "inherit",
    });

    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${path.basename(scriptPath)} failed (${signal ?? `exit ${code}`})`));
    });
  });
}

const server = spawn(
  process.execPath,
  [vitePath, "--host", host, "--port", port, "--strictPort"],
  {
    cwd: projectRoot,
    env: { ...process.env, VITE_USE_LOCAL_PLANNER: "true" },
    stdio: "inherit",
  },
);

let serverResult;
const serverExited = new Promise((resolve) => {
  server.once("exit", (code, signal) => {
    serverResult = { code, signal };
    resolve(serverResult);
  });
});

async function waitForServer() {
  for (let attempt = 0; attempt < 150; attempt += 1) {
    if (serverResult) {
      throw new Error(
        `Vite exited before E2E tests started (${serverResult.signal ?? `exit ${serverResult.code}`})`,
      );
    }

    try {
      const response = await fetch(appUrl);
      if (response.ok) return;
    } catch {
      // The server can refuse connections briefly while Vite starts.
    }
    await delay(100);
  }
  throw new Error(`Timed out waiting for ${appUrl}`);
}

try {
  await waitForServer();
  const requestedSpecs = process.argv.slice(2);
  const specs = requestedSpecs.length
    ? requestedSpecs.map((spec) => path.resolve(projectRoot, spec))
    : (await readdir(testsDirectory))
        .filter((fileName) => fileName.endsWith(".spec.mjs"))
        .sort()
        .map((fileName) => path.join(testsDirectory, fileName));

  if (specs.length === 0) throw new Error("No E2E specs found");

  for (const spec of specs) {
    console.log(`\n[e2e] ${path.relative(projectRoot, spec)}`);
    await runNodeScript(spec);
  }
} finally {
  if (!serverResult) {
    server.kill("SIGTERM");
    await Promise.race([serverExited, delay(2_000)]);
  }
  if (!serverResult) server.kill("SIGKILL");
}
