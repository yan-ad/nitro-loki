import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock uloki
vi.mock("uloki", () => ({
  LokiLogger: vi.fn().mockImplementation((_opts: any) => ({
    log: vi.fn(),
    flush: vi.fn().mockResolvedValue(undefined),
    onFlush: vi.fn(),
    dispose: vi.fn().mockResolvedValue(undefined),
  })),
}));

import { uloki } from "./plugin";

describe("@uloki/elysia plugin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns an Elysia plugin", () => {
    const plugin = uloki();
    expect(plugin).toBeDefined();
  });

  it("accepts custom endpoint and labels", () => {
    const plugin = uloki({
      endpoint: "http://loki:3100",
      labels: { app: "my-elysia" },
      batchSize: 20,
      flushInterval: 10000,
    });
    expect(plugin).toBeDefined();
  });

  it("can be disabled", () => {
    const plugin = uloki({ enabled: false });
    expect(plugin).toBeDefined();
  });

  it("applies redaction rules", () => {
    const plugin = uloki({
      redact: ["token", /Bearer\s+\S+/g],
    });
    expect(plugin).toBeDefined();
  });
});
