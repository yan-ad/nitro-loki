import { describe, it, expect } from "vitest";
import { redactSensitiveKeys, redactLine, compileRedactRules } from "./redact";

describe("redactSensitiveKeys", () => {
  it("returns primitive values as-is", () => {
    expect(redactSensitiveKeys(null)).toBe(null);
    expect(redactSensitiveKeys(undefined)).toBe(undefined);
    expect(redactSensitiveKeys("hello")).toBe("hello");
    expect(redactSensitiveKeys(42)).toBe(42);
  });

  it("redacts known sensitive keys at top level", () => {
    const input = { username: "alice", password: "s3cret", token: "abc123" };
    const result = redactSensitiveKeys(input) as Record<string, unknown>;

    expect(result.username).toBe("alice");
    expect(result.password).toBe("[REDACTED]");
    expect(result.token).toBe("[REDACTED]");
  });

  it("redacts nested sensitive keys", () => {
    const input = {
      user: { name: "bob", apiKey: "sk-12345", meta: { secret: "deep" } },
    };
    const result = redactSensitiveKeys(input) as any;

    expect(result.user.name).toBe("bob");
    expect(result.user.apiKey).toBe("[REDACTED]");
    expect(result.user.meta.secret).toBe("[REDACTED]");
  });

  it("redacts sensitive keys inside arrays", () => {
    const input = [{ password: "a" }, { password: "b" }];
    const result = redactSensitiveKeys(input) as any[];

    expect(result[0].password).toBe("[REDACTED]");
    expect(result[1].password).toBe("[REDACTED]");
  });

  it("handles camelCase and snake_case variants", () => {
    const input = { accessToken: "t1", access_token: "t2", refresh_token: "t3" };
    const result = redactSensitiveKeys(input) as any;

    expect(result.accessToken).toBe("[REDACTED]");
    expect(result.access_token).toBe("[REDACTED]");
    expect(result.refresh_token).toBe("[REDACTED]");
  });

  it("does not mutate the original object", () => {
    const input = { password: "orig", name: "alice" };
    redactSensitiveKeys(input);
    expect(input.password).toBe("orig");
  });
});

describe("redactLine", () => {
  it("replaces all matches of a regex pattern", () => {
    const line = 'Bearer sk-abc123 is the token and also Bearer sk-def456';
    const result = redactLine(line, [/Bearer\s+\S+/g]);
    expect(result).toBe("[REDACTED] is the token and also [REDACTED]");
  });

  it("returns unchanged line if no patterns match", () => {
    const line = "nothing sensitive here";
    expect(redactLine(line, [/topsecret/g])).toBe("nothing sensitive here");
  });
});

describe("compileRedactRules", () => {
  it("compiles string rules into regex patterns", () => {
    const { patterns } = compileRedactRules(["password"]);
    expect(patterns).toHaveLength(1);
    expect(patterns[0]).toBeInstanceOf(RegExp);

    const line = 'the password=monkey123 in the log';
    expect(redactLine(line, patterns)).toBe("the [REDACTED] in the log");
  });

  it("passes through RegExp rules directly", () => {
    const { patterns } = compileRedactRules([/custom\d+/g]);
    expect(patterns).toHaveLength(1);

    expect(redactLine("found custom42 here", patterns)).toBe("found [REDACTED] here");
  });
});
