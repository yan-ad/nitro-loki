import { describe, it, expect } from "vitest";
import { fmtRequestLog } from "./request";

describe("fmtRequestLog", () => {
  it("formats a basic HTTP request log line", () => {
    const line = fmtRequestLog({
      method: "GET",
      path: "/api/users",
      status: 200,
      durationMs: 42,
    });
    expect(line).toBe("method=GET path=/api/users status=200 duration_ms=42");
  });

  it("includes userAgent when present", () => {
    const line = fmtRequestLog({
      method: "POST",
      path: "/login",
      status: 401,
      durationMs: 15,
      userAgent: "curl/8.0",
    });
    expect(line).toContain('ua="curl/8.0"');
  });

  it("includes contentLength when defined", () => {
    const line = fmtRequestLog({
      method: "PUT",
      path: "/upload",
      status: 201,
      durationMs: 120,
      contentLength: 4096,
    });
    expect(line).toContain("content_length=4096");
  });

  it("omits ua when userAgent empty", () => {
    const line = fmtRequestLog({
      method: "DELETE",
      path: "/item/1",
      status: 204,
      durationMs: 3,
    });
    expect(line).not.toContain("ua=");
  });

  it("orders fields as method → path → status → duration → ua → content_length", () => {
    const line = fmtRequestLog({
      method: "PATCH",
      path: "/x",
      status: 200,
      durationMs: 5,
      userAgent: "test",
      contentLength: 100,
    });
    const re = /^method=\S+ path=\S+ status=\d+ duration_ms=\d+ ua="[^"]*" content_length=\d+$/;
    expect(line).toMatch(re);
  });
});
