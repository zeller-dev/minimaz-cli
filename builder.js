#!/usr/bin/env node
import esbuild from 'esbuild'
import fs from 'fs-extra'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const outDir = path.join(__dirname, 'dist')

/* ======================
   Logging
====================== */

function formatTs(date = new Date()) {
  const pad = n => n.toString().padStart(2, '0')
  const y = date.getFullYear()
  const m = pad(date.getMonth() + 1)
  const d = pad(date.getDate())
  const h = pad(date.getHours())
  const min = pad(date.getMinutes())
  const s = pad(date.getSeconds())
  return `${y}-${m}-${d} ${h}:${min}:${s}`
}

function log(type = 'info', message) {
  const icons = { info: '🛠', success: '✅', warn: '⚠️', error: '❌' }
  const logger = console[type === 'warn' ? 'warn' : type === 'error' ? 'error' : 'log']
  logger(`[${formatTs()}] ${icons[type]} ${message}`)
}

/* ======================
   Build
====================== */

async function build() {
  log('info', 'Building...')
  const pkg = await fs.readJson(path.join(__dirname, 'package.json'))

  if (!pkg.bin?.minimaz || !pkg.bin?.mz)
    throw new Error('package.json must include bin entries: minimaz and mz')

  // Clean previous build
  log('info', 'Cleaning dist/')
  await fs.remove(outDir)
  await fs.mkdir(path.join(outDir, 'bin'), { recursive: true })

  // Determine which dependencies to keep external
  // You can add here any module you don't want bundled
  const externalDeps = [
    ...Object.keys(pkg.dependencies ?? {}),
    ...Object.keys(pkg.devDependencies ?? {}),
    'fs', 'path', 'os', 'child_process', 'fs-extra'
  ].filter(Boolean);

  // Bundle everything into one minified CLI
  log('info', 'Bundling CLI...')
  await esbuild.build({
    entryPoints: [path.join(__dirname, 'bin/cli.ts')],
    bundle: true,
    minify: true,
    platform: 'node',
    target: 'node18',
    format: 'esm',
    outfile: path.join(outDir, 'bin/cli.js'),
    external: externalDeps,
    treeShaking: true,
    sourcemap: false
  })
  log('success', 'CLI bundled and minified')

  // Copy templates if needed
  log('info', 'Copying templates...')
  const templatesSrc = path.join(__dirname, 'src', 'templates')
  const templatesDest = path.join(outDir, 'templates')

  // Create minimal package.json
  log('info', 'Creating minimal package.json...')
  const { bin, ...rest } = pkg
  const removeDist = p => p.replace(/^dist[\\/]/, "")

  delete rest.devDependencies
  delete rest.scripts

  const minimalPkg = {
    ...rest,
    bin: {
      minimaz: removeDist(bin.minimaz),
      mz: removeDist(bin.mz),
    },
    postinstall: pkg.postinstall ? removeDist(pkg.postinstall) : undefined,
    // Only include external dependencies
    dependencies: externalDeps.reduce((acc, dep) => {
      acc[dep] = pkg.dependencies[dep]
      return acc
    }, {})
  }

  await fs.writeJson(path.join(outDir, 'package.json'), minimalPkg, { spaces: 2 })
  log('success', 'Minimal package.json created')

  // Copy README and LICENSE
  log('info', 'Copying README and LICENSE...')
  if (await fs.pathExists(templatesSrc)) {
    await fs.copy(templatesSrc, templatesDest)
    log('success', 'Templates copied')
  }

  for (const file of ['README.md', 'LICENSE']) {
    const src = path.join(__dirname, file)
    const dest = path.join(outDir, file)
    if (await fs.pathExists(src)) {
      await fs.copy(src, dest)
      log('success', `${file} copied`)
    }
  }
  log('success', 'Build ready!')
}

build().catch(err => {
  log('error', `Build failed: ${err instanceof Error ? err.message : err}`)
  process.exit(1)
})
