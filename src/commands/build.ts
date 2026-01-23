import fs, { remove } from 'fs-extra'
import path from 'path'
import CleanCSS from 'clean-css'
import { minify as minifyHtml } from 'html-minifier-terser'
import { minify as minifyJs } from 'terser'

import {
  loadConfig,
  log,
  applyReplacements,
  getFile,
  MinimazConfig
} from '../index.js'

/**
 * Builds the project according to the Minimaz configuration.
 *
 * - Cleans and prepares the dist directory
 * - Processes configured source folders
 * - Merges and minifies CSS/JS assets when required
 */
export async function build(): Promise<void> {
  const config: MinimazConfig = await loadConfig()
  const distDir: string = path.resolve(process.cwd(), config.dist || 'dist')

  await remove(distDir)
  await fs.ensureDir(distDir)

  if (!config.folders || Object.keys(config.folders).length === 0) {
    log('warn', 'No folders defined in config. Nothing to build.')
    return
  }

  for (const [srcPathRel, destName] of Object.entries(config.folders)) {
    log('info', `Building folder: ${srcPathRel} -> /${destName}`)
    await processFolder(srcPathRel, destName, config, distDir)
  }

  log('success', `Build completed. Output saved in /${config.dist}`)
}

/**
 * Processes a single source folder.
 *
 * - Walks the directory recursively
 * - Collects CSS and JS chunks
 * - Merges root assets if required
 *
 * @param srcPathRel - Source folder relative path
 * @param destName - Destination folder name inside dist
 * @param config - Minimaz configuration
 * @param distDir - Absolute dist directory path
 */
async function processFolder(
  srcPathRel: string,
  destName: string,
  config: MinimazConfig,
  distDir: string
): Promise<void> {
  const fullSrc: string = path.resolve(process.cwd(), srcPathRel)
  const fullDest: string = path.join(distDir, destName)

  if (!(await fs.pathExists(fullSrc))) {
    log('warn', `Folder not found: ${srcPathRel}`)
    return
  }

  const cssChunks: string[] = []
  const jsChunks: string[] = []

  await walkFolder(fullSrc, fullDest, config, cssChunks, jsChunks)

  // Merge CSS/JS bundles only for the root source folder
  if (srcPathRel === config.src) await mergeRootAssets(cssChunks, jsChunks, config, distDir)

  log('success', `Processed folder: ${srcPathRel} -> /${destName}`)
}

/**
 * Recursively walks a directory and processes its files.
 *
 * @param src - Source directory path
 * @param dest - Destination directory path
 * @param config - Minimaz configuration
 * @param cssChunks - Accumulator for CSS content
 * @param jsChunks - Accumulator for JS content
 */
async function walkFolder(
  src: string,
  dest: string,
  config: MinimazConfig,
  cssChunks: string[],
  jsChunks: string[]
): Promise<void> {
  await fs.ensureDir(dest)

  for (const item of await fs.readdir(src)) {
    const srcPath: string = path.join(src, item)
    const destPath: string = path.join(dest, item)
    const stat: fs.Stats = await fs.stat(srcPath)

    if (stat.isDirectory()) {
      await walkFolder(srcPath, destPath, config, cssChunks, jsChunks)
      continue
    }
    await processFile(srcPath, destPath, config, cssChunks, jsChunks)
  }
}

/**
 * Processes a single file based on its extension.
 *
 * @param srcPath - Source file path
 * @param destPath - Destination file path
 * @param config - Minimaz configuration
 * @param cssChunks - Accumulator for CSS content
 * @param jsChunks - Accumulator for JS content
 */
async function processFile(
  srcPath: string,
  destPath: string,
  config: MinimazConfig,
  cssChunks: string[],
  jsChunks: string[]
): Promise<void> {
  log('info', `Processing file: ${srcPath}`)
  const ext: string = path.extname(srcPath).toLowerCase()
  switch (ext) {
    case '.html':
      await processHtml(srcPath, destPath, config)
      break
    case '.css':
      cssChunks.push(await getFile(srcPath, config.replace))
      break
    case '.js':
      jsChunks.push(await getFile(srcPath, config.replace))
      break
    default:
      await fs.copy(srcPath, destPath)
  }
}

/**
 * Processes and optionally minifies an HTML file.
 *
 * @param src - Source HTML file path
 * @param dest - Destination file path
 * @param config - Minimaz configuration
 */
async function processHtml(
  src: string,
  dest: string,
  config: MinimazConfig
): Promise<void> {
  let content: string = await getFile(src, config.replace)

  if (config.minify?.html) {
    content = await minifyHtml(content, {
      collapseWhitespace: true,
      removeComments: true,
      minifyJS: config.minify.js,
      minifyCSS: config.minify.css
    })
  }
  await fs.outputFile(dest, content)
}

/**
 * Merges and writes root-level CSS and JS bundles.
 *
 * @param cssChunks - Collected CSS content
 * @param jsChunks - Collected JS content
 * @param config - Minimaz configuration
 * @param distDir - Absolute dist directory path
 */
async function mergeRootAssets(
  cssChunks: string[],
  jsChunks: string[],
  config: MinimazConfig,
  distDir: string
): Promise<void> {
  await appendExternalAssets(config.styles, cssChunks, config)
  await appendExternalAssets(config.scripts, jsChunks, config)
  await writeCssBundle(cssChunks, config, distDir)
  await writeJsBundle(jsChunks, config, distDir)
}

/**
 * Appends external CSS or JS files to the given chunk accumulator.
 *
 * @param files - List of file paths
 * @param target - Target accumulator
 * @param config - Minimaz configuration
 */
async function appendExternalAssets(
  files: string[] | undefined,
  target: string[],
  config: MinimazConfig
): Promise<void> {
  if (!files?.length) return

  for (const file of files) {
    const fullPath: string = path.resolve(process.cwd(), file)

    if (!(await fs.pathExists(fullPath))) {
      log('warn', `File not found: ${file}`)
      continue
    }

    let content: string = await fs.readFile(fullPath, 'utf-8')
    content = applyReplacements(content, config.replace)
    target.push(content)
  }
}

/**
 * Writes the final CSS bundle to disk.
 *
 * @param chunks - CSS chunks
 * @param config - Minimaz configuration
 * @param distDir - Absolute dist directory path
 */
async function writeCssBundle(
  chunks: string[],
  config: MinimazConfig,
  distDir: string
): Promise<void> {
  if (!chunks.length) return
  let css: string = chunks.join('')
  if (config.minify?.css) css = new CleanCSS().minify(css).styles
  await fs.outputFile(path.join(distDir, 'style.css'), css)
}

/**
 * Writes the final JS bundle to disk.
 *
 * @param chunks - JS chunks
 * @param config - Minimaz configuration
 * @param distDir - Absolute dist directory path
 */
async function writeJsBundle(
  chunks: string[],
  config: MinimazConfig,
  distDir: string
): Promise<void> {
  if (!chunks.length) return
  let js: string = chunks.join('')
  js = config.minify?.js ? (await minifyJs(js)).code ?? '' : js;
  if (js) await fs.outputFile(path.join(distDir, 'script.js'), js)
}
