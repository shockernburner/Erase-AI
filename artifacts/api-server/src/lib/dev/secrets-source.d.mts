export interface SecretPattern {
  type: string;
  pattern: RegExp;
  label: string;
}

export interface SecretMatch {
  type: string;
  pattern: string;
  match: string;
  start: number;
  end: number;
}

export const SECRET_PATTERNS: SecretPattern[];
export function detectSecrets(text: string): SecretMatch[];
export function maskSecret(value: string): string;
