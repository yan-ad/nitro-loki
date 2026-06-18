// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { LokiLogger, type LokiLogEntry } from "nitro-loki";
import { resolveConfig } from "./config";
import type { NitroLokiConfig } from "./types";

/**
 * Nitro runtime: hooks into the Nitro app lifecycle.
 * Called once at server start to register hooks and wire LokiTransport.
 */
export function useLokiRuntime(nitroApp: any, config: NitroLokiConfig) {
  const resolved = resolveConfig(config);
  const logger = new LokiLogger({
    endpoint: resolved.endpoint,
    labels: resolved.labels,
    enabled: resolved.enabled,
    batchSize: resolved.batchSize,
    flushInterval: resolved.flushInterval,
    redact: resolved.redact,
  });

  // Hook into request lifecycle
  nitroApp.hooks.hook("request", (event: any) => {
    // Tag every request context with logger
    event.context.loki = {
      log: (entry: Partial<LokiLogEntry> & { line?: string }) =>
        logger.log({ ...entry, labels: { ...resolved.labels, ...entry.labels }, line: entry.line ?? "" }),
      flush: () => logger.flush(),
    };
  });

  // Hook into close to flush remaining
  nitroApp.hooks.hook("close", async () => {
    await logger.flush();
  });

  // Hook into dev event for introspection in playground
  if (process.env.NODE_ENV === "development") {
    logger.onFlush((entries) => {
      for (const entry of entries) {
        nitroApp.hooks.callHook("loki:log" as any, entry);
      }
    });
  }

  return logger;
}
