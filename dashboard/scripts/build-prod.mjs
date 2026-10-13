// Production build that can never bake localhost:
// reads .env*.local into memory, deletes them, runs `next build`,
// then writes them back (restore happens even if the build fails).
// File contents are used instead of renames so this also works when
// $TMPDIR lives on another filesystem. Usage: npm run build:prod
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const saved = new Map();
for (const f of [".env.local", ".env.development.local", ".env.production.local"]) {
  const p = path.join(root, f);
  if (existsSync(p)) {
    saved.set(f, readFileSync(p, "utf8"));
    unlinkSync(p);
  }
}

try {
  console.log(
    saved.size > 0
      ? `[build:prod] stashed local env: ${[...saved.keys()].join(", ")}`
      : "[build:prod] no local env files — clean production build"
  );
  const r = spawnSync("npx", ["next", "build"], { cwd: root, stdio: "inherit", shell: true });
  if (r.status !== 0) process.exit(r.status ?? 1);
} finally {
  for (const [f, content] of saved) writeFileSync(path.join(root, f), content);
  if (saved.size > 0) console.log("[build:prod] local env restored");
}
