import { describe, it, expect, vi, beforeEach } from "vitest";
import { LokiTransport } from "./transport";

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("LokiTransport", () => {
  let transport: LokiTransport;

  beforeEach(() => {
    mockFetch.mockReset();
    transport = new LokiTransport({ endpoint: "http://loki:3100" });
  });

  it("pushes entries as a Loki-compatible JSON payload", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });

    const result = await transport.push([
      { ts: "1718000000000000000", line: "hello world" },
    ]);

    expect(result.ok).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe("http://loki:3100/loki/api/v1/push");
    expect(init.method).toBe("POST");
    expect(init.headers["Content-Type"]).toBe("application/json");

    const body = JSON.parse(init.body);
    expect(body.streams).toHaveLength(1);
    expect(body.streams[0].stream).toEqual({});
    expect(body.streams[0].values).toEqual([["1718000000000000000", "hello world"]]);
  });

  it("returns { ok: false } when Loki responds with non-2xx", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      text: () => Promise.resolve("Too Many Requests"),
    });

    const result = await transport.push([{ ts: "1", line: "x" }]);
    expect(result.ok).toBe(false);
    expect(result.status).toBe(429);
    expect(result.error).toBe("Too Many Requests");
  });

  it("returns { ok: false } on network error", async () => {
    mockFetch.mockRejectedValueOnce(new Error("ECONNREFUSED"));

    const result = await transport.push([{ ts: "1", line: "x" }]);
    expect(result.ok).toBe(false);
    expect(result.error).toBe("ECONNREFUSED");
  });

  it("sends no request for empty batch", async () => {
    const result = await transport.push([]);
    expect(result.ok).toBe(true);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("sets Basic auth header when username/password provided", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });

    const authTransport = new LokiTransport({
      endpoint: "https://loki.example.com",
      username: "user",
      password: "pass",
    });
    await authTransport.push([{ ts: "1", line: "auth test" }]);

    const [, init] = mockFetch.mock.calls[0];
    expect(init.headers["Authorization"]).toBe(`Basic ${btoa("user:pass")}`);
  });

  it("strips trailing slash from endpoint", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });

    const t = new LokiTransport({ endpoint: "http://loki:3100/" });
    await t.push([{ ts: "1", line: "trailing" }]);

    const [url] = mockFetch.mock.calls[0];
    expect(url).toBe("http://loki:3100/loki/api/v1/push");
  });
});
