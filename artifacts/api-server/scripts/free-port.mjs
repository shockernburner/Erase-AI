#!/usr/bin/env node
// Kill any leftover api-server process holding $PORT before starting a new one.
// PATH-independent (no lsof/fuser): scans /proc for node processes running
// this artifact's dist/index.mjs, kills them, then waits for the port to free.
import { readdirSync, readFileSync, readlinkSync } from "node:fs";
import net from "node:net";

const PORT = Number(process.env.PORT || 3000);
const MARKER = "api-server/dist/index.mjs";

// Find the socket inodes of listeners on $PORT (tcp + tcp6).
function listeningInodes() {
  const inodes = new Set();
  const hexPort = PORT.toString(16).toUpperCase().padStart(4, "0");
  for (const table of ["/proc/net/tcp", "/proc/net/tcp6"]) {
    let text;
    try {
      text = readFileSync(table, "utf8");
    } catch {
      continue;
    }
    for (const line of text.split("\n").slice(1)) {
      const cols = line.trim().split(/\s+/);
      // cols[1]=local addr:port, cols[3]=state (0A = LISTEN), cols[9]=inode
      if (cols.length > 9 && cols[3] === "0A" && cols[1].endsWith(`:${hexPort}`)) {
        inodes.add(cols[9]);
      }
    }
  }
  return inodes;
}

function staleServerPids() {
  const pids = [];
  const inodes = listeningInodes();
  for (const entry of readdirSync("/proc")) {
    if (!/^\d+$/.test(entry)) continue;
    const pid = Number(entry);
    if (pid === process.pid) continue;
    try {
      const cmd = readFileSync(`/proc/${entry}/cmdline`, "utf8").replaceAll("\0", " ");
      let match = cmd.includes(MARKER);
      // The dev server is often launched with a relative path
      // (`node ./dist/index.mjs`), so also match any process that actually
      // holds the listening socket for $PORT via its fd inodes.
      if (!match && inodes.size > 0) {
        try {
          for (const fd of readdirSync(`/proc/${entry}/fd`)) {
            const target = readlinkSync(`/proc/${entry}/fd/${fd}`);
            const m = target.match(/^socket:\[(\d+)\]$/);
            if (m && inodes.has(m[1])) {
              match = true;
              break;
            }
          }
        } catch {
          // fd dir unreadable — ignore
        }
      }
      if (match) pids.push(pid);
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
