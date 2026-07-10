---
name: Print-to-PDF pagination for A4 web documents
description: How to render the letterhead-style HTML docs to clean multi-page PDFs (chromium + playwright) without blank/overflow pages.
---

# Rendering letterhead-style docs to PDF

The `artifacts/letterhead` docs are print-to-PDF web pages (a "Print / Save as PDF"
button calling `window.print()`). To produce an actual PDF file server-side:

- Playwright's downloaded chromium fails in this nix env (`libglib-2.0.so.0` missing).
  Install a nix-linked browser instead: `installSystemDependencies({ packages: ["chromium"] })`,
  then launch `playwright-core` with `executablePath` = `which chromium` and `args:['--no-sandbox']`.
- Render via the artifact's public dev URL (`$REPLIT_DEV_DOMAIN/letterhead/<route>`),
  `emulateMedia({media:'print'})`, then `page.pdf({format:'A4', printBackground:true, preferCSSPageSize:true})`.

**Why blank/extra pages appear (the real trap):**
1. A page container whose height **equals** A4 exactly (`min-height: 297mm`) spills a
   fraction onto the next physical page. Fix: in `@media print` force the page box to be
   **slightly under** A4 (`height: 296mm !important; min-height: auto !important; overflow: hidden`).
2. The gray **outer wrapper**'s `padding`/flex-centering shifts pages down in print and
   causes spill even at 296mm. Fix: neutralize it in print (`padding:0; margin:0; display:block; min-height:0; background:#fff`).
3. `page-break-after: always` on **every** `.letterhead-page` adds a trailing blank page.
   Scope it to `:not(:last-child)`.

**How to apply:** scope the height/overflow overrides to a doc-specific class (e.g.
`.brief-page`, `.brief-root`) so single-page docs sharing `.letterhead-page` are untouched.
Verify by measuring `getBoundingClientRect().height` per page under print emulation AND
checking the final `file <pdf>` page count — measuring height alone is not enough.
