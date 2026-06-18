import { describe, it, expect } from "vitest";
import { resolveConfig } from "./config";

describe("resolveConfig", () => {
  it("returns defaults when no user config provided", () => {
    const cfg = resolveConfig();
    expect(cfg.endpoint).toBe("http://localhost:3100/loki/api/v1/push");
    expect(cfg.enabled).toBe(true);
    expect(cfg.batchSize).toBe(10);
    expect(cfg.flushInterval).toBe(5000);
    expect(cfg.labels).toEqual({});
    expect(cfg.redact).toEqual([]);
  });

  it("overrides scalar values from user config", () => {
    const cfg = resolveConfig({
      endpoint: "https://loki.prod.example.com",
      batchSize: 50,
      enabled: false,
    });
    expect(cfg.endpoint).toBe("https://loki.prod.example.com");
    expect(cfg.batchSize).toBe(50);
    expect(cfg.enabled).toBe(false);
    // Untouched defaults remain
    expect(cfg.flushInterval).toBe(5000);
  });

  it("merges labels (user labels override defaults)", () => {
    const cfg = resolveConfig({
      labels: { app: "my-app", env: "staging" },
    });
    expect(cfg.labels).toEqual({ app: "my-app", env: "staging" });
  });

  it("combines redact rules from defaults and user", () => {
    const cfg = resolveConfig({
      redact: [/Bearer\s+\S+/g],
    });
    expect(cfg.redact).toEqual([/Bearer\s+\S+/g]);
  });

  it("returns a fully resolved type with no optional fields", () => {
    const cfg = resolveConfig({});
    // Every field should be defined (not undefined)
    expect(cfg.endpoint).toBeDefined();
    expect(cfg.labels).toBeDefined();
    expect(cfg.enabled).toBeDefined();
    expect(cfg.batchSize).toBeDefined();
    expect(cfg.flushInterval).toBeDefined();
    expect(cfg.redact).toBeDefined();
  });
});
