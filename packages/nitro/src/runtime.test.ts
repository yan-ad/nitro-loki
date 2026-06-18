import { describe, it, expect, vi, beforeEach } from "vitest";
import { useLokiRuntime } from "./runtime";
import type { NitroLokiConfig } from "./types";

// Mock nitro-loki
vi.mock("nitro-loki", () => {
  const actual = vi.importActual("nitro-loki");
  return {
    LokiLogger: vi.fn().mockImplementation((opts: any) => ({
      log: vi.fn(),
      flush: vi.fn().mockResolvedValue(undefined),
      onFlush: vi.fn(),
      dispose: vi.fn().mockResolvedValue(undefined),
    })),
  };
});

function mockNitroApp() {
  const hooks: Record<string, Array<(...args: any[]) => void>> = {};
  return {
    hooks: {
      hook: vi.fn((name: string, fn: (...args: any[]) => void) => {
        (hooks[name] ??= []).push(fn);
      }),
      callHook: vi.fn(),
      // Expose for test inspection
      _hooks: hooks,
    },
    _invoke: async (name: string, ...args: any[]) => {
      for (const fn of hooks[name] ?? []) {
        await fn(...args);
      }
    },
  } as any;
}

const defaultConfig: NitroLokiConfig = {
  endpoint: "http://loki:3100",
  labels: { app: "test" },
};

describe("useLokiRuntime", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "test");
  });

  it("registers request and close hooks", () => {
    const nitroApp = mockNitroApp();
    useLokiRuntime(nitroApp, defaultConfig);

    expect(nitroApp.hooks.hook).toHaveBeenCalledWith("request", expect.any(Function));
    expect(nitroApp.hooks.hook).toHaveBeenCalledWith("close", expect.any(Function));
  });

  it("attaches loki context to event.context on request", () => {
    const nitroApp = mockNitroApp();
    useLokiRuntime(nitroApp, defaultConfig);

    const event = { context: {} as any };
    nitroApp._invoke("request", event);

    expect(event.context.loki).toBeDefined();
    expect(event.context.loki.log).toBeInstanceOf(Function);
    expect(event.context.loki.flush).toBeInstanceOf(Function);
  });

  it("close hook is registered", () => {
    const nitroApp = mockNitroApp();
    useLokiRuntime(nitroApp, defaultConfig);

    // Verify close hook was wired up
    const closeHooks = nitroApp.hooks._hooks["close"];
    expect(closeHooks).toBeDefined();
    expect(closeHooks).toHaveLength(1);
  });
});
