import fs from 'fs-extra'
import path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { minify as minifyHtml } from 'html-minifier-terser'
import { minify as minifyJs } from 'terser'
import CleanCSS from 'clean-css'
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

  const srcDir = path.resolve(process.cwd(), config.src || 'src')
  const distDir = path.resolve(process.cwd(), config.dist || 'dist')
  const publicDir = path.resolve(process.cwd(), config.public || 'public')

  // Cleanup previous dist folder
  await fs.remove(distDir)
  await fs.ensureDir(distDir)

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

  // --- Walk and process files ---
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
    } catch (error) {
      log('error', `Failed processing ${item}: ${error.message}`)
    }
  }

  // Recursively walk srcDir and copy everything (except css/js already handled)
  async function walk(src, dest) {
    await fs.ensureDir(dest)

    for (const item of await fs.readdir(src)) {
      const srcPath = path.join(src, item)
      const destPath = path.join(dest, item)
      const stat = await fs.stat(srcPath)
      const ext = path.extname(item).toLowerCase()

      if (stat.isDirectory()) {
        await walk(srcPath, destPath)

      } else {
        console.log(item)
        if (ext === '.css' || ext === '.js') continue // skip already merged
        await processFile(srcPath, destPath, ext, item)
      }
    }
  }

  // --- Run build logic ---
  // Case 1: user defined folders
  if (config.folders && Object.keys(config.folders).length > 0) {
    for (const [srcPathRel, destName] of Object.entries(config.folders)) {
      const fullSrc = path.resolve(process.cwd(), srcPathRel)
      const fullDest = path.join(distDir, destName)

      if (await fs.pathExists(fullSrc)) {
        await walk(fullSrc, fullDest)
        log('success', `Copied folder: ${srcPathRel} -> /${destName}`)
      } else {
        log('warn', `Folder not found: ${srcPathRel}`)
      }
    }
  } else {
    // Case 2: default copy from srcDir
    await walk(srcDir, distDir)
  }

  log('success', `Build completed. Output saved in /${config.dist}`)
}