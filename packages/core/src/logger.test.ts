import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { LokiLogger } from "./logger";

// Mock fetch
vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200 }));

describe("LokiLogger", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("buffers entries and flushes on demand", async () => {
    const logger = new LokiLogger({ endpoint: "http://loki:3100", flushInterval: 0 });

    logger.log({ line: "log 1" });
    logger.log({ line: "log 2" });

    const buffered = (logger as any).buffer;
    expect(buffered).toHaveLength(2);

    await logger.flush();
    expect((logger as any).buffer).toHaveLength(0);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("auto-flushes when batchSize is reached", async () => {
    const logger = new LokiLogger({
      endpoint: "http://loki:3100",
      batchSize: 3,
      flushInterval: 0,
    });

    logger.log({ line: "a" });
    logger.log({ line: "b" });
    // Should not have flushed yet
    expect((logger as any).buffer).toHaveLength(2);

    logger.log({ line: "c" });
    // Allow microtask flush
    await vi.runAllTimersAsync();

    expect((logger as any).buffer).toHaveLength(0);
    expect(fetch).toHaveBeenCalled();
  });

  it("does not log when enabled=false", () => {
    const logger = new LokiLogger({
      endpoint: "http://loki:3100",
      enabled: false,
      flushInterval: 0,
    });

    logger.log({ line: "should be ignored" });
    expect((logger as any).buffer).toHaveLength(0);
  });

  it("generates nanosecond timestamps automatically", () => {
    const logger = new LokiLogger({ endpoint: "http://loki:3100", flushInterval: 0 });
    const now = Date.now();

    logger.log({ line: "with ts" });
    const entry = (logger as any).buffer[0];

    expect(entry.ts).toBeDefined();
    const ns = parseInt(entry.ts, 10);
    // Should be roughly now in nanoseconds
    expect(ns).toBeGreaterThan(now * 1_000_000 - 1_000_000_000);
  });

  it("accepts explicit timestamp", () => {
    const logger = new LokiLogger({ endpoint: "http://loki:3100", flushInterval: 0 });

    logger.log({ line: "explicit", ts: "999999999999999999" });
    expect((logger as any).buffer[0].ts).toBe("999999999999999999");
  });

  it("applies redaction to log lines", () => {
    const logger = new LokiLogger({
      endpoint: "http://loki:3100",
      flushInterval: 0,
      redact: [/Bearer\s+\S+/g],
    });

    logger.log({ line: "Auth: Bearer secret123 used" });
    expect((logger as any).buffer[0].line).toBe("Auth: [REDACTED] used");
  });

  it("calls onFlush callback with entries", async () => {
    const onFlush = vi.fn();
    const logger = new LokiLogger({
      endpoint: "http://loki:3100",
      flushInterval: 0,
      onFlush,
    });

    logger.log({ line: "cb test" });
    await logger.flush();

    expect(onFlush).toHaveBeenCalledTimes(1);
    expect(onFlush).toHaveBeenCalledWith([expect.objectContaining({ line: "cb test" })]);
  });

  it("dispose clears interval and flushes remaining", async () => {
    const logger = new LokiLogger({
      endpoint: "http://loki:3100",
      flushInterval: 60_000,
    });

    logger.log({ line: "final" });
    expect(typeof (logger as any).flushTimer).toBe("number");

    await logger.dispose();

    expect((logger as any).flushTimer).toBeUndefined();
    expect((logger as any).buffer).toHaveLength(0);
    expect(fetch).toHaveBeenCalled();
  });
});
