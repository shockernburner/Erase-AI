// Type declarations for the JS cleanup factory in demo-key-cleanup-source.mjs.
// Keeps the .ts wrapper fully typed while letting node:test load the source
// without a TypeScript loader.

export const DEMO_USER_ID: string;
export const DEMO_KEY_CLEANUP_GRACE_MS: number;
export const DEMO_KEY_CLEANUP_INTERVAL_MS: number;

export interface DemoKeyCleanupResult {
  deletedCount: number;
  cutoff: Date;
}

export interface CreateDemoKeyCleanupDeps {
  deleteRows: (args: { demoUserId: string; cutoff: Date }) => Promise<number>;
  now?: () => number;
  demoUserId?: string;
  graceMs?: number;
  logger?: {
    info?: (...args: unknown[]) => void;
    error?: (...args: unknown[]) => void;
  };
}

export function createDemoKeyCleanup(
  deps: CreateDemoKeyCleanupDeps,
): () => Promise<DemoKeyCleanupResult>;
