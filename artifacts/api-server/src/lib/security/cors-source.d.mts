import type { RequestHandler } from "express";

export const PINNED_EXTENSION_ID: string;

export function buildAllowedOrigins(opts?: {
  extensionId?: string | null;
  extensionIds?: string[] | null;
  devOrigins?: string[];
}): Set<string>;

export function isOriginAllowed(
  origin: string | undefined | null,
  allowedSet: Set<string>,
): boolean;

export function createCorsMiddleware(opts?: {
  allowedOrigins?: Set<string>;
}): RequestHandler;
