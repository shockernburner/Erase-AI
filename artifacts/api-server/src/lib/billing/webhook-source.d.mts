import type { Request, Response } from "express";

export interface StripeWebhookSyncLike {
  processWebhook(
    payload: Buffer | string,
    signature: string | undefined,
  ): Promise<void>;
}

export interface StripeWebhookLogger {
  error(...args: unknown[]): void;
}

export function createStripeWebhookHandler(opts: {
  getSync: () => Promise<StripeWebhookSyncLike>;
  reconcile?: () => Promise<void>;
  logger?: StripeWebhookLogger;
}): (req: Request, res: Response) => Promise<void>;
