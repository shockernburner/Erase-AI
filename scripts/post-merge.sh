#!/bin/bash
set -e
pnpm install --frozen-lockfile
pnpm --filter db push

chmod -f 644 artifacts/eraseai/public/videos/*.mp4 2>/dev/null || true
chmod -f 644 artifacts/how-it-works-video/public/clips/*.mp4 2>/dev/null || true
