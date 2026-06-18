/**
 * Configuration options for @uloki/elysia.
 */
export interface ElysiaLokiConfig {
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
  /** Capture request logs automatically (default: true) */
  requestLogging?: boolean;
}

/** Plugged into Elysia store for manual logging */
export interface LokiStore {
  log: (entry: { line: string; labels?: Record<string, string> }) => void;
  flush: () => Promise<void>;
}
