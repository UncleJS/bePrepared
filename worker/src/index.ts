/**
 * worker/src/index.ts
 *
 * Scheduled job processor — delegates all job logic to api/src/lib/alertJobs.ts
 * which uses the API's shared DB client and schema.
 *
 * Runs every hour by default (configurable via WORKER_INTERVAL_MS).
 *
 * Healthcheck contract:
 *   After each successful tick the worker touches /tmp/worker.ready.
 *   The Containerfile HEALTHCHECK probes `test -f /tmp/worker.ready` so
 *   Podman can mark the container unhealthy (and restart it) if the worker
 *   never completes a run after the start-period elapses.
 */

import { runAllJobs } from "../../api/src/lib/alertJobs";
import { logger } from "../../api/src/lib/logger";

const INTERVAL_MS = Number(process.env.WORKER_INTERVAL_MS ?? 3600000); // 1 hour
const HEARTBEAT_FILE = "/tmp/worker.ready";

/**
 * Write the heartbeat file so the Podman HEALTHCHECK probe sees a healthy
 * state.  The file is written atomically (Bun.write is O_TRUNC + write) and
 * its mtime can also be inspected for staleness checks in the future.
 */
async function touchHeartbeat(): Promise<void> {
  await Bun.write(HEARTBEAT_FILE, new Date().toISOString());
}

async function tick(): Promise<void> {
  try {
    await runAllJobs();
    await touchHeartbeat();
    logger.info("[worker] Tick complete — heartbeat written", {
      heartbeat: HEARTBEAT_FILE,
    });
  } catch (err) {
    // Log the error but do NOT write the heartbeat — a persistent failure will
    // cause the HEALTHCHECK to miss the file after restart and Podman will
    // restart the container automatically.
    logger.error("[worker] Tick failed — heartbeat NOT written", {
      err: String(err),
    });
  }
}

// Run immediately on startup, then on interval
await tick();
setInterval(tick, INTERVAL_MS);
logger.info("[worker] Scheduled", { intervalSec: INTERVAL_MS / 1000 });
