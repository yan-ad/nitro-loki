# 🐍 Uloki — Universal Loki Log Adapter

> **ulo** (Javanese for snake) + **loki** (Grafana Loki)
>
> Loki logging transport for [Nitro](https://nitro.unjs.io), [Nuxt](https://nuxt.com), and [Elysia](https://elysiajs.com).

[![CI](https://github.com/yan-ad/uloki/actions/workflows/test.yml/badge.svg)](https://github.com/yan-ad/uloki/actions/workflows/test.yml)
[![npm](https://img.shields.io/npm/v/uloki)](https://www.npmjs.com/package/uloki)
[![license](https://img.shields.io/github/license/yan-ad/uloki)](./LICENSE)
[![docs](https://img.shields.io/badge/docs-uloki.vercel.app-blue)](https://uloki.vercel.app)

Ship structured logs from your Nitro, Nuxt, or Elysia server to [Grafana Loki](https://grafana.com/oss/loki/) with automatic batching, configurable redaction, and zero runtime overhead when disabled.

## Features

- **Auto-batching** — Buffers log entries and flushes in configurable batches
- **Redaction** — Built-in sensitive field detection + custom regex rules
- **Request logging** — Automatic HTTP request metadata capture in logfmt format
- **Multi-framework** — Drop-in plugins for Nitro, Nuxt, and Elysia
- **Type-safe** — Full TypeScript support with exported types
- **Zero-overhead disabled** — No HTTP calls when `enabled: false`

## Packages

| Package | npm | Description |
|---|---|---|
| [`uloki`](./packages/core) | Core | Logger, transport, redaction, request helpers |
| [`@uloki/nitro`](./packages/nitro) | nitro | Nitro server plugin — hooks, runtime, config |
| [`@uloki/nuxt`](./packages/nuxt) | nuxt | Nuxt module — drop-in via `nuxt.config` |
| [`@uloki/elysia`](./packages/elysia) | elysia | Elysia plugin — drop-in via `.use(uloki())` |

## Quick Start

### Nuxt (recommended)

```bash
pnpm add @uloki/nuxt
```

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ["@uloki/nuxt"],
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
pnpm add @uloki/nitro
```

```ts
// nitro.config.ts
import { nitroLokiPlugin } from "@uloki/nitro";

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
pnpm add uloki
```

```ts
import { LokiLogger } from "uloki";

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

### Elysia

```bash
pnpm add @uloki/elysia
```

```ts
import { Elysia } from "elysia";
import { uloki } from "@uloki/elysia";

const app = new Elysia()
  .use(uloki({
    endpoint: "http://localhost:3100",
    labels: { app: "my-api" },
  }))
  .get("/", () => "ok")
  .listen(3000);
```

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

## Request Logging

The Nitro runtime automatically captures HTTP request metadata and pushes structured access logs:

```
method=GET path=/api/users status=200 duration_ms=12 ua="Mozilla/5.0 ..."
```

Labels include `method`, `status`, and `level` (`info` / `warn` / `error`) for easy filtering in Grafana.

## API

### `uloki`

| Export | Description |
|---|---|
| `LokiLogger` | High-level logger: buffers, redacts, batches, flushes to Loki |
| `LokiTransport` | Low-level HTTP transport to Loki's `/loki/api/v1/push` |
| `compileRedactRules(rules)` | Compile string/RegExp rules into regex patterns |
| `redactLine(line, patterns)` | Apply regex redaction to a log line |
| `redactSensitiveKeys(obj)` | Deep-clone object with sensitive keys replaced |
| `fmtRequestLog(meta)` | Format HTTP request metadata as logfmt line |
| `logRequest(logger, meta, labels?)` | Log an HTTP request with standard labels + log level |

### `@uloki/nitro`

| Export | Description |
|---|---|
| `nitroLokiPlugin(config?)` | Nitro build plugin — injects runtime, virtual config |
| `resolveConfig(config?)` | Merge user config with defaults |
| `useLokiRuntime(nitroApp, config)` | Wire Loki logger into Nitro hooks (`request`, `close`, `loki:log`) |

### `@uloki/nuxt`

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ["@uloki/nuxt"],
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

### `@uloki/elysia`

| Export | Description |
|---|---|
| `uloki(config?)` | Elysia plugin — wires Loki logger into Elysia lifecycle |

```ts
import { uloki } from "@uloki/elysia";

new Elysia()
  .use(uloki({
    endpoint: "http://localhost:3100",
    labels: { app: "my-service" },
    batchSize: 10,
    flushInterval: 5000,
    requestLogging: true,
    redact: ["token", "secret"],
  }))
  .listen(3000);
```

The plugin attaches `store.loki` with `.log()` and `.flush()` for manual logging inside route handlers.

## Documentation

Full docs at [uloki.vercel.app](https://uloki.vercel.app) — installation guide, configuration reference, core API, and integration docs.

## Development

```bash
# Clone
git clone https://github.com/yan-ad/uloki.git
cd uloki

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

## License

MIT
