#!/usr/bin/env node
import esbuild from "esbuild"
import fs from "fs-extra"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const outDir = path.join(__dirname, "dist")

/* ======================
   Logging
====================== */

const icons = {
  info: "🛠",
  success: "✅",
  warn: "⚠️",
  error: "❌",
}

const loggers = {
  info: console.log,
  success: console.log,
  warn: console.warn,
  error: console.error,
}

function log(type, message) {
  const logger = loggers[type] || console.log
  const icon = icons[type] || ""
  logger(`${icon} ${message}`)
}

/* ======================
   Helpers
====================== */

// Find all .ts files in a folder
async function getTSFiles(dir, acc = []) {
  if (!(await fs.pathExists(dir))) return acc

  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    if (entry.name === "templates") continue // Ignore templates

    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      log("info", `Found Directory: ${entry.name}`)
      await getTSFiles(full, acc)
    }
    else if (entry.name.endsWith(".ts")) {
      acc.push(full)
      log("info", `Found file: ${entry.name}`)
    } else {
      log("error", `Unknown: ${entry.name}`)
    }
  }
  return acc
}

// Remove ./dist from a path for production
const removeDist = str => str.replace(/^dist\//, "./")

/* ======================
   Build
====================== */

async function build() {

  log("info", "Building...")

  // Clean previous build
  log("info", "Cleaning dist/")
  await fs.remove(outDir)
  await fs.mkdir(outDir, { recursive: true })

  // Compile source
  log("info", "Compiling source...")
  const entryPoints = [
    path.join(__dirname, "bin/cli.ts"),
    ...(await getTSFiles(path.join(__dirname, "src"))),
  ]

  await esbuild.build({
    entryPoints,
    outdir: outDir,
    platform: "node",
    target: "node18",
    format: "esm",
    bundle: false,
    minify: true,
    treeShaking: true,
    legalComments: "none",
    logLevel: "silent"
  })
  log("success", "Source compiled into dist/")

  // Copy templates
  log("info", "Copying templates...")
  const templatesSrc = path.join(__dirname, "src", "templates")
  const templatesDest = path.join(outDir, "src", "templates")

  if (await fs.pathExists(templatesSrc)) {
    await fs.copy(templatesSrc, templatesDest)
    log("success", "src/templates copied into dist/")
  } else {
    log("warn", "src/templates not found.")
  }

  // Create minimal package.json
  log("info", "Creating minimal package.json...")
  const pkg = await fs.readJson(path.join(__dirname, "package.json"))
  const { bin, ...rest } = pkg

  const minimalPkg = {
    ...rest,
    devDependencies: undefined,
    scripts: undefined,
    bin: {
      minimaz: removeDist(bin.minimaz),
      mz: removeDist(bin.mz),
    },
    postinstall: removeDist(pkg.postinstall),
  }

  await fs.writeJson(
    path.join(outDir, "package.json"),
    minimalPkg,
    { spaces: 2 }
  )

  log("success", "Minimal package.json created")

  // 5️⃣ Copy README and LICENSE
  log("info", "Copying README and LICENSE...")
  await Promise.all(
    ["README.md", "LICENSE"].map(async file => {
      const src = path.join(__dirname, file)
      if (await fs.pathExists(src)) {
        await fs.copy(src, path.join(outDir, file))
        log("success", `Copied ${file}`)
      }
    })
  )
  log("success", "Build ready!")
}

build().catch(err => {
  log("error", `Build failed: ${err instanceof Error ? err.message : err}`)
  process.exit(1)
})