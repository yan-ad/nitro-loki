# nitro-loki

> Loki logging transport for [Nitro](https://nitro.unjs.io) — the server engine that powers [Nuxt](https://nuxt.com).

[![CI](https://github.com/yan-ad/nitro-loki/actions/workflows/test.yml/badge.svg)](https://github.com/yan-ad/nitro-loki/actions/workflows/test.yml)
[![npm](https://img.shields.io/npm/v/nitro-loki)](https://www.npmjs.com/package/nitro-loki)
[![license](https://img.shields.io/github/license/yan-ad/nitro-loki)](./LICENSE)

Ship structured logs from your Nitro/Nuxt server to [Grafana Loki](https://grafana.com/oss/loki/) with automatic batching, configurable redaction, and zero runtime overhead when disabled.

---

## Packages

| Package | npm | Description |
|---|---|---|
| [`nitro-loki`](./packages/core) | Core | Logger, transport, redaction, request helpers |
| [`@nitro-loki/nitro`](./packages/nitro) | nitro | Nitro server plugin — hooks, runtime, config |
| [`@nitro-loki/nuxt`](./packages/nuxt) | nuxt | Nuxt module — drop-in via `nuxt.config` |

---

## Quick Start

### Nuxt (recommended)

```bash
pnpm add @nitro-loki/nuxt
```

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ["@nitro-loki/nuxt"],
  loki: {
    endpoint: "http://localhost:3100",
    labels: { app: "my-app", env: "production" },
    batchSize: 10,
    flushInterval: 5000,
  },
});
```

### Nitro standalone

```bash
pnpm add @nitro-loki/nitro
```

```ts
// nitro.config.ts
import { nitroLokiPlugin } from "@nitro-loki/nitro";

export default defineNitroConfig({
  plugins: [
    nitroLokiPlugin({
      endpoint: "http://localhost:3100",
      labels: { app: "my-api" },
    }),
  ],
});
```

### Core (programmatic)

```bash
pnpm add nitro-loki
```

```ts
import { LokiLogger } from "nitro-loki";

const logger = new LokiLogger({
  endpoint: "http://localhost:3100",
  labels: { service: "worker" },
  flushInterval: 5000,
  redact: ["token", "secret", /Bearer\s+\S+/g],
});

logger.log({ line: "Worker started", labels: { level: "info" } });
logger.log({ line: "Job completed", labels: { level: "info" } });

// Flush on shutdown
await logger.dispose();
```

---

## API

### `nitro-loki`

| Export | Description |
|---|---|
| `LokiLogger` | High-level logger: buffers, redacts, batches, flushes to Loki |
| `LokiTransport` | Low-level HTTP transport to Loki's `/loki/api/v1/push` |
| `compileRedactRules(rules)` | Compile string/RegExp rules into regex patterns |
| `redactLine(line, patterns)` | Apply regex redaction to a log line |
| `redactSensitiveKeys(obj)` | Deep-clone object with sensitive keys replaced |
| `fmtRequestLog(meta)` | Format HTTP request metadata as logfmt line |
| `logRequest(logger, meta, labels?)` | Log an HTTP request with standard labels + log level |

### `@nitro-loki/nitro`

| Export | Description |
|---|---|
| `nitroLokiPlugin(config?)` | Nitro build plugin — injects runtime, virtual config |
| `resolveConfig(config?)` | Merge user config with defaults |
| `useLokiRuntime(nitroApp, config)` | Wire Loki logger into Nitro hooks (`request`, `close`, `loki:log`) |

### `@nitro-loki/nuxt`

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ["@nitro-loki/nuxt"],
  loki: {
    endpoint: string        // Loki push endpoint (default: http://localhost:3100/loki/api/v1/push)
    enabled?: boolean       // Enable logging (default: true)
    labels?: Record<string, string>   // Default labels on every entry
    batchSize?: number      // Entries per batch (default: 10)
    flushInterval?: number  // Max ms between flushes (default: 5000)
    redact?: (string | RegExp)[]     // Patterns to redact from log lines
  },
});
```

---

## Configuration

All packages share the same config shape:

```ts
interface NitroLokiConfig {
  endpoint?: string;              // Loki push endpoint
  labels?: Record<string, string>; // Default labels on every entry
  enabled?: boolean;              // Enable/disable (default: true)
  batchSize?: number;             // Entries before auto-flush (default: 10)
  flushInterval?: number;         // Max ms between flushes (default: 5000)
  redact?: (string | RegExp)[];   // Redaction patterns
}
```

---

## Redaction

Built-in sensitive field detection covers `password`, `token`, `secret`, `apiKey`, `authorization`, `cookie`, and others. Add custom rules:

```ts
loki: {
  redact: [
    "credit_card",                // field name
    "ssn",                        // field name
    /Bearer\s+\S+/g,              // regex pattern
    /x-api-key:\s*\S+/gi,         // regex pattern
  ],
}
```

Redacted values are replaced with `[REDACTED]` before shipping to Loki.

---

## Request Logging

The Nitro runtime automatically captures HTTP request metadata and pushes structured access logs:

```
method=GET path=/api/users status=200 duration_ms=12 ua="Mozilla/5.0 ..."
```

Labels include `method`, `status`, and `level` (`info` / `warn` / `error`) for easy filtering in Grafana.

---

## Development

```bash
# Clone
git clone https://github.com/yan-ad/nitro-loki.git
cd nitro-loki

# Install
pnpm install

# Build all packages
pnpm build

# Typecheck
pnpm typecheck

# Run tests (vitest)
pnpm test
```

### Playgrounds

```bash
pnpm play:nuxt    # Nuxt dev server with Loki logging
pnpm play:nitro   # Nitro standalone dev server
```

---

## License

MIT
