import fs from 'fs-extra'
import path from 'path'
import CleanCSS from 'clean-css'
import { minify as minifyHtml } from 'html-minifier-terser'
import { minify as minifyJs, MinifyOutput } from 'terser'

import { loadConfig } from '../utils/loadConfig.js'
import { log } from '../utils/logService.js'
import { applyReplacements, getFile } from '../utils/functions.js'

/**
 * Build the project according to configuration.
 */
export async function build(): Promise<void> {
  try {
    const config: any = await loadConfig()
    const distDir: string = path.resolve(process.cwd(), config.dist || 'dist')

    // Remove previous dist folder and recreate it
    await fs.remove(distDir)
    await fs.ensureDir(distDir)

    /**
     * Process a single folder
     * @param srcPathRel Relative path of the source folder
     * @param destName Destination folder name inside dist
     */
    async function processFolder(srcPathRel: string, destName: any): Promise<void> {
      const fullSrc: string = path.resolve(process.cwd(), srcPathRel)
      const fullDest: string = path.join(distDir, destName)

      if (!(await fs.pathExists(fullSrc))) {
        log('warn', `Folder not found: ${srcPathRel}`)
        return
      }

      const cssChunks: string[] = []
      const jsChunks: string[] = []

      // Recursive walk function to process files
      async function walk(src: string, dest: string): Promise<void> {
        await fs.ensureDir(dest)

        for (const item of await fs.readdir(src)) {
          const srcPath: string = path.join(src, item)
          const destPath: string = path.join(dest, item)
          const stat: fs.Stats = await fs.stat(srcPath)
          const ext: string = path.extname(item).toLowerCase()

          if (stat.isDirectory()) {
            await walk(srcPath, destPath)
            continue
          }

          try {
            switch (ext) {
              case '.html': {
                let content: string = await getFile(srcPath, config.replace)
                if (config.minify?.html) {
                  content = await minifyHtml(content, {
                    collapseWhitespace: true,
                    removeComments: true,
                    minifyJS: config.minify?.ts,
                    minifyCSS: config.minify?.css
                  })
                }
                await fs.outputFile(destPath, content)
                break
              }

              case '.css': {
                const content: string = await getFile(srcPath, config.replace)
                cssChunks.push(content)
                break
              }

              case '.js': {
                const content: string = await getFile(srcPath, config.replace)
                jsChunks.push(content)
                break
              }
              /*
              case '.ts': {
                const result = await esbuild.build({
                  entryPoints: [srcPath],
                  bundle: false,
                  minify: !!config.minify?.ts,
                  platform: 'browser',
                  format: 'esm',
                  write: false
                })
                let compiled = result.outputFiles[0].text
                compiled = applyReplacements(compiled, config.replace)
                if (srcPathRel === config.src) jsChunks.push(compiled)
                break
              }
              */
              default:
                await fs.copy(srcPath, destPath)
                break
            }
          } catch (error: any) {
            log('error', `Failed to process file: ${srcPath} - ${error.message}`)
          }
        }
      }

      await walk(fullSrc, fullDest)

      // Merge CSS/JS only for the root source folder
      if (srcPathRel === config.src) {
        try {
          if (config.styles?.length) {
            for (const style of config.styles) {
              const fullPath: string = path.resolve(process.cwd(), style)
              if (await fs.pathExists(fullPath)) {
                let css: string = await fs.readFile(fullPath, 'utf-8')
                css = applyReplacements(css, config.replace)
                cssChunks.push(css)
              } else {
                log('warn', `Style file not found: ${style}`)
              }
            }
          }

          if (config.scripts?.length) {
            for (const script of config.scripts) {
              const fullPath: string = path.resolve(process.cwd(), script)
              if (await fs.pathExists(fullPath)) {
                let js: string = await fs.readFile(fullPath, 'utf-8')
                js = applyReplacements(js, config.replace)
                jsChunks.push(js)
              } else {
                log('warn', `Script file not found: ${script}`)
              }
            }
          }

          // Write final CSS bundle
          if (cssChunks.length > 0) {
            let finalCss: string = cssChunks.join('')
            if (config.minify?.css) finalCss = new CleanCSS().minify(finalCss).styles
            await fs.outputFile(path.join(distDir, 'style.css'), finalCss)
          }

          // Write final JS bundle
          if (jsChunks.length > 0) {
            let finalJs: string = jsChunks.join('')
            if (config.minify?.js) {
              const minified: MinifyOutput = await minifyJs(finalJs)
              finalJs = minified.code ?? ''
            }
            if (finalJs) await fs.outputFile(path.join(distDir, 'script.js'), finalJs)
          }
        } catch (error: any) {
          log('error', `Failed to merge CSS/JS: ${error.message}`)
        }
      }

      log('success', `Processed folder: ${srcPathRel} -> /${destName}`)
    }

    // Process all folders defined in configuration
    if (config.folders && Object.keys(config.folders).length > 0) {
      for (const [srcPathRel, destName] of Object.entries(config.folders)) {
        await processFolder(srcPathRel, destName)
      }
    } else {
      log('warn', 'No folders defined in config. Nothing to build.')
    }

    log('success', `Build completed. Output saved in /${config.dist}`)
  } catch (error: any) {
    log('error', `Build failed: ${error.message}`)
  }
}
