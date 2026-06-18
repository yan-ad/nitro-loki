import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock @nuxt/kit so the module can be imported without Nuxt installed
vi.mock("@nuxt/kit", () => ({
  defineNuxtModule: (def: any) => {
    // Return the raw definition so tests can inspect it
    return {
      ...def,
      __isMock: true,
    };
  },
  createResolver: () => ({ resolve: (p: string) => `/resolved/${p}` }),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const mod = require("./module");

describe("@nitro-loki/nuxt module", () => {
  it("is a function (Nuxt module)", () => {
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe("object"); // After mock wrap, it's the definition object
  });

  it("has correct meta name and configKey", () => {
    const def = mod.default;
    expect(def.meta.name).toBe("nitro-loki");
    expect(def.meta.configKey).toBe("loki");
  });

  it("provides sensible defaults", () => {
    const def = mod.default;
    expect(def.defaults.endpoint).toBe("http://localhost:3100/loki/api/v1/push");
    expect(def.defaults.enabled).toBe(true);
    expect(def.defaults.batchSize).toBe(10);
    expect(def.defaults.flushInterval).toBe(5000);
  });

  it("requires Nuxt >=3.12", () => {
    const def = mod.default;
    expect(def.meta.compatibility.nuxt).toBe(">=3.12");
  });
});
