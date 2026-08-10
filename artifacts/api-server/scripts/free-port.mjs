#!/usr/bin/env node
// Kill any leftover api-server process holding $PORT before starting a new one.
// PATH-independent (no lsof/fuser): scans /proc for node processes running
// this artifact's dist/index.mjs, kills them, then waits for the port to free.
import { readdirSync, readFileSync } from "node:fs";
import net from "node:net";

const PORT = Number(process.env.PORT || 3000);
const MARKER = "api-server/dist/index.mjs";

function staleServerPids() {
  const pids = [];
  for (const entry of readdirSync("/proc")) {
    if (!/^\d+$/.test(entry)) continue;
    const pid = Number(entry);
    if (pid === process.pid) continue;
    try {
      const cmd = readFileSync(`/proc/${entry}/cmdline`, "utf8").replaceAll("\0", " ");
      if (cmd.includes(MARKER)) pids.push(pid);
    } catch {
      // process vanished or unreadable — ignore
    }
  }
  return pids;
}

function portFree() {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.once("error", () => resolve(false));
    srv.once("listening", () => srv.close(() => resolve(true)));
    srv.listen(PORT, "0.0.0.0");
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

for (let attempt = 0; attempt < 10; attempt++) {
  if (await portFree()) process.exit(0);
  const pids = staleServerPids();
  for (const pid of pids) {
    try {
      process.kill(pid, attempt === 0 ? "SIGTERM" : "SIGKILL");
      console.log(`[free-port] sent ${attempt === 0 ? "SIGTERM" : "SIGKILL"} to stale server pid ${pid}`);
    } catch {
      // already gone
    }
  }
  if (pids.length === 0) {
    console.log(`[free-port] port ${PORT} busy but no stale ${MARKER} process found; waiting...`);
  }
  await sleep(1000);
}

if (await portFree()) process.exit(0);
console.error(`[free-port] port ${PORT} still busy after retries`);
process.exit(1);
