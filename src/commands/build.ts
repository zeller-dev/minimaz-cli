import fs from 'fs-extra'
import path from 'path'
import CleanCSS from 'clean-css'
import { minify as minifyHtml } from 'html-minifier-terser'
import { minify as minifyJs } from 'terser'

import {
  loadConfig, log, applyReplacements, getFile, removeDistDir, resolveCurrentPath, // utils
  MinimazConfig, Bundles                                                          // types
} from '../index.js'

/**
 * Builds the project according to the Minimaz configuration.
 *
 * - Cleans and prepares the dist directory
 * - Processes configured source folders
 * - Merges and minifies CSS/JS assets when required
 */
export async function build(): Promise<void> {
  const config: MinimazConfig = await loadConfig() // Load project config
  const currentDirPath: string = resolveCurrentPath()
  const distDirPath: string = path.resolve(currentDirPath, config.dist)

  await removeDistDir(distDirPath)      // Clean dist directory
  await fs.ensureDir(distDirPath)       // Recreate dist directory

  if (!config.folders || Object.keys(config.folders).length === 0) {
    log('warn', 'No folders defined in config. Nothing to build.')
    return
  }

  for (const [from, to] of Object.entries(config.folders)) {
    log('debug', `Building folder: ${from} -> /${to}`)
    await processFolder(from, to, config, distDirPath)
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
  srcName: string,
  destName: string,
  config: MinimazConfig,
  distDir: string
): Promise<void> {
  const fullSrc: string = resolveCurrentPath([srcName])
  const fullDest: string = path.join(distDir, destName)

  if (!(await fs.pathExists(fullSrc))) {
    log('warn', `Folder not found: ${srcName}`)
    return
  }

  const bundles: Bundles = { css: [], js: [] }

  await walkFolder(fullSrc, fullDest, config, bundles)

  // Merge CSS/JS bundles only for the root source folder
  if (srcName === config.src) await mergeRootAssets(bundles, config, distDir)

  log('success', `Processed folder: ${srcName} -> /${destName}`)
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
  bundles: Bundles
): Promise<void> {
  await fs.ensureDir(dest)

  for (const item of await fs.readdir(src)) {
    const srcPath: string = path.join(src, item)
    const destPath: string = path.join(dest, item)
    const stat: fs.Stats = await fs.stat(srcPath)

    log('debug', `Found ${stat.isDirectory() ? 'DIRECTORY' : 'FILE'}: ${item}`)

    if (stat.isDirectory()) {
      await walkFolder(srcPath, destPath, config, bundles)
      continue
    }
    await processFile(srcPath, destPath, config, bundles)
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
  bundles: Bundles
): Promise<void> {
  log('debug', `Processing file: ${srcPath}`)

  const ext: string = path.extname(srcPath).toLowerCase()

  switch (ext) {
    case '.html':
      await processHtml(srcPath, destPath, config)
      break

    case '.css': {
      await processCSS(srcPath, destPath, config, bundles.css)
      break
    }

    case '.js': {
      await processJS(srcPath, destPath, config, bundles.js)
      break
    }

    default:
      await fs.copy(srcPath, destPath)
  }
}

/**
 * Processes an HTML file:
 * - Minifies inline JavaScript (standard, module, nomodule)
 * - Minifies inline JSON scripts
 * - Leaves external scripts and other types intact
 * - Minifies CSS inline and the final HTML if configured
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
  const scriptRegex = /<script([^>]*)>([\s\S]*?)<\/script>/gi

  let lastIndex = 0
  let result = ''
  let match: RegExpExecArray | null

  while ((match = scriptRegex.exec(content)) !== null) {
    const [fullMatch, attrs, code] = match

    result += content.slice(lastIndex, match.index)
    lastIndex = match.index + fullMatch.length

    if (/src=/i.test(attrs)) {
      result += fullMatch
      continue
    }

    const typeAttr = (attrs.match(/type=["']([^"']+)["']/i)?.[1] || '').toLowerCase()
    const isModule = /module/i.test(typeAttr)
    const isNoModule = /nomodule/i.test(attrs)

    if (typeAttr === 'application/json') {
      try {
        // Minify JSON: parse and stringify compact
        const minJson = JSON.stringify(JSON.parse(code))
        result += `<script${attrs}>${minJson}</script>`
      } catch (err) {
        log('warn', `Invalid JSON in ${src}: ${err}`)
        result += fullMatch
      }
    } else if (typeAttr === '' || typeAttr === 'text/javascript' || isModule || isNoModule) {
      try {
        // Minify inline JS safely
        const minJs = await minifyJs(code, { format: { semicolons: true }, module: isModule })
        result += `<script${attrs}>${minJs.code || ''}</script>`
      } catch (err) {
        log('warn', `JS minify error in ${src}: ${err}`)
        result += fullMatch
      }
    } else {
      result += fullMatch
    }
  }

  // Append remaining HTML
  result += content.slice(lastIndex)

  // Minify final HTML + inline CSS if configured
  if (config.minify?.html) {
    result = await minifyHtml(result, {
      collapseWhitespace: true,
      removeComments: true,
      minifyCSS: config.minify.css,
      minifyJS: false, // already minified above
    })
  }

  await fs.outputFile(dest, result)
}

/**
 * Processes a CSS file
 *
 * @param src
 * @param dest
 * @param config
 * @param bundle
 */
async function processCSS(src: string, dest: string, config: MinimazConfig, bundle: string[]): Promise<void> {
  const css: string = await getFile(src, config.replace)

  if (config.bundling?.css) {
    bundle.push(css)
  } else {
    let out = css
    if (config.minify?.css) {
      const min = new CleanCSS().minify(css)
      if (min.warnings.length) min.warnings.forEach(w => log('warn', w))
      out = min.styles
    }
    await fs.outputFile(dest, out)
  }
}
/**
 * Processes a JavaScript file:
 *
 * @param src
 * @param dest
 * @param config
 * @param bundle
 */
async function processJS(src: string, dest: string, config: MinimazConfig, bundle: string[]): Promise<void> {
  const js: string = await getFile(src, config.replace)

  if (config.bundling?.js) {
    bundle.push(js)
  } else {
    let out = js
    if (config.minify?.js) out = (await minifyJs(js)).code ?? ''
    await fs.outputFile(dest, out)
  }
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
  bundles: Bundles,
  config: MinimazConfig,
  distDir: string
): Promise<void> {
  // CSS
  await appendExternalAssets(config.styles, bundles.css, config, 'css', !!config.bundling?.css, distDir)
  // JS
  await appendExternalAssets(config.scripts, bundles.js, config, 'js', !!config.bundling?.js, distDir)

  if (config.bundling?.css) await writeCssBundle(bundles.css, config, distDir)
  if (config.bundling?.js) await writeJsBundle(bundles.js, config, distDir)
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
  config: MinimazConfig,
  type: 'css' | 'js',
  toBundle: boolean,
  distDir: string
): Promise<void> {
  if (!files?.length) return

  for (const file of files) {
    const fullPath = resolveCurrentPath([file])
    if (!(await fs.pathExists(fullPath))) {
      log('warn', `File not found: ${file} `)
      continue
    }

    let content = await fs.readFile(fullPath, 'utf-8')
    content = applyReplacements(content, config.replace)

    if (toBundle) {
      target.push(content)
    } else {
      if (type === 'css' && config.minify?.css) {
        const output = new CleanCSS().minify(content)
        if (output.warnings.length) output.warnings.forEach(w => log('warn', w))
        content = output.styles
      } else if (type === 'js' && config.minify?.js) {
        try {
          content = (await minifyJs(content)).code ?? ''
        } catch (err) {
          log('warn', `JS minify failed for external file ${file}: ${err} `)
        }
      }

      const fileName = path.basename(file)
      await fs.outputFile(path.join(distDir, fileName), content)
      log('info', `Copied external ${type} file: ${fileName} `)
    }
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
  if (config.minify?.css) {
    const output = new CleanCSS().minify(css)
    if (output.warnings.length)
      output.warnings.forEach(w => log('warn', w))
    css = output.styles
  }
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
  if (config.minify?.js)
    try {
      js = (await minifyJs(js)).code ?? ''
    } catch (err) {
      log('warn', `JS minify failed: ${err} `)
    }
  if (js) await fs.outputFile(path.join(distDir, 'script.js'), js)
}