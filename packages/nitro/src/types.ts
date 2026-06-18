import type { LokiLogEntry } from "nitro-loki";

/**
 * Metadata attached to every logging context by the Nitro plugin.
 */
export interface LokiContext {
  /** Label set sent to Loki (env, app, version, etc.) */
  labels: Record<string, string>;
  /** Whether Loki logging is enabled */
  enabled: boolean;
  /** Max batch size before flushing */
  batchSize: number;
  /** Max interval (ms) between flushes */
  flushInterval: number;
}

/** Configuration options for @nitro-loki/nitro */
export interface NitroLokiConfig {
  /** Loki push endpoint */
  endpoint?: string;
  /** Default label set applied to every log entry */
  labels?: Record<string, string>;
  /** Enable/disable Loki logging (default: true) */
  enabled?: boolean;
  /** Max entries before flush (default: 10) */
  batchSize?: number;
  /** Max ms between flushes (default: 5000) */
  flushInterval?: number;
  /** Redact patterns for sensitive fields */
  redact?: (string | RegExp)[];
}
