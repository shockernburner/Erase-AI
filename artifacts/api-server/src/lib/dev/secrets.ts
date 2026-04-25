// Thin TypeScript wrapper around ./secrets-source.mjs. The runtime patterns +
// detection logic live in the .mjs sibling so the api-server test suite can
// import them directly via `node --test`. This file just re-exports them with
// TS types attached.
import { detectSecrets as detectSecretsImpl, maskSecret as maskSecretImpl } from "./secrets-source.mjs";

export interface SecretMatch {
  type: string;
  pattern: string;
  match: string;
  start: number;
  end: number;
}

export const detectSecrets: (text: string) => SecretMatch[] = detectSecretsImpl;
export const maskSecret: (value: string) => string = maskSecretImpl;
