export interface ChangelogEntry {
  version: string;
  date: string;
  changes: string[];
}

export interface ChangelogFile {
  entries: ChangelogEntry[];
}

export interface ExtensionMetadata {
  version: string;
  filename: string;
  sizeBytes: number;
  lastModified: string;
  changelog: ChangelogEntry[];
}

export interface ExtensionVersionPayload {
  version: string;
  filename: string | null;
  sizeBytes: number | null;
  lastModified: string | null;
  changelog: ChangelogEntry[];
}

export function readChangelog(): Promise<ChangelogFile | null>;
export function readMetadata(): Promise<ExtensionMetadata | null>;
export function resolveExtensionVersionPayload(): Promise<ExtensionVersionPayload | null>;
