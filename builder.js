#!/usr/bin/env node

/**
 * Minimaz Builder
 * - Compila tutti i file .ts in .js mantenendo la struttura
 * - Output ESM compatibile (Node 18+)
 * - Crea dist/ con package.json minimale per npm
 */

import esbuild from "esbuild";
import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const outDir = path.join(__dirname, "dist");

async function build() {
  console.log("🛠  Building Minimaz...");

  // 1️⃣ Pulisce la build precedente
  await fs.remove(outDir);
  await fs.ensureDir(outDir);

  // 2️⃣ Cerca automaticamente tutti i file .ts
  const entryPoints = [
    path.join(__dirname, "bin/cli.ts"),
    ...await fs.readdir(path.join(__dirname, "src/commands")).then(files =>
      files.filter(f => f.endsWith(".ts")).map(f => `src/commands/${f}`)
    ),
    ...await fs.readdir(path.join(__dirname, "src/utils")).then(files =>
      files.filter(f => f.endsWith(".ts")).map(f => `src/utils/${f}`)
    ),
  ];

  // 3️⃣ Compila tutti i file mantenendo la struttura
  await esbuild.build({
    entryPoints,
    outdir: outDir,
    platform: "node",
    target: "node18",
    format: "esm",
    bundle: false, // 🔸 mantiene i moduli separati
    sourcemap: false,
    banner: {
      js: "#!/usr/bin/env node",
    },
  });

  console.log("✅  Source compiled into dist/");

  // 4️⃣ Crea package.json minimale
  const pkg = await fs.readJson(path.join(__dirname, "package.json"));
  const minimalPkg = {
    name: pkg.name,
    version: pkg.version,
    description: pkg.description,
    type: "module",
    bin: {
      minimaz: "./bin/cli.js",
      mz: "./bin/cli.js",
    },
    keywords: pkg.keywords,
    author: pkg.author,
    license: pkg.license,
  };
  await fs.writeJson(path.join(outDir, "package.json"), minimalPkg, { spaces: 2 });

  // 5️⃣ Copia README e LICENSE
  for (const file of ["README.md", "LICENSE"]) {
    const src = path.join(__dirname, file);
    if (await fs.pathExists(src)) {
      await fs.copy(src, path.join(outDir, file));
    }
  }

  console.log("📦  dist/ ready for publish!");
}

build().catch((err) => {
  console.error("❌ Build failed:", err);
  process.exit(1);
});
