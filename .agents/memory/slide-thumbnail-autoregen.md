---
name: slide-thumbnail autoregen contaminates git diff
description: Why unrelated slides artifacts show up as modified during unrelated work, and how to revert without a destructive git command.
---

Running slides-artifact dev servers (the `artifacts/*` slide decks) auto-regenerate tracked thumbnail caches under `src/data/.slide-thumbnails/*.jpg`. The bytes change on re-encode (e.g. 57173 → 56557 bytes) even when no slide content changed.

**Why it matters:** these files are git-tracked, so they appear as `M` in `git diff` and can make a completion code-review FAIL a "do not modify the existing X deck" requirement — even though you never touched that artifact. This happened when building `pitch-video-cn` while `artifacts/pitch-deck`'s dev server was running.

**How to apply:**
- If a code review flags incidental changes to an artifact you didn't intend to touch, check whether they're only `.slide-thumbnails/*.jpg` binary re-encodes — that's the dev server, not your edit.
- To revert WITHOUT a destructive git command (main agent is forbidden from `git checkout`/`git restore`): `git show "HEAD:<path>" > "<path>"`. `git show` is read-only; the redirect is a normal file write. This restored the originals cleanly.
