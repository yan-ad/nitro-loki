import { Elysia } from "elysia";
import { LokiLogger } from "uloki";
import type { ElysiaLokiConfig, LokiStore } from "./types";

/**
 * Elysia plugin that ships request logs and manual logs to Grafana Loki.
 *
 * Usage:
 *   import { uloki } from "@uloki/elysia";
 *   const app = new Elysia()
 *     .use(uloki({ endpoint: "http://localhost:3100" }))
 *     .get("/", () => "ok")
 *     .listen(3000);
 */
export function uloki(userConfig: ElysiaLokiConfig = {}) {
  const config: Required<ElysiaLokiConfig> = {
    endpoint: userConfig.endpoint ?? "http://localhost:3100/loki/api/v1/push",
    labels: userConfig.labels ?? {},
    enabled: userConfig.enabled ?? true,
    batchSize: userConfig.batchSize ?? 10,
    flushInterval: userConfig.flushInterval ?? 5000,
    redact: userConfig.redact ?? [],
    requestLogging: userConfig.requestLogging ?? true,
  };

  const logger = new LokiLogger({
    endpoint: config.endpoint,
    labels: config.labels,
    enabled: config.enabled,
    batchSize: config.batchSize,
    flushInterval: config.flushInterval,
    redact: config.redact,
  });

  return new Elysia({ name: "uloki" })
    .state("loki", {
      log: (entry: { line: string; labels?: Record<string, string> }) =>
        logger.log({ ...entry, labels: { ...config.labels, ...entry.labels } }),
      flush: () => logger.flush(),
    } as LokiStore)

    // Request timing — capture start time
    .onRequest(({ store }) => {
      (store as any).__lokiStart = Date.now();
    })

    // Log after response
    .onAfterResponse(({ request, set, store }) => {
      if (!config.requestLogging) return;

      const start = (store as any).__lokiStart as number;
      const durationMs = Date.now() - start;
      const method = request.method;
      const path = new URL(request.url).pathname;
      const status = Number(set.status ?? 200);

      const line = [
        `method=${method}`,
        `path=${path}`,
        `status=${status}`,
        `duration_ms=${durationMs}`,
      ].join(" ");

      let level: string;
      if (status >= 500) level = "error";
      else if (status >= 400) level = "warn";
      else level = "info";

      logger.log({
        line,
        labels: { ...config.labels, method, status: String(status), level },
      });
    })

    // Flush on shutdown
    .onStop(async () => {
      await logger.dispose();
    });
}
