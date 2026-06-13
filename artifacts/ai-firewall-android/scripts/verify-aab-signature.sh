#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
AAB_PATH="${1:-${PROJECT_DIR}/app/build/outputs/bundle/release/app-release.aab}"

if [ ! -f "${AAB_PATH}" ]; then
  echo "ERROR: AAB not found: ${AAB_PATH}" >&2
  exit 1
fi

if command -v jarsigner >/dev/null 2>&1; then
  JARSIGNER="jarsigner"
elif [ -n "${JAVA_HOME:-}" ] && [ -x "${JAVA_HOME}/bin/jarsigner" ]; then
  JARSIGNER="${JAVA_HOME}/bin/jarsigner"
elif [ -x "/Applications/Android Studio.app/Contents/jbr/Contents/Home/bin/jarsigner" ]; then
  JARSIGNER="/Applications/Android Studio.app/Contents/jbr/Contents/Home/bin/jarsigner"
else
  echo "ERROR: jarsigner not found." >&2
  echo "Set JAVA_HOME to a JDK and retry." >&2
  exit 1
fi

VERIFY_OUTPUT="$(${JARSIGNER} -verify -verbose -certs "${AAB_PATH}" 2>&1 || true)"

if printf '%s\n' "${VERIFY_OUTPUT}" | grep -qi "jar is unsigned"; then
  echo "ERROR: AAB is unsigned: ${AAB_PATH}" >&2
  exit 1
fi

if ! printf '%s\n' "${VERIFY_OUTPUT}" | grep -qi "jar verified"; then
  echo "ERROR: AAB signature verification failed: ${AAB_PATH}" >&2
  printf '%s\n' "${VERIFY_OUTPUT}" >&2
  exit 1
fi

echo "AAB signature verified: ${AAB_PATH}"