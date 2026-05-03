// Re-exports the runtime from ./safety-source.mjs (importable by `node --test`)
// with TypeScript types attached. See ./safety-source.d.mts for the type
// surface.
export { analyzePromptSafety, maskCasualSecretsInText } from "./safety-source.mjs";
export type {
  IssueCategory,
  SafetyIssue,
  SafetySuggestion,
  SafetyResult,
} from "./safety-source.mjs";
