import fs from 'fs-extra'
import path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { minify as minifyHtml } from 'html-minifier-terser'
import CleanCSS from 'clean-css'
import { minify as minifyJs } from 'terser'
import { loadConfig } from '../utils/loadConfig.js'
import { log } from '../utils/logService.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Recursively minifies and copies files from src to dist

export async function build() {
  const config = await loadConfig()

  const srcDir = path.resolve(process.cwd(), config.src)
  const distDir = path.resolve(process.cwd(), config.dist)
  const publicDir = path.resolve(process.cwd(), config.public || 'public')

  await fs.remove(distDir)
  await fs.ensureDir(distDir)

  // Copy public/ if exists
  if (await fs.pathExists(publicDir)) {
    const publicDest = path.join(distDir, path.basename(publicDir))
    await fs.copy(publicDir, publicDest)
    log('📁', 'success', `Copied public/ to /${config.dist}`)
  }

  const cssMinifier = new CleanCSS()

  const walkAndBuild = async (src, dest) => {
    const items = await fs.readdir(src)

    for (const item of items) {
      const srcPath = path.join(src, item)
      const destPath = path.join(dest, item)
      const stat = await fs.stat(srcPath)

      if (stat.isDirectory()) {
        await fs.ensureDir(destPath)
        await walkAndBuild(srcPath, destPath)
      } else {
        if (item.endsWith('.html') && config.minify.html) {
          let html = await fs.readFile(srcPath, 'utf-8')

          // Apply replacements from config
          for (const [from, to] of Object.entries(config.replace || {})) { html = html.split(from).join(to) }

          const minified = await minifyHtml(html, {
            collapseWhitespace: true,
            removeComments: true,
            minifyJS: config.minify.js,
            minifyCSS: config.minify.css
          })

          await fs.outputFile(destPath, minified)
        } else if (item.endsWith('.css') && config.minify.css) {
          const css = await fs.readFile(srcPath, 'utf-8')
          const output = cssMinifier.minify(css)
          await fs.outputFile(destPath, output.styles)

        } else if (item.endsWith('.js') && config.minify.js) {
          const js = await fs.readFile(srcPath, 'utf-8')
          const minified = await minifyJs(js)
          await fs.outputFile(destPath, minified.code)

        } else { await fs.copy(srcPath, destPath) }
      }
    }
  }

  await walkAndBuild(srcDir, distDir)
  log('', 'success', `✅ Build completed and output saved in /${config.dist}`)
}
