// Type declarations for the JS handler factory in demo-key-source.mjs.
// Keeps the .ts route module fully typed while letting node:test load
// the source without a TypeScript loader.
import type { Request, Response, RequestHandler } from "express";

export const DEMO_USER_ID: string;
export const DEMO_KEY_TTL_MS: number;
export const DEMO_KEY_REQUEST_QUOTA: number;
export const DEMO_KEY_MINT_WINDOW_MS: number;

export function buildCurlExample(origin: string, key: string): string;

export interface DemoKeyInsertRow {
  userId: string;
  keyHash: string;
  keyPrefix: string;
  name: string;
  expiresAt: Date;
  requestQuota: number;
  ipHash: string;
}

export interface CreateDemoKeyHandlerDeps {
  findRecentMintCreatedAt: (args: {
    ipHash: string;
    since: Date;
  }) => Promise<Date | null>;
  insertApiKey: (row: DemoKeyInsertRow) => Promise<void>;
  generateApiKey: () => { raw: string; hash: string; prefix: string };
  hashIp: (ip: string) => string;
  getRequestIp?: (req: Request) => string;
  now?: () => number;
  logger?: { error: (...args: unknown[]) => void };
  mintWindowMs?: number;
  ttlMs?: number;
  requestQuota?: number;
}

export function createDemoKeyHandler(
  deps: CreateDemoKeyHandlerDeps,
): RequestHandler;
