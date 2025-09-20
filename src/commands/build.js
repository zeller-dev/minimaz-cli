import fs from 'fs-extra'
import path from 'path'
import CleanCSS from 'clean-css'
import esbuild from 'esbuild'

import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { minify as minifyHtml } from 'html-minifier-terser'
import { minify as minifyJs } from 'terser'

import { loadConfig } from '../utils/loadConfig.js'
import { log } from '../utils/logService.js'
import { applyReplacements } from '../utils/functions.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/**
 * Build project according to configuration.
 * Each folder in config.folders is processed independently.
 */
export async function build() {
  const config = await loadConfig()
  const distDir = path.resolve(process.cwd(), config.dist || 'dist')
  const srcDir = path.resolve(process.cwd(), config.src || 'src')

  // Clean previous dist folder
  await fs.remove(distDir)
  await fs.ensureDir(distDir)

  /**
   * Process a single folder block
   * @param {string} srcPathRel - relative source folder path
   * @param {string} destName - destination folder name inside dist
   */
  async function processFolder(srcPathRel, destName) {
    const fullSrc = path.resolve(process.cwd(), srcPathRel)
    const fullDest = path.join(distDir, destName)

    if (!(await fs.pathExists(fullSrc))) {
      log('warn', `Folder not found: ${srcPathRel}`)
      return
    }

    const cssChunks = []
    const jsChunks = []

    // Recursively process all files inside the folder
    async function walk(src, dest) {
      await fs.ensureDir(dest)

      for (const item of await fs.readdir(src)) {
        const srcPath = path.join(src, item)
        const destPath = path.join(dest, item)
        const stat = await fs.stat(srcPath)
        const ext = path.extname(item).toLowerCase()

        if (stat.isDirectory()) await walk(srcPath, destPath)

        else {
          switch (ext) {
            case '.html': {
              let content = await fs.readFile(srcPath, 'utf-8')
              content = applyReplacements(content, config.replace)

              if (config.minify?.html) {
                content = await minifyHtml(content, {
                  collapseWhitespace: true,
                  removeComments: true,
                  minifyJS: config.minify?.js,
                  minifyCSS: config.minify?.css
                })
              }
              await fs.outputFile(destPath, content)
              break
            }

            case '.css': {
              let css = await fs.readFile(srcPath, 'utf-8')
              css = applyReplacements(css, config.replace)
              cssChunks.push(css)
              break
            }

            case '.js': {
              let js = await fs.readFile(srcPath, 'utf-8')
              js = applyReplacements(js, config.replace)
              jsChunks.push(js)
              break
            }

            case '.ts': {
              const result = await esbuild.build({
                entryPoints: [srcPath],
                bundle: false,
                minify: !!config.minify?.ts, // esbuild minifica se true
                platform: 'browser',
                format: 'esm',
                write: false
              })

              let compiled = result.outputFiles[0].text
              compiled = applyReplacements(compiled, config.replace)

              // Se hai minificato con esbuild, non passare a terser
              jsChunks.push(compiled)
              break
            }

            default:
              // Copy other files directly
              await fs.copy(srcPath, destPath)
              break
          }
        }
      }
    }

    // Walk through the folder
    await walk(fullSrc, fullDest)

    // Merge CSS/JS globali dal config, sempre
    if (config.styles && config.styles.length > 0) {
      for (const style of config.styles) {
        const fullPath = path.resolve(process.cwd(), style)
        if (await fs.pathExists(fullPath)) {
          let css = await fs.readFile(fullPath, 'utf-8')
          css = applyReplacements(css, config.replace)
          cssChunks.push(css)
        } else {
          log('warn', `Style file not found: ${style}`)
        }
      }
    }

    if (config.scripts && config.scripts.length > 0) {
      for (const script of config.scripts) {
        const fullPath = path.resolve(process.cwd(), script)
        if (await fs.pathExists(fullPath)) {
          let js = await fs.readFile(fullPath, 'utf-8')
          js = applyReplacements(js, config.replace)
          jsChunks.push(js)
        } else {
          log('warn', `Script file not found: ${script}`)
        }
      }
    }


    // Merge and write CSS
    if (cssChunks.length > 0) {
      let finalCss = cssChunks.join('\n')
      if (config.minify?.css) finalCss = new CleanCSS().minify(finalCss).styles
      await fs.outputFile(path.join(fullDest, 'style.css'), finalCss)
    }

    // Merge and write JS
    if (jsChunks.length > 0) {
      let finalJs = jsChunks.join('\n')
      if (config.minify?.js) {
        const minified = await minifyJs(finalJs)
        finalJs = minified.code
      }
      await fs.outputFile(path.join(fullDest, 'script.js'), finalJs)
    }
    log('success', `Processed folder: ${srcPathRel} -> /${destName}`)
  }

  // Run build logic for each folder
  if (config.folders && Object.keys(config.folders).length > 0) {
    for (const [srcPathRel, destName] of Object.entries(config.folders)) {
      await processFolder(srcPathRel, destName)
    }
  } else { log('warn', 'No folders defined in config. Nothing to build.') }
  log('success', `Build completed. Output saved in /${config.dist}`)
}