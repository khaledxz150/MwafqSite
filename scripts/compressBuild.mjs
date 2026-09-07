/**
 * Compress the Next.js build output (.next + public) into a single
 * .next.zip at the project root.
 *
 * Usage: node scripts/compressBuild.mjs
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = process.cwd();
const NEXT_DIR = resolve(ROOT, ".next");
const PUBLIC_DIR = resolve(ROOT, "public");
const OUT_ZIP = resolve(ROOT, ".next.zip");

if (!existsSync(NEXT_DIR)) {
  console.error("compressBuild: .next not found. Run `next build` first.");
  process.exit(1);
}

const paths = [NEXT_DIR, ...(existsSync(PUBLIC_DIR) ? [PUBLIC_DIR] : [])]
  .map((p) => `'${p}'`)
  .join(",");

const result = spawnSync(
  "powershell",
  [
    "-NoProfile",
    "-Command",
    `Compress-Archive -Path ${paths} -DestinationPath '${OUT_ZIP}' -Force`,
  ],
  { stdio: "inherit" },
);

if (result.error) {
  console.error("compressBuild: failed to run PowerShell:", result.error.message);
  process.exit(1);
}

const status = result.status ?? 0;

// On a successful compression, open File Explorer with the archive selected.
if (status === 0) {
  spawnSync("explorer", [`/select,${OUT_ZIP}`], { stdio: "ignore" });
}

process.exit(status);
