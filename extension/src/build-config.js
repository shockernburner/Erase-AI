/*
 * EraseAI Firewall — build-time configuration.
 *
 * The values below are the DEVELOPMENT defaults. They apply when an engineer
 * loads the /extension folder unpacked into Chrome / Edge / Firefox so we can
 * point the popup at staging or local servers while iterating.
 *
 * The release build (artifacts/api-server/build.mjs) OVERWRITES this file
 * inside both the manual-install and store-upload zips with a production
 * config that drops *.replit.app from the API allowlist. Do not rely on the
 * dev defaults shipping to end users.
 */
self.ERASEAI_BUILD = {
  env: "development",
  allowedApiHosts: ["eraseai.ai", "*.eraseai.ai", "*.replit.app"],
};

self.eraseaiIsHostAllowed = function (hostname) {
  if (typeof hostname !== "string" || !hostname) return false;
  const patterns = self.ERASEAI_BUILD.allowedApiHosts;
  return patterns.some((p) => {
    if (p.startsWith("*.")) {
      const suffix = p.slice(1);
      return hostname.endsWith(suffix) && hostname.length > suffix.length;
    }
    return hostname === p;
  });
};

self.eraseaiIsApiUrlAllowed = function (url) {
  if (typeof url !== "string" || !url.startsWith("https://")) return false;
  let hostname;
  try {
    hostname = new URL(url).hostname;
  } catch {
    return false;
  }
  return self.eraseaiIsHostAllowed(hostname);
};
