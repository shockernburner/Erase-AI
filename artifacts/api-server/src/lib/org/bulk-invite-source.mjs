// Turns whatever a person pastes into the "invite everyone" box into a clean list of addresses:
// separated by commas, semicolons, spaces or lines, or written as `Name <email>` the way a mail client
// copies them. Anything that is not an email is reported back, never dropped silently.

import { normalizeEmail } from "./org-source.mjs";

export const BULK_INVITE_MAX = 100;
// A paste larger than this is cut before it is split, so a huge value cannot tie up the server.
const MAX_INPUT_CHARS = 200000;

export function parseEmailList(input, { max = BULK_INVITE_MAX } = {}) {
  const result = { valid: [], invalid: [], skipped: [], duplicates: 0 };
  if (typeof input !== "string") return result;
  // `Name <email>`: keep only what is inside the angle brackets.
  const text = input
    .slice(0, MAX_INPUT_CHARS)
    .replace(/(?:"[^"]*"|[^<>,;\s]*)\s*<([^<>\s]+)>/g, (m, inner) => ` ${inner} `);
  const seen = new Set();
  for (const raw of text.split(/[\s,;]+/)) {
    // A CSV export wraps cells in quotes.
    const token = raw.replace(/^["']+|["']+$/g, "");
    if (!token) continue;
    const email = normalizeEmail(token);
    if (!email) {
      result.invalid.push(token);
      continue;
    }
    if (seen.has(email)) {
      result.duplicates += 1;
      continue;
    }
    seen.add(email);
    if (result.valid.length < max) result.valid.push(email);
    else result.skipped.push(email);
  }
  return result;
}
