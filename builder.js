#!/usr/bin/env node
import esbuild from "esbuild"
import fs from "fs-extra"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const outDir = path.join(__dirname, "dist")

// ----- Helper: find all .ts files in a folder -----
async function getTSFiles(dir) {
  return (await fs.readdir(dir))
    .filter(f => f.endsWith(".ts"))
    .map(f => path.join(dir, f))
}

// ----- Remove ./dist from a path for production -----
function removeDist(string) {
  return string.replace(/^\.\/dist\//, "./")
}

async function build() {
  const isProd = process.env.NODE_ENV === "production"
  console.log(`🛠  Building Minimaz (${isProd ? "production" : "development"})...`)

  // 1️⃣ Clean previous build
  await fs.remove(outDir)
  await fs.ensureDir(outDir)

  // 2️⃣ Compile TypeScript
  const entryPoints = [
    path.join(__dirname, "bin/cli.ts"),
    ...(await getTSFiles(path.join(__dirname, "src/commands"))),
    ...(await getTSFiles(path.join(__dirname, "src/utils"))),
  ]

  await esbuild.build({
    entryPoints,
    outdir: outDir,
    platform: "node",
    target: "node18",
    format: "esm",
    bundle: false,
    minify: true,
  })

  console.log("✅  Source compiled into dist/")

  // 3️⃣ Copy templates
  const templatesSrc = path.join(__dirname, "src", "templates")
  const templatesDest = path.join(outDir, "src", "templates")
  if (await fs.pathExists(templatesSrc)) {
    await fs.copy(templatesSrc, templatesDest)
    console.log("✅  src/templates copied into dist/")
  }

  // 4️⃣ Create minimal package.json
  const pkg = await fs.readJson(path.join(__dirname, "package.json"))
  const { bin, ...rest } = pkg

  const minimalPkg = {
    ...rest,
    devDependencies: undefined,
    scripts: undefined,
    bin: {
      minimaz: removeDist(bin.minimaz),
      mz: removeDist(bin.mz)
    },
    postinstall: removeDist(pkg.postinstall)
  }

  await fs.writeJson(path.join(outDir, "package.json"), minimalPkg, { spaces: 2 })

  // 5️⃣ Copy README and LICENSE
  for (const file of ["README.md", "LICENSE"]) {
    const src = path.join(__dirname, file)
    if (await fs.pathExists(src)) {
      await fs.copy(src, path.join(outDir, file))
    }
  }

  console.log("📦  Build ready!")
}

build().catch(err => {
  console.error("❌ Build failed:", err)
  process.exit(1)
})