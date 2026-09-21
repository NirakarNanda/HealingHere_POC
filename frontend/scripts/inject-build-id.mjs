/**
 * Injects the Next.js build ID into the service worker.
 *
 * Run by `npm run build` after `next build`. Reads .next/BUILD_ID and
 * stamps it into public/sw.js (generated from public/sw.template.js), so
 * every deployment ships a byte-different sw.js. Browsers then install the
 * fresh service worker on the next visit instead of running a stale cached
 * app bundle — without this, the cache-first app shell would keep serving
 * the previous deployment's HTML/JS indefinitely.
 *
 * public/sw.js is gitignored; the template is the source of truth.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const buildIdPath = join(root, ".next", "BUILD_ID");
const buildId = existsSync(buildIdPath) ? readFileSync(buildIdPath, "utf8").trim() : "dev";

const template = readFileSync(join(root, "public", "sw.template.js"), "utf8");
if (!template.includes("__BUILD_ID__")) {
  throw new Error("sw.template.js does not contain the __BUILD_ID__ placeholder");
}
writeFileSync(join(root, "public", "sw.js"), template.replaceAll("__BUILD_ID__", buildId));
console.log(`[sw] public/sw.js generated with build id "${buildId}"`);
