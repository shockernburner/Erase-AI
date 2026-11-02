export const BULK_INVITE_MAX: number;
export interface ParsedEmailList {
  valid: string[];
  invalid: string[];
  skipped: string[];
  duplicates: number;
}
export function parseEmailList(input: unknown, options?: { max?: number }): ParsedEmailList;
