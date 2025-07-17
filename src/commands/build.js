import fs from 'fs-extra'
import path from 'path'
import CleanCSS from 'clean-css'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { minify as minifyHtml } from 'html-minifier-terser'
import { minify as minifyJs } from 'terser'
import esbuild from 'esbuild'
import { loadConfig } from '../utils/loadConfig.js'
import { log } from '../utils/logService.js'
import { applyReplacements } from '../utils/functions.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export async function build() {
  const config = await loadConfig()
  const srcDir = path.resolve(process.cwd(), config.src)
  const distDir = path.resolve(process.cwd(), config.dist)
  const publicDir = path.resolve(process.cwd(), config.public || 'public')

  await fs.remove(distDir)
  await fs.ensureDir(distDir)

  if (await fs.pathExists(publicDir)) {
    await fs.copy(publicDir, path.join(distDir, path.basename(publicDir)))
    log('success', `Copied public/ to /${config.dist}`)
  }

  const cssMinifier = new CleanCSS()

  async function processFile(srcPath, destPath, ext, item) {
    try {
      let content
      switch (ext) {
        case '.html':
          content = await fs.readFile(srcPath, 'utf-8')
          content = applyReplacements(content, config.replace)
          if (config.minify.html) {
            const minified = await minifyHtml(content, {
              collapseWhitespace: true,
              removeComments: true,
              minifyJS: config.minify.js,
              minifyCSS: config.minify.css
            })
            await fs.outputFile(destPath, minified)
          } else {
            await fs.outputFile(destPath, content)
          }
          break

        case '.css':
          content = await fs.readFile(srcPath, 'utf-8')
          content = applyReplacements(content, config.replace)
          if (config.minify.css) {
            const output = cssMinifier.minify(content)
            await fs.outputFile(destPath, output.styles)
          } else {
            await fs.outputFile(destPath, content)
          }
          break

        case '.js':
          content = await fs.readFile(srcPath, 'utf-8')
          content = applyReplacements(content, config.replace)
          if (config.minify.js) {
            const minified = await minifyJs(content)
            await fs.outputFile(destPath, minified.code)
          } else {
            await fs.outputFile(destPath, content)
          }
          break

        case '.ts':
          const outJsPath = destPath.replace(/\.ts$/, '.js')
          const result = await esbuild.build({
            entryPoints: [srcPath],
            outfile: outJsPath,
            bundle: false,
            minify: !!config.minify.ts,
            platform: 'browser',
            format: 'esm',
            sourcemap: false,
            write: false
          })
          let compiled = applyReplacements(result.outputFiles[0].text, config.replace)
          await fs.outputFile(outJsPath, compiled)
          log('success', `Compiled TypeScript: ${item}`)
          break

        default:
          await fs.copy(srcPath, destPath)
          break
      }
    } catch (e) {
      log('error', `Failed processing ${item}: ${e.message}`)
    }
  }

  async function walk(src, dest) {
    await fs.ensureDir(dest)
    for (const item of await fs.readdir(src)) {
      const srcPath = path.join(src, item)
      const destPath = path.join(dest, item)
      const stat = await fs.stat(srcPath)

      if (stat.isDirectory()) {
        await walk(srcPath, destPath)
      } else {
        const ext = path.extname(item).toLowerCase()
        await processFile(srcPath, destPath, ext, item)
      }
    }
  }

  await walk(srcDir, distDir)
  log('success', `Build completed. Output saved in /${config.dist}`)
}