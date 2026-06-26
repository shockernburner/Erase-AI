---
name: Video scene AnimatePresence pile-up from invalid transition key
description: Why video scenes freeze and stack on top of each other; the silent failure mode of spreading an undefined sceneTransitions preset.
---

A video scene root spreads a transition preset, e.g. `<motion.div {...sceneTransitions.wipe}>`.
If the referenced key does NOT exist in `lib/video/animations.ts`, the access returns `undefined`,
and `{...undefined}` spreads nothing — so the scene root gets NO `initial`/`animate`/`exit`/`transition`.

**Symptom:** With `<AnimatePresence mode="popLayout">` switching keyed scenes, a scene whose root has no
`exit` never unmounts. It stays frozen on screen while later scenes render on top → scenes visibly pile up
(multiple non-adjacent scenes overlapping at once).

**Why:** AnimatePresence relies on a defined `exit` to drive + complete the removal animation before unmount.
No `exit` (because the preset was undefined) → the exiting child is never cleanly removed under popLayout.

**How to apply:**
- Every scene root's `{...sceneTransitions.X}` must reference a key that actually exists in `animations.ts`.
  Known-good keys include `wipe`, `slideUp/slideLeft/slideRight`, `fadeBlur`, `clipCircle`, `clipPolygon`,
  `morphExpand`, `pushLeft/pushRight`, `perspectiveFlip`. There is NO `wipeRight` or `pushUp`.
- `popLayout` itself is fine (the working how-it-works-video uses it identically) — the bug is the missing key.
- This is a TS error in principle (property doesn't exist on the const), but per-artifact typecheck isn't always
  run for video artifacts, so it slips through. Grep `sceneTransitions\.` across scenes and diff against the
  exported keys after any scene edit.
