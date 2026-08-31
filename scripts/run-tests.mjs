import { spawnSync } from "node:child_process";

const [major, minor] = process.versions.node.split(".").map(Number);

if (major < 22 || (major === 22 && minor < 6)) {
  console.error(
    `Tests need Node 22.6 or newer so TypeScript can run without a separate compile step. This process is v${process.versions.node}.`,
  );
  process.exit(1);
}

const files = [
  "lib/points.test.ts",
  "lib/standings.test.ts",
  "lib/publish.test.ts",
  "lib/extraction.test.ts",
  "lib/swimmers.test.ts",
];

const args = [];

// Node 22.6–23.5: type stripping is experimental.
// Node 23.6+ and 24: stripping is default; passing the old flag exits with code 9.
if ((major === 22 && minor >= 6) || (major === 23 && minor < 6)) {
  args.push("--experimental-strip-types");
}

args.push("--test", ...files);

const result = spawnSync(process.execPath, args, {
  stdio: "inherit",
  env: process.env,
});

process.exit(result.status ?? 1);
