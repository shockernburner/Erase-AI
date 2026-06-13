#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
PROPERTIES_FILE="${PROJECT_DIR}/keystore.properties"
OUTPUT_AAB="${PROJECT_DIR}/app/build/outputs/bundle/release/app-release.aab"

load_property() {
  local key="$1"
  if [ -f "${PROPERTIES_FILE}" ]; then
    local value
    value="$(grep -E "^${key}=" "${PROPERTIES_FILE}" | tail -1 | cut -d= -f2- || true)"
    if [ -n "${value}" ]; then
      printf '%s' "${value}"
      return 0
    fi
  fi
  printf '%s' "${!key:-}"
}

RELEASE_STORE_FILE_VALUE="$(load_property RELEASE_STORE_FILE)"
RELEASE_STORE_PASSWORD_VALUE="$(load_property RELEASE_STORE_PASSWORD)"
RELEASE_KEY_ALIAS_VALUE="$(load_property RELEASE_KEY_ALIAS)"
RELEASE_KEY_PASSWORD_VALUE="$(load_property RELEASE_KEY_PASSWORD)"

if [ -z "${RELEASE_STORE_FILE_VALUE}" ] || [ -z "${RELEASE_STORE_PASSWORD_VALUE}" ] || [ -z "${RELEASE_KEY_ALIAS_VALUE}" ] || [ -z "${RELEASE_KEY_PASSWORD_VALUE}" ]; then
  echo "ERROR: Release signing values are missing." >&2
  echo "Create ${PROPERTIES_FILE} from keystore.properties.example or export these env vars:" >&2
  echo "  RELEASE_STORE_FILE" >&2
  echo "  RELEASE_STORE_PASSWORD" >&2
  echo "  RELEASE_KEY_ALIAS" >&2
  echo "  RELEASE_KEY_PASSWORD" >&2
  echo "Passwords are intentionally not echoed." >&2
  exit 1
fi

STORE_PATH="${RELEASE_STORE_FILE_VALUE}"
case "${STORE_PATH}" in
  /*) ;;
  *) STORE_PATH="${PROJECT_DIR}/${STORE_PATH}" ;;
esac

if [ ! -f "${STORE_PATH}" ]; then
  echo "ERROR: RELEASE_STORE_FILE does not exist: ${STORE_PATH}" >&2
  echo "Generate one with scripts/create-upload-keystore.sh or correct keystore.properties." >&2
  exit 1
fi

cd "${PROJECT_DIR}"
./gradlew bundleRelease

"${SCRIPT_DIR}/verify-aab-signature.sh" "${OUTPUT_AAB}"

echo "Signed Play Console AAB: ${OUTPUT_AAB}"