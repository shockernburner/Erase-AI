---
name: Archive decompression DoS guard (extension sandbox)
description: Why archive/zip/gzip decompression in the browser extension must enforce byte ceilings DURING streaming, never trust archive metadata, and swallow the writer abort.
---

# Bounded decompression for archive scanning

When the EraseAI extension scans archives (.zip/.tar/.gz) in the sandboxed iframe, decompression MUST be bounded *during* the stream, not after.

**The rule:**
- Never call `new Response(decompressionStream.readable).arrayBuffer()` on attacker-supplied data — that fully materializes the payload before any size check, so a small zip/gzip bomb can OOM the tab.
- Instead, read the `DecompressionStream` reader chunk-by-chunk, keep a running total, and on `total > cap` call `reader.cancel()` and throw a recognizable error (the code uses `"decompressed size exceeds limit"`).
- Treat all archive metadata (ZIP central-directory `uncompressedSize`, etc.) as untrusted. Use declared size only as a fast pre-reject; do all per-entry and cumulative accounting against the ACTUAL decompressed byte count.

**Why:** A code review found the original guards bypassable — they inflated fully first and trusted the central-directory size. A 25MB archive could declare tiny sizes yet inflate to gigabytes and lock the tab.

**How to apply:** Caps come from `EraseAILimits` (ARCHIVE_MAX_ENTRY_BYTES per entry for zip/deflate; ARCHIVE_MAX_TOTAL_BYTES for gunzip). The shared `readZipEntry` takes an OPTIONAL `maxBytes` — the recursive archive path passes a bound, but the OOXML extractors (extractXlsxText/extractPptxText) intentionally call it UNBOUNDED to preserve prior behavior, so internal OOXML entries remain a known residual (tracked as follow-up hardening).

**Gotcha:** Cancelling the reader makes the writer's pending `write()`/`close()` promises reject with `ABORT_ERR`. If you don't `.catch()` them they surface as unhandled promise rejections and fail the test run even though the test itself passes. Attach `.catch(() => {})` to both and do NOT await them.

**Encrypted ZIP:** detect via local-header general-purpose bit-flag bit 0 (`dv.getUint16(lh+6) & 1`) and surface as the archiveUnsupported reason — DecompressionStream would otherwise produce garbage.
