export const STORED_EXCERPT_MAX: number;
export const NOT_STORED: string;
export function excerptForStorage(text: unknown, options?: { zeroRetention?: boolean }): string;
export function flagsForStorage<T>(flags: T[] | null | undefined): T[];
export function suggestionsForStorage<T>(suggestions: T[] | null | undefined): T[];
