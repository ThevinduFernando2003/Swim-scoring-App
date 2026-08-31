import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const SKIP_DIR = new Set([
  "node_modules",
  ".git",
  ".next",
  "dist",
  "coverage",
]);
const SKIP_FILE = /\.(png|jpg|jpeg|gif|webp|pdf|ico|woff2?|lock)$/i;
const PATTERNS = [
  { name: "OpenAI project key", re: /sk-proj-[A-Za-z0-9_-]{20,}/ },
  { name: "OpenAI service account key", re: /sk-svcacct-[A-Za-z0-9_-]{20,}/ },
  { name: "Anthropic key", re: /sk-ant-[A-Za-z0-9_-]{20,}/ },
  { name: "JWT / anon-or-service key", re: /eyJhbGciOi[A-Za-z0-9._-]{40,}/ },
];

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIR.has(entry)) continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      out.push(...walk(full));
    } else if (!SKIP_FILE.test(entry) && !entry.startsWith(".env")) {
      out.push(full);
    }
  }
  return out;
}

const hits = [];
for (const file of walk(ROOT)) {
  const text = readFileSync(file, "utf8");
  for (const { name, re } of PATTERNS) {
    if (re.test(text)) {
      hits.push(`${relative(ROOT, file)}: ${name}`);
    }
  }
}

if (hits.length) {
  console.error("Possible secrets committed to source:\n" + hits.map((h) => ` - ${h}`).join("\n"));
  process.exit(1);
}

console.log("Secret scan passed.");
