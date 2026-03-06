/**
 * api/src/lib/logger.ts
 *
 * Thin structured JSON logger. Writes one JSON line per call to stdout (info)
 * or stderr (warn/error) so log aggregators can parse fields directly.
 *
 * Usage:
 *   import { logger } from "./logger";
 *   logger.info("server started", { port: 3001 });
 *   logger.warn("slow query", { ms: 420 });
 *   logger.error("unhandled error", { err });
 */

type LogLevel = "info" | "warn" | "error";

function write(level: LogLevel, msg: string, meta?: Record<string, unknown>): void {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    msg,
    ...(meta ?? {}),
  });
  if (level === "error" || level === "warn") {
    process.stderr.write(line + "\n");
  } else {
    process.stdout.write(line + "\n");
  }
}

export const logger = {
  info: (msg: string, meta?: Record<string, unknown>) => write("info", msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => write("warn", msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => write("error", msg, meta),
};
