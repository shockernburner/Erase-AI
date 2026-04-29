#!/bin/bash
set -e
pnpm install --frozen-lockfile

# Idempotent fixup: align the api_keys.key_hash unique constraint name with
# what `drizzle-kit push` expects (api_keys_key_hash_unique). The original
# constraint was created by Postgres with the default name
# (api_keys_key_hash_key), so drizzle-kit treats it as a missing constraint
# and asks an interactive y/n about truncating the table — which hangs in
# the post-merge environment (no TTY). See task #128.
if [ -n "${DATABASE_URL:-}" ] && command -v psql >/dev/null 2>&1; then
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 >/dev/null <<'SQL'
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'api_keys'::regclass
      AND conname = 'api_keys_key_hash_key'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'api_keys'::regclass
      AND conname = 'api_keys_key_hash_unique'
  ) THEN
    EXECUTE 'ALTER TABLE api_keys RENAME CONSTRAINT api_keys_key_hash_key TO api_keys_key_hash_unique';
  END IF;
EXCEPTION WHEN undefined_table THEN
  NULL;
END
$$;

-- Idempotent fixup: drop the legacy `dev_scans` table that predates
-- `personal_scans` and is no longer in the Drizzle schema. If we don't
-- drop it explicitly, `drizzle-kit push` asks an interactive y/n on every
-- post-merge run. Any rows still in `dev_scans` are migrated into
-- `personal_scans` first (transforming the old `issues` JSON shape into
-- the new `flags` shape) so historical dev scans aren't lost. See task #129.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'dev_scans'
  ) THEN
    INSERT INTO personal_scans (user_id, content, risk_score, flags, suggestions, level, created_at)
    SELECT
      user_id,
      input_text,
      risk_score,
      COALESCE(
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'type', i->>'category',
              'severity', i->>'severity',
              'detail', i->>'detail',
              'matchedText', i->>'match',
              'position', jsonb_build_object(
                'start', COALESCE((i->>'start')::int, 0),
                'end',   COALESCE((i->>'end')::int, 0)
              )
            )
          )
          FROM jsonb_array_elements(
            CASE
              WHEN issues IS NOT NULL
                AND jsonb_typeof(issues::jsonb) = 'array'
              THEN issues::jsonb
              ELSE '[]'::jsonb
            END
          ) AS i
        )::text,
        '[]'
      ),
      '[]',
      CASE
        WHEN risk_score >= 70 THEN 'high'
        WHEN risk_score >= 40 THEN 'medium'
        ELSE 'low'
      END,
      created_at
    FROM dev_scans;

    DROP TABLE dev_scans;
  END IF;
END
$$;
SQL
fi

# Run the schema sync with stdin closed so drizzle-kit push can never block
# on an interactive y/n prompt in the post-merge environment (no TTY). If a
# prompt would fire, drizzle prints the question and exits without applying
# — that is the safe default for post-merge: do not silently destroy or
# truncate data. The full output is forwarded so the prompt is visible in
# the log, and we surface a clear warning when this happens.
PUSH_OUT=$(pnpm --filter db push </dev/null 2>&1) && PUSH_EXIT=0 || PUSH_EXIT=$?
echo "$PUSH_OUT"
if echo "$PUSH_OUT" | grep -qE 'Do you (want|still want)'; then
  echo "[post-merge] drizzle-kit push asked an interactive question and was skipped (no TTY)." >&2
  echo "[post-merge] Resolve the schema diff with an explicit migration step, then re-run." >&2
fi
[ $PUSH_EXIT -eq 0 ] || exit $PUSH_EXIT

chmod -f 644 artifacts/eraseai/public/videos/*.mp4 2>/dev/null || true
chmod -f 644 artifacts/how-it-works-video/public/clips/*.mp4 2>/dev/null || true
