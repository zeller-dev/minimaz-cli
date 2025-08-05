import fs from 'fs-extra'
import path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import CleanCSS from 'clean-css'
import { minify as minifyHtml } from 'html-minifier-terser'
import { minify as minifyJs } from 'terser'
import esbuild from 'esbuild'

import { loadConfig } from '../utils/loadConfig.js'
import { log } from '../utils/logService.js'
import { applyReplacements } from '../utils/functions.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/**
 * Build project according to configuration.
 */
export async function build() {
  const config = await loadConfig()

  const srcDir = path.resolve(process.cwd(), config.src)
  const distDir = path.resolve(process.cwd(), config.dist)
  const publicDir = path.resolve(process.cwd(), config.public || 'public')

  // Cleanup previous dist folder
  await fs.remove(distDir)
  await fs.ensureDir(distDir)

  // Copy public/ folder if exists
  if (await fs.pathExists(publicDir)) {
    await fs.copy(publicDir, path.join(distDir, path.basename(publicDir)))
    log('success', `Copied public/ to /${config.dist}`)
  }

  // --- CSS Processing ---
  const cssMinifier = new CleanCSS()
  const cssFiles = config.styles?.length ? config.styles : ['style.css']
  const cssChunks = []

  for (const file of cssFiles) {
    const filePath = path.join(srcDir, file)
    if (await fs.pathExists(filePath)) {
      let content = await fs.readFile(filePath, 'utf-8')
      content = applyReplacements(content, config.replace)
      cssChunks.push(content)
    } else { log('warn', `CSS file not found: ${file}`) }
  }

  let finalCss = cssChunks.join('\n')
  if (config.minify?.css) finalCss = cssMinifier.minify(finalCss).styles

  await fs.outputFile(path.join(distDir, 'style.css'), finalCss)

  // --- JS Processing ---
  const jsFiles = config.scripts?.length ? config.scripts : ['script.js']
  const jsChunks = []

  for (const file of jsFiles) {
    const filePath = path.join(srcDir, file)
    if (await fs.pathExists(filePath)) {
      let content = await fs.readFile(filePath, 'utf-8')
      content = applyReplacements(content, config.replace)
      jsChunks.push(content)
    } else { log('warn', `JS file not found: ${file}`) }
  }

  let finalJs = jsChunks.join('\n')
  if (config.minify?.js) {
    const minified = await minifyJs(finalJs)
    finalJs = minified.code
  }

  await fs.outputFile(path.join(distDir, 'script.js'), finalJs)

  // --- Process each file based on extension ---
  async function processFile(srcPath, destPath, ext, item) {
    try {
      switch (ext) {
        case '.html': {
          let content = await fs.readFile(srcPath, 'utf-8')
          content = applyReplacements(content, config.replace)
          if (config.minify?.html) {
            const minified = await minifyHtml(content, {
              collapseWhitespace: true,
              removeComments: true,
              minifyJS: config.minify?.js,
              minifyCSS: config.minify?.css
            })
            await fs.outputFile(destPath, minified)

          } else { await fs.outputFile(destPath, content) }

          break
        }

        case '.ts': {
          const outPath = destPath.replace(/\.ts$/, '.js')
          const result = await esbuild.build({
            entryPoints: [srcPath],
            outfile: outPath,
            bundle: false,
            minify: !!config.minify?.ts,
            platform: 'browser',
            format: 'esm',
            sourcemap: false,
            write: false
          })

          let compiled = result.outputFiles[0].text
          compiled = applyReplacements(compiled, config.replace)
          await fs.outputFile(outPath, compiled)

          log('success', `Compiled TypeScript: ${item}`)
          break
        }

        default:
          await fs.copy(srcPath, destPath)
          break
      }
    } catch (error) { log('error', `Failed processing ${item}: ${error.message}`) }
  }

  /**
   * Recursively walk through the source directory
   * and process all files except those already handled.
   */
  async function walk(src, dest) {
    await fs.ensureDir(dest)

    for (const item of await fs.readdir(src)) {
      const srcPath = path.join(src, item)
      const destPath = path.join(dest, item)
      const stat = await fs.stat(srcPath)

      if (stat.isDirectory()) {
        await walk(srcPath, destPath)
        continue
      }

      const ext = path.extname(item).toLowerCase()

      // Skip already processed files
      if (cssFiles.includes(item) || jsFiles.includes(item)) continue

      await processFile(srcPath, destPath, ext, item)
    }
  }

  // Start recursive file processing
  await walk(srcDir, distDir)

  log('success', `Build completed. Output saved in /${config.dist}`)
}