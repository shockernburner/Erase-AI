#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

KEYSTORE_FILE="${1:-${PROJECT_DIR}/release.jks}"
KEY_ALIAS="${2:-eraseai-firewall}"

if ! command -v keytool >/dev/null 2>&1; then
  echo "ERROR: keytool not found." >&2
  echo "Set JAVA_HOME to a JDK, for example:" >&2
  echo "  export JAVA_HOME=\"/Applications/Android Studio.app/Contents/jbr/Contents/Home\"" >&2
  echo "  export PATH=\"\$JAVA_HOME/bin:\$PATH\"" >&2
  exit 1
fi

if [ -f "${KEYSTORE_FILE}" ]; then
  echo "ERROR: Keystore already exists: ${KEYSTORE_FILE}" >&2
  echo "Refusing to overwrite an upload key. Losing or replacing it can break future Play Console releases." >&2
  exit 1
fi

echo "Generating EraseAI Firewall upload keystore."
echo "Keystore: ${KEYSTORE_FILE}"
echo "Alias: ${KEY_ALIAS}"
echo "You will be prompted for passwords. The script will not print or store them."

keytool -genkeypair -v \
  -keystore "${KEYSTORE_FILE}" \
  -alias "${KEY_ALIAS}" \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000

echo "Keystore created: ${KEYSTORE_FILE}"
echo "Next: copy keystore.properties.example to keystore.properties and fill local values."
echo "Back up the keystore and passwords securely. Losing the upload key creates Play Console release problems."